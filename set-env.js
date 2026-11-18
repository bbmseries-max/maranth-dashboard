const fs = require('fs');
const path = require('path');

const clean = (val, fallback = '') => String(val || fallback).trim();

const envDir = path.join(__dirname, 'src', 'environments');
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

const envFileContent = `export const environment = {
  production: true,
  firebase: {
    hub: {
      apiKey: '${clean(process.env.FIREBASE_API_KEY)}',
      authDomain: '${clean(process.env.FIREBASE_AUTH_DOMAIN, 'maranth-hub.firebaseapp.com')}',
      projectId: '${clean(process.env.FIREBASE_PROJECT_ID, 'maranth-hub')}',
      storageBucket: '${clean(process.env.FIREBASE_STORAGE_BUCKET, 'maranth-hub.firebasestorage.app')}',
      messagingSenderId: '${clean(process.env.FIREBASE_MESSAGING_SENDER_ID)}',
      appId: '${clean(process.env.FIREBASE_APP_ID)}'
    }
  },
  sentry: {
    authToken: '${clean(process.env.SENTRY_AUTH_TOKEN)}',
    organizationSlug: 'robert-cuko',
    projects: ['athina-appliance', 'estiasi-hub-pa', 'maranth-invoice-pro', 'market-engine-pos']
  },
  linear: {
    apiKey: '${clean(process.env.LINEAR_API_KEY)}',
    teamKey: 'maranth-dashboard'
  },
  invoiceProGateway: {
    url: '${clean(process.env.INVOICE_PRO_GATEWAY_URL, 'https://gsis-lookup.bbmseries.workers.dev')}',
    adminKey: '${clean(process.env.INVOICE_PRO_ADMIN_KEY)}'
  }
};
`;

if (process.env.VERCEL || !fs.existsSync(path.join(envDir, 'environment.ts'))) {
  fs.writeFileSync(path.join(envDir, 'environment.ts'), envFileContent);
}
if (process.env.VERCEL || !fs.existsSync(path.join(envDir, 'environment.prod.ts'))) {
  fs.writeFileSync(path.join(envDir, 'environment.prod.ts'), envFileContent);
}

console.log('[set-env] apiKey length:', clean(process.env.FIREBASE_API_KEY).length);