// Config dinamica Expo: parte da app.json e inietta gli Universal/App Links
// derivandone il DOMINIO da EXPO_PUBLIC_API_URL. Così basta impostare quella
// UNICA variabile (già necessaria perché l'app parli con l'API) e i deep link
// https si configurano da soli — niente domini da incollare a mano.
//
// EXPO_PUBLIC_API_URL va messa in eas.json (build.<profilo>.env) o come EAS
// secret. Esempio: https://meettoo-api-production.up.railway.app
const base = require('./app.json');

function apiHost() {
  const url = process.env.EXPO_PUBLIC_API_URL || '';
  try {
    return url ? new URL(url).host : '';
  } catch {
    return '';
  }
}

module.exports = () => {
  const expo = { ...base.expo };
  const host = apiHost();

  if (host) {
    // iOS Universal Links
    expo.ios = { ...expo.ios, associatedDomains: [`applinks:${host}`] };
    // Android App Links (autoVerify tramite assetlinks.json servito dall'API)
    expo.android = {
      ...expo.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host, pathPrefix: '/e' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    };
  }

  return expo;
};
