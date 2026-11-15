Maranth Ecosystem: Tenant Architecture, Licensing & Dashboard Integration ReferenceDocument Version: 1.0.0Updated: October 24, 2026Location: /docs/architecture-and-licensing.mdPurpose: Architecture blueprint, tenant state storage, multi-tenancy models, and data synchronization reference across all Maranth applications and the central Dashboard.1. System Ecosystem OverviewThe Maranth ecosystem consists of three autonomous, standalone operational applications and one centralized administrative command tower:┌────────────────────────────────────────────────────────────────────────┐
│                        Maranth Dashboard App                           │
│     Unified Telemetry, Trial Radar, License & Subscription Engine      │
└──────────────┬─────────────────────────┬───────────────────────────────┘
               │                         │
      (Cloudflare KV API)          (Firestore)
               │                         │
┌──────────────┴──────────────┐ ┌────────┴──────────────┐ ┌──────────────┴──────────────┐
│  App 1: Invoice Pro         │ │ App 2: Market POS Hub │ │ App 3: Estiasi Hub          │
├─────────────────────────────┤ ├───────────────────────┤ ├─────────────────────────────┤
│ • Authority: Cloudflare KV  │ │ • Storage: Dexie & LS │ │ • Storage: Firestore DB    │
│ • Key: Greek AFM (9 digits) │ │ • Key: ?shop=:code    │ │ • Key: /t/:tenantSlug/      │
│ • Standalone Offline Cache  │ │ • Firebase Connected  │ │ • Firebase Real-Time        │
└─────────────────────────────┘ └───────────────────────┘ └─────────────────────────────┘
2. Per-App Architecture & Tenant Storage ReferenceApp 1: Maranth Invoice Pro (ex Timologio)Role: Wholesale invoicing, B2B sales (Type 1.1), movement delivery notes (Phase B Type 9.1/9.3), AADE myDATA synchronization.Tenant Identification: 9-digit Greek AFM (vatNumber, e.g., 067424104).Authoritative Store: Cloudflare Worker KV namespace (SUBSCRIPTIONS).Key Format: <AFM>Payload Schema:JSON{
  "tier": "RETAIL_SHOP",
  "status": "ACTIVE",
  "validUntil": null,
  "monthlyLimit": 999999
}
Client Implementation:Modern Angular zoneless initialization via provideAppInitializer in src/app/app.config.ts.AuthTenantService checks subscription status against Cloudflare Worker proxy (GET /check-subscription?afm=:afm) with a 4-second non-blocking timeout.Partitioned Dexie IndexedDB cache per tenantId (AFM) ensures offline operation.Hard gateway enforcement: Cloudflare Worker blocks AADE dispatch if tenant is SUSPENDED or EXPIRED.App 2: Market Engine POS (Retail Hub)Role: Retail point-of-sale, barcode scanning, shift management, fiscal hardware bridge (FHM/Provider), offline-first checkout.Tenant Identification: URL query parameter ?shop=<code> (e.g., ?shop=parnasos, ?shop=mar-market, ?shop=ftest).Storage Layer:Browser localStorage keys: 'registered_shops' and 'active_shop_code'.Local IndexedDB database: MaranthPOS_<shopCode> managed via Dexie.Authentication: Local salted SHA-256 PIN hash (adminPinSalt + adminPin $\rightarrow$ adminPinHash).Active Tenant Schema (ShopInfo):TypeScriptexport interface ShopInfo {
  code: string;                  // e.g. 'parnasos'
  name: string;                  // 'Maranth Parnassos'
  adminPinSalt?: string;
  adminPinHash?: string;         // SHA-256 hash of salt:pin
  defaultFloat?: number;         // e.g. 50
  defaultRegister?: string;      // 'REG-01'
  address?: string;
  afm?: string;                  // Greek AFM bridging to Invoice Pro
  doy?: string;
  phone?: string;
  currency?: string;
  isActive?: boolean;
  allowStoreSwitch?: boolean;
  fiscalMode?: 'FHM' | 'PROVIDER' | 'NONE';
  fhmEndpoint?: string;
  providerApiKey?: string;
  subscription?: ShopSubscription; // Optional local license cache
}
Default Seed Tenants:mar-market $\rightarrow$ AFM 123456789, PIN 2435ftest $\rightarrow$ AFM 998877665, PIN 5564parnasos $\rightarrow$ AFM 887766554, PIN 1978App 3: Maranth Estiasi POS (Hospitality Hub)Role: Restaurant, cafe, bar, beach bar POS; table layouts, split bills, modifiers, kitchen display (KDS), waiter dispatch.Tenant Identification: URL path-scoped routes /t/:tenantSlug/... (e.g., /t/beach-bar-client/order/table-1).Storage Layer: Google Cloud Firestore (multi-tenant shared database).Security & Multi-Tenant Isolation:All listeners (RestaurantPosService, TableOrderService, InventoryService) query with strict server-side scoping: where('tenantId', '==', tenantId) and where('storeId', '==', storeId).firestore.rules enforces immutable tenant scoping on create/update and protects /sales, /z_reports, and /auditLogs as append-only.Route protection: tenantExistsGuard validates store slug existence before route activation; roleGuard dynamically enforces waiter vs. manager access.Provisioning Registry: TenantContextService maintains registeredStores: StoreProfile[] mapped by tenantId.3. Universal Bridge Strategy: Greek AFM (vatNumber)The primary link across all apps is the Greek 9-digit tax ID (AFM):Invoice Pro uses AFM as its direct database key.Market POS Hub stores afm inside every ShopInfo record.Estiasi Hub stores afm / taxNumber inside tenant profile metadata.The Dashboard uses Greek AFM as the universal cross-app bridge to consolidate licenses, subscription dates, and telemetry without merging codebases.4. Central Dashboard Domain Model ReferenceFile location: src/app/models/subscription.model.tsTypeScriptexport type EcosystemProduct = 'Maranth Invoice Pro' | 'Market Engine POS' | 'Estiasi Hub';
export type SubscriptionTier = 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'grace_period' | 'past_due' | 'cancelled';
export type BillingInterval = 'monthly' | 'annual';

