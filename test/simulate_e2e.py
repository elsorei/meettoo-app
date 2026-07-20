#!/usr/bin/env python3
"""
Simulazione esaustiva end-to-end di MeetToo: 50 utenti concorrenti che
usano la vera API (stesso codice server dell'app). Copre registrazione,
creazione eventi (tutti i tipi/visibilità), inviti a utenti e a email senza
account, RSVP sì/no/in-attesa, inviti a cascata, eventi ad accesso libero,
e test negativi (accessi non autorizzati, inviti duplicati/senza permesso).
Alla fine verifica gli invarianti e stampa un report PASS/FAIL.
"""
import concurrent.futures as cf
import random
import subprocess
import sys
import requests

API = "http://127.0.0.1:3000"
random.seed(42)  # deterministico
N_USERS = 50

def db(q):
    r = subprocess.run(
        ["psql", "postgresql://meettoo:meettoo@localhost:5432/meettoo", "-t", "-A", "-c", q],
        capture_output=True, text=True)
    return r.stdout.strip()

class Result:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.fails = []
    def check(self, name, cond, detail=""):
        if cond:
            self.passed += 1
        else:
            self.failed += 1
            self.fails.append(f"{name} — {detail}")
R = Result()

def post(path, token=None, **body):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.post(f"{API}{path}", json=body or None, headers=h, timeout=30)

def put(path, token=None, **body):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.put(f"{API}{path}", json=body or None, headers=h, timeout=30)

def get(path, token=None):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.get(f"{API}{path}", headers=h, timeout=30)

def delete(path, token=None, **body):
    h = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.delete(f"{API}{path}", json=body or None, headers=h, timeout=30)

# ─────────────────────────────────────────────────────────────────────
# FASE 1 — Registrazione di 50 utenti (concorrente)
# ─────────────────────────────────────────────────────────────────────
print("FASE 1 — Registrazione 50 utenti (concorrente)...")
users = {}  # idx -> dict(id, token, refresh, email, name)

def register(i):
    email = f"user{i:02d}@meettoo.test"
    r = post("/api/auth/register", email=email, password="password123", name=f"User {i:02d}")
    if r.status_code == 201:
        d = r.json()["data"]
        return i, {"id": d["user"]["id"], "token": d["accessToken"],
                   "refresh": d["refreshToken"], "email": email, "name": f"User {i:02d}"}
    return i, {"error": r.status_code, "body": r.text[:120]}

with cf.ThreadPoolExecutor(max_workers=16) as ex:
    for i, u in ex.map(register, range(N_USERS)):
        users[i] = u

ok_users = {i: u for i, u in users.items() if "token" in u}
R.check("registrazione 50/50", len(ok_users) == N_USERS,
        f"registrati {len(ok_users)}/{N_USERS}; errori: {[u for u in users.values() if 'error' in u][:3]}")
print(f"  registrati: {len(ok_users)}/{N_USERS}")

# Utenti 0..9 = "host" di feste pubbliche: invecchio l'account per superare
# il gate anti-abuso sul feed pubblico (>1h).
HOSTS_PUBLIC = list(range(10))
ids_public = ",".join(f"'{ok_users[i]['id']}'" for i in HOSTS_PUBLIC if i in ok_users)
db(f"UPDATE users SET created_at = NOW() - interval '2 hours' WHERE id IN ({ids_public})")

# ─────────────────────────────────────────────────────────────────────
# FASE 2 — Verifica email (campione deterministico)
# ─────────────────────────────────────────────────────────────────────
print("FASE 2 — Verifica email (campione di 5 utenti)...")
LOG = "/tmp/claude-0/-home-user/360f29e7-0170-5d12-9984-b902d2225e13/tasks/bepgzgkcq.output"
verified = 0
for i in range(5):
    if i not in ok_users:
        continue
    # ri-richiedo la verifica: il token più recente nel log è il suo
    rr = post("/api/auth/verify-email/request", token=ok_users[i]["token"])
    if rr.status_code != 200:
        continue
    logtxt = open(LOG, encoding="utf-8", errors="ignore").read()
    import re
    toks = re.findall(r"verify-email/confirm\?token=([a-f0-9]+)", logtxt)
    if toks:
        cr = get(f"/api/auth/verify-email/confirm?token={toks[-1]}")
        me = get("/api/auth/me", token=ok_users[i]["token"]).json()["data"]
        if me.get("emailVerified"):
            verified += 1
