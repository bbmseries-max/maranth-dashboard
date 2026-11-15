export const environment = {
  production: false,
  firebase: {
    // 1. Maranth Estiasi
    estiasi: {
    apiKey: "AIzaSyDnixK-3v_bAjCFhvB6diDNp6eXoC2V4_c",
  authDomain: "maranth-estiasi.firebaseapp.com",
  projectId: "maranth-estiasi",
  storageBucket: "maranth-estiasi.firebasestorage.app",
  messagingSenderId: "927547122917",
  appId: "1:927547122917:web:7f6ab240c6e2f58967e00c"
  },
  //market hub
  hub: {
    apiKey: "",
  authDomain: "maranth-hub.firebaseapp.com",
  projectId: "maranth-hub",
  storageBucket: "maranth-hub.firebasestorage.app",
  messagingSenderId: "550516097634",
  appId: "1:550516097634:web:7369f45595b3dce8f4873b"
  }
  },
  sentry: {
    authToken: '', // Read-only org token
    organizationSlug: 'robert-cuko',
    projects: ['athina-appliance', 'estiasi-hub-pa', 'maranth-invoice-pro', 'market-engine-pos']
  },
 linear: {
    apiKey: '',
    teamKey: 'maranth-dashboard'
  },
  invoiceProGateway: {
    url: 'https://gsis-lookup.bbmseries.workers.dev',
    adminKey: 'W759TVu-!XWq//.'
  }
};
