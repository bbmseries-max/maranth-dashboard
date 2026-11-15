export type EcosystemProduct = 'Maranth Invoice Pro' | 'Market Engine POS' | 'Estiasi Hub';
export type SubscriptionTier = 'public_demo_7d' | 'trial_7d' | 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'grace_period' | 'past_due' | 'canceled';
export type BillingInterval = 'monthly' | 'annual';

export interface ClientSubscription {
  id: string;
  clientName: string;
  taxNumber?: string;              // AFM (Greek Tax ID)
  doy?: string;                    // Greek Tax Office (Δ.Ο.Υ.)
  address?: string;                // Street, Number, City
  appSlug?: string;                // e.g. 'parnasos', 'ftest', 'beach-bar-client'
  contactEmail: string;
  contactPhone?: string;
  product: EcosystemProduct;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  interval: BillingInterval;
  amount: number;                  // Fee in EUR
  startDate: string;               // ISO 'YYYY-MM-DD'
  nextBillingDate: string;         // ISO 'YYYY-MM-DD'
  trialExpiresAt?: string;         // Explicit trial cutoff if status === 'trial'
  trialStartsOnFirstOpen?: boolean;// When true, POS stamps 7-day countdown on first launch
  licenseKey: string;
  seats: number;                   // Number of terminals/registers allowed
  autoRenew: boolean;
  stripeCustomerId?: string;
  notes?: string;
}

export interface ClientSubscriptionComputed extends ClientSubscription {
  daysUntilRenewal: number;
  monthlyEquivalent: number;       // Normalized MRR contribution
  isExpiringSoon: boolean;         // <= 7 days remaining
  isExpired: boolean;
  renewalTargetDate: string;       // Chooses trialExpiresAt if on trial, else nextBillingDate
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