R.check("verifica email campione", verified >= 4, f"verificati {verified}/5")
print(f"  email verificate: {verified}/5")

# ─────────────────────────────────────────────────────────────────────
# FASE 3 — Creazione eventi (host concorrenti, tutti i tipi/visibilità)
# ─────────────────────────────────────────────────────────────────────
print("FASE 3 — Creazione eventi (tipi e visibilità vari)...")
HOSTS = list(range(15))  # primi 15 utenti sono organizzatori
events = []  # dict(id, owner, type, visibility)
TYPES = ["appointment", "gathering", "commitment", "reminder"]

def create_events_for(i):
    if i not in ok_users:
        return []
    out = []
    for _ in range(random.randint(1, 3)):
        etype = random.choice(TYPES)
        if i in HOSTS_PUBLIC and random.random() < 0.5:
            vis = random.choice(["public_view", "public_open"])
        else:
            vis = random.choice(["private", "invitees", "friends"])
        body = {"type": etype, "title": f"Evento {etype} di {ok_users[i]['name']}",
                "eventDate": f"2026-09-{random.randint(1,28):02d}", "visibility": vis}
        if etype != "reminder":
            body["startTime"] = "19:00"; body["endTime"] = "22:00"
        if random.random() < 0.4:
            body["locationName"] = random.choice(["Milano", "Roma", "Spiaggia", "Da me"])
        r = post("/api/events", token=ok_users[i]["token"], **body)
        if r.status_code == 201:
            out.append({"id": r.json()["data"]["id"], "owner": i, "type": etype, "visibility": vis})
    return out

with cf.ThreadPoolExecutor(max_workers=16) as ex:
    for res in ex.map(create_events_for, HOSTS):
        events.extend(res)

R.check("creazione eventi", len(events) >= 15, f"creati {len(events)} eventi")
by_vis = {}
by_type = {}
for e in events:
    by_vis[e["visibility"]] = by_vis.get(e["visibility"], 0) + 1
    by_type[e["type"]] = by_type.get(e["type"], 0) + 1
print(f"  eventi creati: {len(events)}  | per tipo: {by_type}  | per visibilità: {by_vis}")

# ─────────────────────────────────────────────────────────────────────
# FASE 4 — Inviti (a utenti registrati + a email senza account)
# ─────────────────────────────────────────────────────────────────────
print("FASE 4 — Inviti (utenti registrati + email esterne)...")
invites = []  # dict(event, inviter, invitee_idx or None, email)

def invite_for(e):
    out = []
    owner = e["owner"]
    others = [j for j in ok_users if j != owner]
    guests = random.sample(others, random.randint(3, 8))
    for j in guests:
        r = post(f"/api/events/{e['id']}/guests", token=ok_users[owner]["token"],
                 email=ok_users[j]["email"])
        if r.status_code == 201:
            out.append({"event": e["id"], "inviter": owner, "invitee": j})
    # una email esterna (senza account) ~40% degli eventi
    if random.random() < 0.4:
        ext = f"esterno{random.randint(1000,9999)}@nomail.test"
        r = post(f"/api/events/{e['id']}/guests", token=ok_users[owner]["token"], email=ext)
        if r.status_code == 201:
            out.append({"event": e["id"], "inviter": owner, "invitee": None, "email": ext})
    return out

with cf.ThreadPoolExecutor(max_workers=16) as ex:
    for res in ex.map(invite_for, events):
        invites.extend(res)

reg_invites = [iv for iv in invites if iv["invitee"] is not None]
ext_invites = [iv for iv in invites if iv["invitee"] is None]
R.check("inviti creati", len(reg_invites) >= 30, f"{len(reg_invites)} a utenti, {len(ext_invites)} esterni")
print(f"  inviti: {len(reg_invites)} a utenti registrati, {len(ext_invites)} a email esterne")

# ─────────────────────────────────────────────────────────────────────
# FASE 5 — RSVP (55% sì, 30% no, 15% nessuna risposta)
# ─────────────────────────────────────────────────────────────────────
print("FASE 5 — RSVP degli invitati (sì / no / in attesa)...")
expected_status = {}  # (event, invitee_idx) -> 'accepted'|'declined'|'pending'

