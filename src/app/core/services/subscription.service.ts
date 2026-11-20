// src/app/core/services/subscription.service.ts

import { Injectable, inject, signal, computed, DestroyRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  Firestore,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  Unsubscribe
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ClientSubscription,
  ClientSubscriptionComputed,
  SubscriptionStatus,
  SubscriptionMetrics,
  EcosystemProduct,
  SubscriptionTier,
  BillingInterval
} from '../models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly firestore = inject(Firestore, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  private firestoreUnsub: Unsubscribe | null = null;

  private readonly firestoreSubscriptions = signal<ClientSubscriptionComputed[]>([]);
  private readonly invoiceProStores = signal<ClientSubscriptionComputed[]>([]);

  readonly allSubscriptions = computed<ClientSubscriptionComputed[]>(() => [
    ...this.firestoreSubscriptions(),
    ...this.invoiceProStores()
  ]);

  readonly metrics = computed<SubscriptionMetrics>(() => {
    const list = this.allSubscriptions();

    let totalMrr = 0;
    let activeCount = 0;
    let trialCount = 0;
    let pastDueCount = 0;
    let expiringSoonCount = 0;

    const productBreakdown: Record<EcosystemProduct, { count: number; activeCount: number; trialCount: number; mrr: number }> = {
      'Maranth Invoice Pro': { count: 0, activeCount: 0, trialCount: 0, mrr: 0 },
      'Market Engine POS': { count: 0, activeCount: 0, trialCount: 0, mrr: 0 },
      'Estiasi Hub': { count: 0, activeCount: 0, trialCount: 0, mrr: 0 }
    };

    for (const sub of list) {
      const target = productBreakdown[sub.product];
      if (target) {
        target.count++;
      }

      if (sub.status === 'active') {
        activeCount++;
        totalMrr += sub.monthlyEquivalent;
        if (target) {
          target.activeCount++;
          target.mrr += sub.monthlyEquivalent;
        }
      } else if (sub.status === 'trial') {
        trialCount++;
        if (target) target.trialCount++;
      } else if (sub.status === 'past_due' || sub.status === 'grace_period') {
        pastDueCount++;
      }

      if (sub.isExpiringSoon) {
        expiringSoonCount++;
      }
    }

    return {
      totalMrr,
      activeCount,
      trialCount,
      pastDueCount,
      expiringSoonCount,
      productBreakdown
    };
  });

  constructor() {
    this.initListeners();
    this.loadInvoiceProSubscriptions();

    this.destroyRef.onDestroy(() => {
      if (this.firestoreUnsub) {
        this.firestoreUnsub();
        this.firestoreUnsub = null;
      }
    });
  }

  // --- Public Re-Bind Hook (Called by AppComponent after silent Firebase Auth resolves) ---
  public initListeners(): void {
    if (this.firestoreUnsub) {
      this.firestoreUnsub();
      this.firestoreUnsub = null;
    }
    this.initFirestoreStream();
  }

  // --- Helper: Map Dashboard Tier/Interval to Unified Ecosystem Tier ---
  private resolveEcosystemTier(tier: SubscriptionTier, interval: BillingInterval, status: SubscriptionStatus): string {
    if (tier === 'public_demo_7d') return 'PUBLIC_DEMO_7D';
    if (tier === 'trial_7d' || status === 'trial') return 'TRIAL_7D';
    if (interval === 'annual') return 'PAID_ANNUAL';
    return 'PAID_MONTHLY';
  }

  // --- Helper: Greek-Safe Slug Generator ---
  private generateSlug(name: string): string {
    const greekMap: Record<string, string> = {
      'α': 'a', 'β': 'v', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'i', 'θ': 'th',
      'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p',
      'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o'
    };

    let clean = name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    clean = clean.split('').map(char => greekMap[char] || char).join('');

    return clean
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `tenant-${Date.now()}`;
  }

  // --- Helper: Mirror AFM License to Cloudflare Worker KV (Maranth Hub Bridge) ---
  private async syncAfmToCloudflareKv(params: {
    afm?: string;
    clientName?: string;
    tier?: string;
    status: 'ACTIVE' | 'SUSPENDED';
    validUntil?: string | null;
  }): Promise<void> {
    const cleanAfm = String(params.afm || '').trim();
    if (!/^\d{9}$/.test(cleanAfm)) return;

    const gateway = environment.invoiceProGateway;
    if (!gateway?.url || !gateway?.adminKey) return;

    const cleanUrl = gateway.url.replace(/\/+$/, '');
    const headers = new HttpHeaders({ 'x-admin-key': gateway.adminKey });

    const payload: Record<string, any> = {
      afm: cleanAfm,
      status: params.status
    };

    if (params.clientName) payload['clientName'] = params.clientName;
    if (params.tier) payload['tier'] = params.tier;
    if (params.validUntil !== undefined) payload['validUntil'] = params.validUntil;

    try {
      await firstValueFrom(this.http.post(`${cleanUrl}/admin/subscription`, payload, { headers }));
      this.loadInvoiceProSubscriptions();
    } catch (err) {
      console.warn(`[Cloudflare KV Sync] Failed mirroring AFM ${cleanAfm}:`, err);
    }
  }

  // --- Compute Normalized Date & Financial Fields ---
  private enrichSubscription(raw: ClientSubscription): ClientSubscriptionComputed {
    const now = new Date();
    const renewalTargetDate = (raw.status === 'trial' && raw.trialExpiresAt)
      ? raw.trialExpiresAt
      : raw.nextBillingDate;

    const targetDate = new Date(renewalTargetDate);
    const diffTime = targetDate.getTime() - now.getTime();
    const daysUntilRenewal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isExpired = daysUntilRenewal < 0;
    const isExpiringSoon = !isExpired && daysUntilRenewal <= 7;

    const monthlyEquivalent = raw.interval === 'annual'
      ? Math.round(raw.amount / 12)
      : raw.amount;

    return {
      ...raw,
      daysUntilRenewal,
      monthlyEquivalent,
      isExpiringSoon,
      isExpired,
      renewalTargetDate
    };
  }

  // --- Firestore Stream (Unified /tenants/{slug} Reader) ---
  private initFirestoreStream(): void {
    if (!this.firestore) {
      console.warn('[Firestore] Instance is null or missing.');
      return;
    }

    try {
      const tenantsCol = collection(this.firestore, 'tenants');

      this.firestoreUnsub = onSnapshot(tenantsCol, (snapshot) => {
        const docs: Array<{ id: string; [key: string]: any }> = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));

        const mapped = docs.map(d => {
          const docData = d as any;
          const nestedSub = docData.subscription || {};

          const clientName = docData.name || docData.clientName || d.id;
          const slug = docData.code || docData.shopSlug || docData.appSlug || d.id;
          const rawPlan = String(docData.plan || docData.tier || '').trim().toLowerCase();

          const effectiveStatusRaw = String(
            nestedSub.status || docData.status || (docData.isActive === false ? 'SUSPENDED' : 'ACTIVE')
          ).trim().toUpperCase();

          let mappedStatus: SubscriptionStatus = 'active';
          if (effectiveStatusRaw === 'SUSPENDED' || effectiveStatusRaw === 'CANCELED' || effectiveStatusRaw === 'CANCELLED' || docData.isActive === false) {
            mappedStatus = 'canceled';
          } else if (effectiveStatusRaw === 'EXPIRED') {
            mappedStatus = 'past_due';
          } else if (
            effectiveStatusRaw === 'TRIAL' ||
            nestedSub.tier === 'TRIAL' ||
            nestedSub.tier === 'TRIAL_7D' ||
            nestedSub.tier === 'PUBLIC_DEMO_7D'
          ) {
            mappedStatus = 'trial';
          }

          let mappedTier: SubscriptionTier = 'pro';
          if (nestedSub.tier === 'PUBLIC_DEMO_7D' || rawPlan === 'public_demo_7d') {
            mappedTier = 'public_demo_7d';
          } else if (nestedSub.tier === 'TRIAL_7D' || rawPlan === 'trial_7d') {
            mappedTier = 'trial_7d';
          } else if (rawPlan === 'starter') {
            mappedTier = 'starter';
          } else if (rawPlan === 'enterprise') {
            mappedTier = 'enterprise';
          }

          const isTrialOrDemo = mappedTier === 'public_demo_7d' || mappedTier === 'trial_7d' || mappedStatus === 'trial';
          const validUntilIso: string = nestedSub.validUntil || '';
          const fallbackDate = new Date(Date.now() + (isTrialOrDemo ? 7 : 30) * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

          const nextBillingDate = validUntilIso
            ? validUntilIso.split('T')[0]
            : (docData.nextBillingDate || fallbackDate);

          const isAnnual = nestedSub.tier === 'PAID_ANNUAL' || docData.interval === 'annual';
          const inferredProduct: EcosystemProduct =
            (docData.product as EcosystemProduct) ||
            (d.id.includes('estiasi') || d.id.includes('coffee') ? 'Estiasi Hub' : 'Market Engine POS');

          const base: ClientSubscription = {
            id: d.id,
            clientName,
            taxNumber: isTrialOrDemo ? '' : (docData.afm || docData.taxNumber || ''),
            appSlug: slug,
            contactEmail: docData.contactEmail || '',
            contactPhone: docData.phone || docData.contactPhone || '',
            product: inferredProduct,
            tier: mappedTier,
            status: mappedStatus,
            interval: (docData.interval as BillingInterval) || (isAnnual ? 'annual' : 'monthly'),
            amount: Number(docData.amount ?? 0),
            seats: Number(docData.seats ?? 1),
            trialStartsOnFirstOpen: Boolean(nestedSub.trialStartsOnFirstOpen),
            startDate: nestedSub.activatedAt ? nestedSub.activatedAt.split('T')[0] : (docData.startDate || new Date().toISOString().split('T')[0]),
            nextBillingDate,
            autoRenew: docData.autoRenew ?? true,
            licenseKey: nestedSub.licenseKey || docData.licenseKey || `LIC-${d.id.toUpperCase()}`,
            notes: docData.notes || ''
          };

          return this.enrichSubscription(base);
        });

        this.firestoreSubscriptions.set(mapped);
      }, (err) => {
        console.error('[Firestore Stream Error]:', err);
      });
    } catch (err) {
      console.error('[Firestore Init Exception]:', err);
    }
  }

  // --- Cloudflare Worker KV Gateway (Invoice Pro) ---
  loadInvoiceProSubscriptions(): void {
    const gateway = environment.invoiceProGateway;
    if (!gateway?.url || !gateway?.adminKey) return;

    const cleanUrl = gateway.url.replace(/\/+$/, '');
    const headers = new HttpHeaders({ 'x-admin-key': gateway.adminKey });

    this.http.get<{ success: boolean; subscriptions: any[] }>(
      `${cleanUrl}/admin/subscriptions`,
      { headers }
    ).subscribe({
      next: (res) => {
        if (res?.success && Array.isArray(res.subscriptions)) {
          const mapped = res.subscriptions.map(s => {
            const now = new Date();
            const validUntil = s.validUntil ? new Date(s.validUntil) : new Date('2099-12-31T23:59:59Z');
            const isPastExpiry = s.validUntil && now > validUntil;

            let status: SubscriptionStatus = 'active';
            if (s.status === 'SUSPENDED') status = 'canceled';
            else if (s.status === 'READ_ONLY') status = 'grace_period';
            else if (isPastExpiry) status = 'past_due';

            const base: ClientSubscription = {
              id: `inv-${s.afm}`,
              clientName: s.clientName || `Τιμολόγιο (${s.afm})`,
              taxNumber: s.afm,
              appSlug: `invoice-${s.afm}`,
              contactEmail: `${s.afm}@maranth.gr`,
              product: 'Maranth Invoice Pro',
              tier: 'enterprise',
              status,
              interval: 'annual',
              amount: s.amount ?? 99,
              startDate: s.updatedAt ? s.updatedAt.split('T')[0] : '2026-01-01',
              nextBillingDate: s.validUntil ? s.validUntil.split('T')[0] : '2099-12-31',
              licenseKey: `INV-${s.afm}`,
              seats: s.seats || 1,
              autoRenew: true
            };

            return this.enrichSubscription(base);
          });

          this.invoiceProStores.set(mapped);
        }
      },
      error: (err) => console.error('[InvoicePro Gateway] Fetch error:', err)
    });
  }

  // --- Status Toggle / Suspend (Syncs Firestore + Cloudflare KV AFM) ---
  async updateStatus(id: string, newStatus: SubscriptionStatus): Promise<void> {
    if (id.startsWith('inv-')) {
      const afm = id.replace('inv-', '');
      const statusPayload = newStatus === 'active' || newStatus === 'trial' ? 'ACTIVE' : 'SUSPENDED';
      await this.syncAfmToCloudflareKv({ afm, status: statusPayload });
    } else {
      if (!this.firestore) return;

      const isActive = newStatus === 'active' || newStatus === 'trial';
      const statusString = newStatus === 'trial'
        ? 'TRIAL'
        : (isActive ? 'ACTIVE' : (newStatus === 'past_due' ? 'EXPIRED' : 'SUSPENDED'));

      const docRef = doc(this.firestore, 'tenants', id);

      await updateDoc(docRef, {
        isActive,
        status: statusString,
        'subscription.status': statusString,
        updatedAt: new Date().toISOString()
      });

      const existing = this.firestoreSubscriptions().find(s => s.id === id);
      if (existing?.taxNumber) {
        await this.syncAfmToCloudflareKv({
          afm: existing.taxNumber,
          status: isActive ? 'ACTIVE' : 'SUSPENDED'
        });
      }
    }
  }

  // --- Extend / Renew Subscription Validity ---
  async renewSubscription(id: string, newValidUntilDate: string, interval: BillingInterval = 'monthly'): Promise<void> {
    if (!this.firestore || id.startsWith('inv-')) return;

    const docRef = doc(this.firestore, 'tenants', id);
    const validUntilIso = `${newValidUntilDate}T23:59:59Z`;
    const tierString = interval === 'annual' ? 'PAID_ANNUAL' : 'PAID_MONTHLY';

    await updateDoc(docRef, {
      isActive: true,
      status: 'ACTIVE',
      interval,
      nextBillingDate: newValidUntilDate,
      'subscription.status': 'ACTIVE',
      'subscription.tier': tierString,
      'subscription.validUntil': validUntilIso,
      updatedAt: new Date().toISOString()
    });

    const existing = this.firestoreSubscriptions().find(s => s.id === id);
    if (existing?.taxNumber) {
      await this.syncAfmToCloudflareKv({
        afm: existing.taxNumber,
        status: 'ACTIVE',
        validUntil: validUntilIso
      });
    }
  }

  // --- Edit / Update Existing Client Subscription (Firestore + Cloudflare KV) ---
  async updateSubscription(id: string, sub: Omit<ClientSubscription, 'id'>): Promise<void> {
    const validUntilIso = sub.nextBillingDate
      ? `${sub.nextBillingDate}T23:59:59Z`
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const isActive = sub.status === 'active' || sub.status === 'trial';

    // 1. Standalone Invoice Pro (Cloudflare KV)
    if (id.startsWith('inv-')) {
      const afm = id.replace('inv-', '') || sub.taxNumber;
      if (afm) {
        await this.syncAfmToCloudflareKv({
          afm,
          clientName: sub.clientName,
          tier: sub.tier.toUpperCase(),
          status: isActive ? 'ACTIVE' : 'SUSPENDED',
          validUntil: validUntilIso
        });
      }
      return;
    }

    // 2. Unified Tenant Document (/tenants/{id})
    if (!this.firestore) return;

    const docRef = doc(this.firestore, 'tenants', id);
    const nowIso = new Date().toISOString();
    const isPublicDemo = sub.tier === 'public_demo_7d';
    const isTrial = isPublicDemo || sub.tier === 'trial_7d';
    const startsOnFirstOpen = Boolean(sub.trialStartsOnFirstOpen && sub.tier === 'trial_7d');
    const cleanAfm = isTrial ? '' : (sub.taxNumber || '');
    const statusString = isTrial ? 'TRIAL' : (isActive ? 'ACTIVE' : 'SUSPENDED');
    const ecosystemTier = this.resolveEcosystemTier(sub.tier, sub.interval, sub.status);

    await updateDoc(docRef, {
      name: sub.clientName,
      clientName: sub.clientName,
      afm: cleanAfm,
      taxNumber: cleanAfm,
      doy: (sub as any).doy || '',
      address: (sub as any).address || '',
      phone: sub.contactPhone || '',
      contactPhone: sub.contactPhone || '',
      contactEmail: sub.contactEmail || '',
      product: sub.product,
      plan: (sub.tier || 'ENTERPRISE').toUpperCase(),
      status: statusString,
      isActive,
      interval: sub.interval,
      amount: Number(sub.amount || 0),
      seats: Number(sub.seats || 1),
      autoRenew: Boolean(sub.autoRenew),
      nextBillingDate: sub.nextBillingDate,
      'subscription.tier': ecosystemTier,
      'subscription.status': statusString,
      'subscription.validUntil': (startsOnFirstOpen || isPublicDemo) ? null : validUntilIso,
      'subscription.trialStartsOnFirstOpen': startsOnFirstOpen,
      updatedAt: nowIso
    });

    if (cleanAfm) {
      await this.syncAfmToCloudflareKv({
        afm: cleanAfm,
        clientName: sub.clientName,
        tier: 'RETAIL_SHOP',
        status: isActive ? 'ACTIVE' : 'SUSPENDED',
        validUntil: validUntilIso
      });
    }
  }

  // --- Delete Client / License ---
  async removeSubscription(id: string): Promise<void> {
    if (id.startsWith('inv-')) {
      const afm = id.replace('inv-', '');
      const gateway = environment.invoiceProGateway;
      if (!gateway?.url) return;

      const cleanUrl = gateway.url.replace(/\/+$/, '');
      const headers = new HttpHeaders({ 'x-admin-key': gateway.adminKey });

      this.http.delete(`${cleanUrl}/admin/subscription/${afm}`, { headers }).subscribe({
        next: () => this.loadInvoiceProSubscriptions()
      });
    } else {
      if (!this.firestore) return;
      const docRef = doc(this.firestore, 'tenants', id);
      await deleteDoc(docRef);
    }
  }

  // --- Create Client / License (Unified Multi-App Payload + Default Manager + KV Bridge) ---
  async createSubscription(sub: Omit<ClientSubscription, 'id'>): Promise<void> {
    const validUntilIso = sub.nextBillingDate
      ? `${sub.nextBillingDate}T23:59:59Z`
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const isActive = sub.status === 'active' || sub.status === 'trial';

    // 1. Branch for Maranth Invoice Pro (Standalone KV Gateway)
    if (sub.product === 'Maranth Invoice Pro' && sub.taxNumber) {
      await this.syncAfmToCloudflareKv({
        afm: sub.taxNumber,
        clientName: sub.clientName,
        tier: sub.tier.toUpperCase(),
        status: isActive ? 'ACTIVE' : 'SUSPENDED',
        validUntil: validUntilIso
      });
      return;
    }

    // 2. Branch for Market Engine POS, Maranth Hub & Estiasi Hub (Firestore /tenants/{slug})
    if (!this.firestore) {
      console.error('[createSubscription] Firestore instance is not initialized.');
      return;
    }

    const rawSlug = sub.appSlug?.trim();
    const isAutoGenerated = !rawSlug || rawSlug.startsWith('tenant-');
    const slug = (isAutoGenerated ? this.generateSlug(sub.clientName) : rawSlug).toLowerCase();

    const docRef = doc(this.firestore, 'tenants', slug);
    const nowIso = new Date().toISOString();
    const startDate = sub.startDate || nowIso.split('T')[0];
    const nextBillingDate = sub.nextBillingDate || validUntilIso.split('T')[0];

    const statusString = sub.status === 'trial' ? 'TRIAL' : (isActive ? 'ACTIVE' : 'SUSPENDED');
    const ecosystemTier = this.resolveEcosystemTier(sub.tier, sub.interval, sub.status);
    const licenseKey = sub.licenseKey?.trim() || `LIC-${slug.toUpperCase()}`;

    const startsOnFirstOpen = Boolean(sub.trialStartsOnFirstOpen && sub.tier === 'trial_7d');
    const isPublicDemo = sub.tier === 'public_demo_7d';
    const cleanAfm = (isPublicDemo || sub.tier === 'trial_7d') ? '' : (sub.taxNumber || '');

    const payload = {
      // Maranth POS & Maranth Hub Identity Fields
      code: slug,
      name: sub.clientName,
      afm: cleanAfm,
      doy: (sub as any).doy || '',
      address: (sub as any).address || '',
      phone: sub.contactPhone || '',
      isActive,
      allowStoreSwitch: false,

      // Unified Nested Subscription Object (Consumed by POS pre-flight & Hub guard)
      subscription: {
        tier: ecosystemTier,
        status: statusString,
        activatedAt: (startsOnFirstOpen || isPublicDemo) ? null : `${startDate}T00:00:00Z`,
        validUntil: (startsOnFirstOpen || isPublicDemo) ? null : `${nextBillingDate}T23:59:59Z`,
        trialStartsOnFirstOpen: startsOnFirstOpen,
        licenseKey
      },

      // Estiasi POS & Legacy Routing Compatibility Fields
      shopSlug: slug,
      tenantId: slug,
      storeId: slug,
      plan: (sub.tier || 'ENTERPRISE').toUpperCase(),
      status: statusString,

      // Admin Dashboard Billing Metadata
      clientName: sub.clientName,
      taxNumber: cleanAfm,
      contactEmail: sub.contactEmail || '',
      contactPhone: sub.contactPhone || '',
      seats: Number(sub.seats || 1),
      autoRenew: Boolean(sub.autoRenew),
      amount: Number(sub.amount || 0),
      interval: sub.interval || 'monthly',
      startDate,
      nextBillingDate,
      licenseKey,
      product: sub.product || 'Market Engine POS',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const defaultManagerId = `emp_${slug}_1111`;
    const defaultManagerPayload = {
      id: defaultManagerId,
      tenantId: slug,
      storeId: slug,
      name: `${sub.clientName} Manager`,
      pin: '1111',
      pinCode: '1111',
      role: 'MANAGER',
      hourlyRate: 0,
      isActive: true,
      createdAt: nowIso
    };

    await Promise.all([
      setDoc(docRef, payload, { merge: true }),
      setDoc(doc(this.firestore, 'employees', defaultManagerId), defaultManagerPayload, { merge: true })
    ]);

    console.log(`[createSubscription] Provisioned unified tenant & default manager: /tenants/${slug}`);

    // 3. Register the store's 9-digit AFM in Cloudflare KV so Maranth Hub (Timologio) works out of the box
    if (cleanAfm) {
      await this.syncAfmToCloudflareKv({
        afm: cleanAfm,
        clientName: sub.clientName,
        tier: 'RETAIL_SHOP',
        status: isActive ? 'ACTIVE' : 'SUSPENDED',
        validUntil: `${nextBillingDate}T23:59:59Z`
      });
    }
  }
}