# MeetToo — Runbook di pubblicazione (TestFlight + Play Internal → Store)

Obiettivo: mettere l'app sul telefono di un beta tester reale (es. l'amico che
organizza feste) e, a esito positivo, pubblicare sugli store.

**Percorso consigliato**: prima **beta su dispositivo** (TestFlight iOS + Google
Play Internal Testing) — niente review pubblica, l'app gira su telefoni reali.
Solo dopo, submit pubblico.

---

## 0. Prerequisito bloccante: l'API deve essere online

L'app è un client dell'API `meettoo-api`. Prima di qualunque build serve
l'API in produzione con:

- **PostgreSQL** e **Redis** gestiti (Railway li offre entrambi come add-on).
- Variabili d'ambiente reali (vedi `meettoo-api/.env.example`):
  `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` (genera con
  `openssl rand -hex 32`), `SMTP_*` (per verifica email/reset/inviti),
  `APP_URL` (URL pubblico dell'API), `TRUST_PROXY=1`.
- **Storage foto profilo**: oggi le foto vanno su disco locale ed è effimero su
  Railway. Per la produzione va collegato un object storage (S3/Cloudflare R2).
  Per la sola beta si può rimandare (le foto profilo non sono nel flusso core).

Annota l'URL pubblico dell'API (es. `https://meettoo-api-production.up.railway.app`)
e mettilo in `eas.json` al posto di `REPLACE-WITH-YOUR-API...` (profili
`preview` e `production`).

---

## 1. Account necessari (li crei tu — servono credenziali reali)

| Cosa | Costo | Serve per |
|------|-------|-----------|
| Apple Developer Program | 99 $/anno | TestFlight + App Store |
| Google Play Developer | 25 $ una tantum | Play Internal + Play Store |
| Account Expo (EAS) | gratis per iniziare | build cloud |

---

## 2. Setup EAS (una volta)

```bash
cd meettoo-app
npm i -g eas-cli
eas login                 # con l'account Expo
eas init                  # crea il projectId e lo scrive in app.json (extra.eas)
```

## 3. Build beta

```bash
# iOS (richiede l'Apple Developer account collegato; EAS gestisce i certificati)
eas build --platform ios --profile preview

# Android (EAS genera il keystore e lo custodisce)
eas build --platform android --profile preview
```

Al termine EAS fornisce un link al `.ipa` (iOS) e `.aab`/`.apk` (Android).

## 4. Distribuzione al beta tester

- **iOS / TestFlight**:
  `eas submit --platform ios --profile production --latest`
  poi da App Store Connect → TestFlight → aggiungi l'email del tester.
  Il tester installa l'app **TestFlight** e accetta l'invito.
- **Android / Play Internal Testing**:
  `eas submit --platform android --profile production --latest`
  poi da Play Console → Testing → Internal testing → crea la lista tester con
  l'email dell'amico → condividi il link di opt-in.

## 5. Submit pubblico (dopo la beta)

Stessa `eas submit`, ma promuovendo la build da Internal/TestFlight a
Production nelle rispettive console, dopo aver compilato le schede store.

---

## Checklist store (obbligatoria per l'approvazione)

- [x] Icona app (assets/icon.png) e adaptive icon Android — **fatto**
- [x] `bundleIdentifier` iOS e `package` Android in app.json — **fatto**
- [x] Cancellazione account in-app — **fatto** (Apple la richiede se c'è
      registrazione; è in Profilo → Cancella account)
- [x] Deep link / scheme (`meettoo://`) — **fatto**
- [ ] **Privacy Policy** ospitata a un URL pubblico — vedi `PRIVACY.md` (bozza
      da rivedere con un legale e pubblicare, es. su Netlify/pagina statica).
      **Obbligatoria** sia per Apple sia per Google.
- [ ] **Termini di Servizio** (consigliati).
- [ ] Screenshot per store (almeno 1 per dimensione richiesta) — si generano
      dalle schermate reali dopo il primo build.
- [ ] Descrizione, categoria, fascia d'età.
- [ ] Google Play **Data Safety form** / Apple **Privacy Nutrition Label**:
      dichiara i dati raccolti (email, nome, telefono opzionale, eventi).
- [ ] Testo "Sign in with Apple": se in futuro aggiungi login social, Apple
      **impone** anche "Sign in with Apple". Oggi c'è solo email/password: ok.

## Gap noti prima del pubblico (non bloccano la beta)

- **Push notification**: non ancora integrate nell'app (il backend ha già
  l'endpoint FCM). Sono il motore di retention: consigliato aggiungerle prima
  del lancio pubblico, ma per la beta con l'amico si può rimandare.
- **Object storage** per le foto profilo (vedi §0).