def rsvp_for(iv):
    roll = random.random()
    if roll < 0.55:
        ans = "accepted"
    elif roll < 0.85:
        ans = "declined"
    else:
        expected_status[(iv["event"], iv["invitee"])] = "pending"
        return None
    r = put(f"/api/events/{iv['event']}/guests/respond", token=ok_users[iv["invitee"]]["token"], status=ans)
    if r.status_code == 200:
        expected_status[(iv["event"], iv["invitee"])] = ans
        return ans
    expected_status[(iv["event"], iv["invitee"])] = f"ERR{r.status_code}"
    return None

with cf.ThreadPoolExecutor(max_workers=16) as ex:
    list(ex.map(rsvp_for, reg_invites))

acc = sum(1 for v in expected_status.values() if v == "accepted")
dec = sum(1 for v in expected_status.values() if v == "declined")
pen = sum(1 for v in expected_status.values() if v == "pending")
err = [v for v in expected_status.values() if str(v).startswith("ERR")]
R.check("RSVP senza errori", len(err) == 0, f"errori RSVP: {err[:5]}")
print(f"  RSVP registrati: {acc} sì, {dec} no, {pen} in attesa (errori: {len(err)})")

# ─────────────────────────────────────────────────────────────────────
# FASE 6 — Inviti a cascata (allow_guests_to_invite)
# ─────────────────────────────────────────────────────────────────────
print("FASE 6 — Inviti a cascata (gli invitati invitano)...")
cascade_ok = 0
cascade_events = random.sample(events, min(6, len(events)))
for e in cascade_events:
    owner = e["owner"]
    # abilita il toggle
    put(f"/api/events/{e['id']}", token=ok_users[owner]["token"], allowGuestsToInvite=True)
    # un invitato "accepted" invita qualcun altro
    guests_here = [iv["invitee"] for iv in reg_invites
                   if iv["event"] == e["id"] and expected_status.get((e["id"], iv["invitee"])) == "accepted"]
    if not guests_here:
        continue
    guest = guests_here[0]
    target = next((j for j in ok_users if j != owner and j != guest), None)
    if target is None:
        continue
    r = post(f"/api/events/{e['id']}/guests", token=ok_users[guest]["token"], email=ok_users[target]["email"])
    if r.status_code == 201:
        cascade_ok += 1
R.check("inviti a cascata", cascade_ok >= 3, f"cascata riuscita su {cascade_ok}/{len(cascade_events)} eventi")
print(f"  cascata: {cascade_ok}/{len(cascade_events)} eventi con invito da parte di un invitato")

# ─────────────────────────────────────────────────────────────────────
# FASE 7 — Eventi ad accesso libero (public) leggibili dagli estranei
# ─────────────────────────────────────────────────────────────────────
print("FASE 7 — Eventi pubblici: lettura estranei + feed + privacy email...")
public_events = [e for e in events if e["visibility"] in ("public_view", "public_open")]
priv_events = [e for e in events if e["visibility"] == "private"]

pub_readable = 0
email_leak = 0
for e in public_events[:8]:
    # Estraneo VERO per QUESTO evento: interrogo il DB per gli user_id
    # realmente invitati (Fase 4 + cascata Fase 6) ed escludo owner + quelli.
    guest_ids = set(filter(None, db(
        f"SELECT user_id FROM event_guests WHERE event_id='{e['id']}' AND user_id IS NOT NULL").split("\n")))
    sidx = next((j for j in ok_users
                 if j != e["owner"] and j != 45 and ok_users[j]["id"] not in guest_ids), None)
    if sidx is None:
        continue
    r = get(f"/api/events/{e['id']}", token=ok_users[sidx]["token"])
    if r.status_code == 200:
        pub_readable += 1
        d = r.json()["data"]
        if d.get("guests"):  # un estraneo NON deve vedere il roster con le email
            email_leak += 1
            print(f"    LEAK? evento {e['id'][:8]} visto da user idx {sidx} "
                  f"(id {ok_users[sidx]['id'][:8]}) mostra {len(d['guests'])} guest")
R.check("eventi pubblici leggibili da estranei", not public_events or pub_readable > 0,
        f"letti {pub_readable}/{len(public_events[:8])}")
