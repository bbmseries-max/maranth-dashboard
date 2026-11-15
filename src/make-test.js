purge-tenant.mjs// purge-tenant.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Replace with path to your downloaded service account key from Firebase Console
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const TARGET_TENANT = process.argv[2];

if (!TARGET_TENANT) {
  console.error('Please specify a tenant slug: node purge-tenant.mjs <tenantSlug>');
  process.exit(1);
}

if (['estiasi-hub-pa', 'coffee-shop-demo'].includes(TARGET_TENANT)) {
  console.error(`Safety Error: "${TARGET_TENANT}" is protected and cannot be deleted.`);
  process.exit(1);
}

const COLLECTIONS = [
  'employees',
  'shifts',
  'tables',
  'orders',
  'sales',
  'z_reports',
  'vaults',
  'auditLogs',
  'modifier_groups',
  'categories',
  'products',
  'store_configs',
  'device_licenses'
];

async function run() {
  console.log(`Starting cleanup for tenant: ${TARGET_TENANT}...`);
  let count = 0;

  for (const col of COLLECTIONS) {
    const snapshot = await db.collection(col).where('tenantId', '==', TARGET_TENANT).get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(d => {
        batch.delete(d.ref);
        count++;
      });
      await batch.commit();
      console.log(`✓ Deleted ${snapshot.size} docs from ${col}`);
    }
  }

  // Delete from root /tenants
  const tenantDoc = db.collection('tenants').doc(TARGET_TENANT);
  await tenantDoc.delete();
  console.log(`✓ Deleted root /tenants/${TARGET_TENANT}`);

  console.log(`Cleanup complete! Total documents purged: ${count + 1}`);
}

run().catch(console.error);