export interface ClientSubscription {
  id: string;
  clientName: string;
  taxNumber?: string;              // AFM (Greek tax ID)
  appSlug?: string;                // 'parnasos', 'ftest', 'beach-bar-client'
  contactEmail: string;
  contactPhone?: string;
  product: EcosystemProduct;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  amount: number;                  // Fee in EUR
  startDate: string;               // ISO 'YYYY-MM-DD'
  nextBillingDate: string;         // ISO 'YYYY-MM-DD'
  trialExpiresAt?: string;         // Explicit trial cutoff date
  licenseKey: string;
  seats: number;                   // Allowed terminals/registers
  autoRenew: boolean;
  stripeCustomerId?: string;
  notes?: string;
}

export interface ClientSubscriptionComputed extends ClientSubscription {
  renewalTargetDate: string;       // Chooses trialExpiresAt if on trial, else nextBillingDate
  daysUntilRenewal: number;        // Countdown days remaining
  monthlyEquivalent: number;       // Normalized MRR contribution
  isExpiringSoon: boolean;         // <= 7 days remaining
  isExpired: boolean;              // Passed renewal date and not cancelled
}

export interface ProductMetrics {
  count: number;
  activeCount: number;
  trialCount: number;
  mrr: number;
}

export interface SubscriptionMetrics {
  totalMrr: number;
  activeCount: number;
  trialCount: number;
  pastDueCount: number;
  expiringSoonCount: number;
  productBreakdown: Record<EcosystemProduct, ProductMetrics>;
}
5. Dashboard Service SpecificationFile location: src/app/services/subscription.service.tsSignals & ComputationssubscriptionsSignal (signal<ClientSubscription[]>): Master reactive source of all registered client licenses.computedSubscriptions (computed<ClientSubscriptionComputed[]>): Automatically normalizes MRR, derives renewalTargetDate, computes countdown daysUntilRenewal, and flags isExpiringSoon / isExpired.expiringRadar (computed<ClientSubscriptionComputed[]>): High-priority queue isolating trials, renewals within 7 days, and expired accounts.metrics (computed<SubscriptionMetrics>): Executive aggregation of total MRR, active clients, trials, past due accounts, and per-app breakdowns.filteredSubscriptions (computed<ClientSubscriptionComputed[]>): Filtered view bound to active product and status filters.Core MutationsextendSubscription(id: string, additionalDays: number): Adds days to trialExpiresAt (if on trial) or nextBillingDate.activatePaidSubscription(id: string, interval: 'monthly' | 'annual', amount: number): Converts trial accounts directly into paid active subscriptions.toggleSubscriptionStatus(id: string, newStatus: SubscriptionStatus): State transition utility.addSubscription(sub: Omit<ClientSubscription, 'id'>): Registers new client instances.removeSubscription(id: string): Deletes or archives subscriptions.6. Remote Synchronization RoadmapTarget AppCurrent StateDashboard Sync PathInvoice ProCloudflare Worker KVDashboard calls Cloudflare KV REST API directly via AFM key.Market POS HublocalStorage + DexieDashboard writes to /tenants/:shopCode in Firestore; POS syncs on boot.Estiasi HubCloud FirestoreDashboard updates Firestore /tenants/:tenantSlug; tenantExistsGuard enforces status.