R.check("BE-3 privacy: nessuna email guest esposta a estranei", email_leak == 0,
        f"{email_leak} eventi con roster esposto")
# feed pubblico
fr = get("/api/feed/public", token=ok_users[49]["token"])
R.check("feed pubblico raggiungibile", fr.status_code == 200, f"status {fr.status_code}")
print(f"  eventi pubblici letti da estraneo: {pub_readable} | roster esposti: {email_leak} | feed: {fr.status_code}")

# ─────────────────────────────────────────────────────────────────────
# FASE 8 — Test NEGATIVI (deve fallire con il codice giusto)
# ─────────────────────────────────────────────────────────────────────
print("FASE 8 — Test negativi (autorizzazione)...")
# 8a: estraneo legge un evento PRIVATO altrui -> 403
if priv_events:
    e = priv_events[0]
    # scelgo un estraneo che NON è né owner né invitato
    invited_here = {iv["invitee"] for iv in reg_invites if iv["event"] == e["id"]}
    stranger_idx = next((j for j in ok_users if j != e["owner"] and j not in invited_here), None)
    rc = get(f"/api/events/{e['id']}", token=ok_users[stranger_idx]["token"]).status_code
    R.check("8a estraneo NON legge evento privato (403)", rc == 403, f"ricevuto {rc}")
    print(f"  8a evento privato ad estraneo: {rc} (atteso 403)")

# 8b: invito duplicato -> 400
if reg_invites:
    iv = reg_invites[0]
    rc = post(f"/api/events/{iv['event']}/guests", token=ok_users[iv['inviter']]['token'],
              email=ok_users[iv['invitee']]['email']).status_code
    R.check("8b invito duplicato (400)", rc == 400, f"ricevuto {rc}")
    print(f"  8b invito duplicato: {rc} (atteso 400)")

# 8c: invitato invita senza permesso (toggle off) -> 403
noinvite = next((e for e in events if e["id"] not in {ce["id"] for ce in cascade_events}), None)
if noinvite:
    guests_here = [iv["invitee"] for iv in reg_invites if iv["event"] == noinvite["id"]]
    if guests_here:
        g = guests_here[0]
        tgt = next((j for j in ok_users if j != noinvite["owner"] and j != g), None)
        rc = post(f"/api/events/{noinvite['id']}/guests", token=ok_users[g]["token"],
                  email=ok_users[tgt]["email"]).status_code
        R.check("8c invito senza permesso (403)", rc == 403, f"ricevuto {rc}")
        print(f"  8c invitato invita senza permesso: {rc} (atteso 403)")

# 8d: non-owner modifica evento altrui -> 403
if events:
    e = events[0]
    other = next((j for j in ok_users if j != e["owner"]), None)
    rc = put(f"/api/events/{e['id']}", token=ok_users[other]["token"], allowGuestsToInvite=True).status_code
    R.check("8d non-owner modifica evento (403)", rc == 403, f"ricevuto {rc}")
    print(f"  8d non-owner modifica evento: {rc} (atteso 403)")

# 8e: creare evento sull'agenda altrui -> 403
if events:
    victim = ok_users[0]["id"]
    attacker = ok_users[30]["token"]
    rc = post("/api/events", token=attacker, type="appointment", title="intruso",
              eventDate="2026-09-10", startTime="10:00", endTime="11:00",
              forOperatorUserId=victim).status_code
    R.check("8e evento su agenda altrui (403)", rc == 403, f"ricevuto {rc}")
    print(f"  8e evento su agenda altrui: {rc} (atteso 403)")

# ─────────────────────────────────────────────────────────────────────
# FASE 9 — Multi-device + cancellazione account
# ─────────────────────────────────────────────────────────────────────
print("FASE 9 — Multi-device e cancellazione account...")
# login due volte = due sessioni
u = ok_users[20]
s1 = post("/api/auth/login", email=u["email"], password="password123").json()["data"]
s2 = post("/api/auth/login", email=u["email"], password="password123").json()["data"]
r1 = post("/api/auth/refresh", refreshToken=s1["refreshToken"]).status_code
logout1 = post("/api/auth/logout", token=s1["accessToken"]).status_code
# s2 deve restare valida dopo il logout di s1
r2 = post("/api/auth/refresh", refreshToken=s2["refreshToken"]).status_code
R.check("multi-device: sessioni indipendenti", r1 == 200 and r2 == 200, f"r1={r1} r2={r2}")
print(f"  multi-device: refresh s1={r1}, logout s1={logout1}, refresh s2 dopo={r2} (attesi 200/200/200)")

