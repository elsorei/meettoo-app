# MeetToo — Valori di configurazione per il deploy

Ogni placeholder, **dove prenderlo** e **dove metterlo**. Segui l'ordine: alcuni
valori esistono solo dopo un passaggio precedente (segnati con ⏳).

---

## A. Variabili sull'API (Railway → Variables del servizio meettoo-api)

| Variabile | Valore | Dove prenderlo |
|-----------|--------|----------------|
| `APP_URL` | il tuo dominio pubblico API | Railway → Settings → Domains (es. `https://meettoo-api-production.up.railway.app`) |
| `DATABASE_URL` | connessione Postgres | add-on Postgres di Railway (variabile fornita) |
| `REDIS_URL` | connessione Redis | add-on Redis di Railway |
| `JWT_SECRET` | stringa casuale | genera: `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | stringa casuale diversa | genera: `openssl rand -hex 32` |
| `SMTP_HOST/PORT/USER/PASS/FROM` | credenziali email | il tuo provider SMTP (verifica email, reset, inviti) |
| `TRUST_PROXY` | `1` | Railway ha 1 proxy davanti |
| `PLAY_STORE_URL` | ✅ già noto: `https://play.google.com/store/apps/details?id=it.studiorei.meettoo` | deterministico dal package |
| `IOS_APP_ID` | `<TEAM_ID>.it.studiorei.meettoo` | Apple Developer → **Membership** → *Team ID* (10 caratteri) |
| `ANDROID_SHA256` ⏳ | impronta SHA-256 del certificato | dopo il 1° build Android: `eas credentials` → Android → *SHA-256*, **oppure** Play Console → *App integrity* |
| `APP_STORE_URL` ⏳ | `https://apps.apple.com/app/id<NUMERO>` | dopo aver creato l'app in App Store Connect (ID numerico) |
| `COMPANY_NAME` | `Studio REI` | già default |
| `PRIVACY_CONTACT_EMAIL` | una casella reale | serve nella privacy policy (es. `privacy@studiorei.it`) |

Dopo aver settato `ANDROID_SHA256`, **rideploya** (così `/.well-known/assetlinks.json` espone l'impronta giusta).

**Verifica rapida** (sostituisci il dominio):
```
curl https://TUO-DOMINIO/privacy                              # deve dare 200
curl https://TUO-DOMINIO/.well-known/apple-app-site-association
curl https://TUO-DOMINIO/.well-known/assetlinks.json
```

## B. Variabile per il build dell'app (eas.json)

Un solo valore, e configura anche gli Universal/App Links da solo (via `app.config.js`):

| Variabile | Valore | Dove |
|-----------|--------|------|
| `EXPO_PUBLIC_API_URL` | lo stesso dominio di `APP_URL` | `eas.json` → `build.preview.env` e `build.production.env` |

Non serve più toccare `app.json` per il dominio: il `host` degli App Links viene
ricavato da questa variabile.

## C. Privacy policy — GIÀ PRONTA

Servita dalla tua API: **`https://TUO-DOMINIO/privacy`**. Usa questo URL nelle
schede store (Apple e Google lo richiedono). Personalizza il contatto con
`PRIVACY_CONTACT_EMAIL`. (Consiglio: falla rivedere da un legale prima del lancio.)

---

## Sequenza operativa (risolve le dipendenze ⏳)

1. **Deploy API**: setta le variabili della sez. A che conosci già (`APP_URL`,
   segreti, SMTP, `PLAY_STORE_URL`, `PRIVACY_CONTACT_EMAIL`). Verifica con i curl.
2. **EAS**: `eas login` → `eas init` (scrive il projectId in `app.json`). Metti
   `EXPO_PUBLIC_API_URL` in `eas.json`.
3. **1° build Android**: `eas build -p android --profile preview`. Poi
   `eas credentials` → copia la **SHA-256** → mettila in `ANDROID_SHA256` su
   Railway → rideploya.
4. **Team ID Apple**: da Membership → metti `IOS_APP_ID` su Railway.
5. **Schede store**: crea l'app in App Store Connect e Play Console → ottieni
   l'**ID App Store** → metti `APP_STORE_URL` su Railway.
6. **Verifica link**: con le build installate, aprendo `https://TUO-DOMINIO/e/<id>`
   l'app si apre direttamente.

---

## Google Play — closed test 14 giorni (account personali NUOVI)

Se il tuo account developer è **personale** e creato di recente, Google impone un
closed test prima di poter pubblicare in produzione. **Avvialo subito**: è il
percorso critico sui tempi.

1. Play Console → **Crea app** (nome *MeetToo*, package `it.studiorei.meettoo`).
2. **Testing → Closed testing** → crea una traccia.
3. Aggiungi i tester: il numero minimo richiesto (Google mostra la soglia
   attuale, ~12-20) — inserisci le loro email (una Google Group aiuta).
4. Carica l'`.aab`: `eas build -p android --profile production` poi
   `eas submit -p android --latest`.
5. Condividi il link di opt-in; i tester installano e **usano** l'app.
6. Tieni il test attivo **≥14 giorni consecutivi** con i tester richiesti.
7. Compare **"Richiedi accesso alla produzione"** → invia per la review.

(Account **organizzazione**: esenti dal requisito 14 giorni.)

## Dichiarazioni dati (obbligatorie nelle schede)

Sia Apple (*Privacy Nutrition Label*) sia Google (*Data safety*) chiedono cosa
raccogli. Per MeetToo dichiara:
- **Email, Nome** — per il funzionamento dell'account. Sì, collegati all'identità.
- **Numero di telefono** (opzionale) — per l'account.
- **Contenuti utente** (eventi) — per il funzionamento.
- **Identificatori del dispositivo** — solo per le notifiche push.
- **Nessuna** condivisione per pubblicità, **nessuna** vendita dati, **nessuna**
  geolocalizzazione precisa.
- Cancellazione account in-app: **Sì** (URL/percorso: Profilo → Cancella account).