# cancellazione account: user 45
u45 = ok_users[45]
dc = delete("/api/auth/me", token=u45["token"], password="password123").status_code
after = post("/api/auth/login", email=u45["email"], password="password123").status_code
R.check("cancellazione account + login negato", dc == 200 and after == 401, f"delete={dc} login={after}")
print(f"  cancellazione account: delete={dc}, login dopo={after} (attesi 200/401)")

# ─────────────────────────────────────────────────────────────────────
# FASE 10 — Invarianti: confronto atteso vs DB
# ─────────────────────────────────────────────────────────────────────
print("FASE 10 — Verifica invarianti (atteso vs database)...")
# L'utente 45 è stato cancellato (Fase 9): la cancellazione GDPR rimuove le
# sue righe guest dal DB, quindi le escludo dal conteggio atteso.
DELETED = {45}
acc_live = sum(1 for (ev, idx), v in expected_status.items() if v == "accepted" and idx not in DELETED)
dec_live = sum(1 for (ev, idx), v in expected_status.items() if v == "declined" and idx not in DELETED)
# conteggio RSVP nel DB per gli utenti registrati
db_acc = int(db("SELECT COUNT(*) FROM event_guests WHERE status='accepted' AND user_id IS NOT NULL") or 0)
db_dec = int(db("SELECT COUNT(*) FROM event_guests WHERE status='declined' AND user_id IS NOT NULL") or 0)
R.check("RSVP accepted coerenti col DB", db_acc == acc_live, f"atteso {acc_live}, DB {db_acc}")
R.check("RSVP declined coerenti col DB", db_dec == dec_live, f"atteso {dec_live}, DB {db_dec}")
print(f"  accepted: atteso {acc_live} / DB {db_acc}  |  declined: atteso {dec_live} / DB {db_dec}")

# email esterne restano pending senza account
db_ext_pending = int(db("SELECT COUNT(*) FROM event_guests WHERE user_id IS NULL AND status='pending'") or 0)
R.check("inviti esterni pending senza account", db_ext_pending >= len(ext_invites) - 2,
        f"DB {db_ext_pending}, inviati {len(ext_invites)}")
print(f"  inviti esterni pending (user_id NULL): {db_ext_pending}")

# spot check: apro 3 eventi come owner e verifico che gli status combacino
spot_ok = 0
for e in random.sample(events, min(3, len(events))):
    d = get(f"/api/events/{e['id']}", token=ok_users[e['owner']]['token']).json()["data"]
    match = True
    for g in d["guests"]:
        if g["user_id"]:
            # trova idx utente
            idx = next((k for k, uu in ok_users.items() if uu["id"] == g["user_id"]), None)
            exp = expected_status.get((e["id"], idx))
            if exp and not str(exp).startswith("ERR") and g["status"] != exp:
                match = False
    if match:
        spot_ok += 1
R.check("spot-check status guest via API", spot_ok == 3, f"{spot_ok}/3 eventi coerenti")
print(f"  spot-check status via API: {spot_ok}/3 eventi coerenti")

# ─────────────────────────────────────────────────────────────────────
# REPORT
# ─────────────────────────────────────────────────────────────────────
print("\n" + "=" * 62)
tot_users = int(db("SELECT COUNT(*) FROM users") or 0)
tot_events = int(db("SELECT COUNT(*) FROM events") or 0)
tot_guests = int(db("SELECT COUNT(*) FROM event_guests") or 0)
print(f"DATI GENERATI: {tot_users} utenti, {tot_events} eventi, {tot_guests} inviti")
print(f"CONTROLLI: {R.passed} PASS / {R.failed} FAIL")
if R.fails:
    print("\nFALLIMENTI:")
    for f in R.fails:
        print(f"  ✗ {f}")
    sys.exit(1)
else:
    print("\n✓ TUTTI I CONTROLLI SUPERATI")
    sys.exit(0)
