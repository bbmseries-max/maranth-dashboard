import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubscriptionService } from '../../../core/services/subscription.service';
import {
  ClientSubscription,
  ClientSubscriptionComputed,
  SubscriptionMetrics,
  EcosystemProduct,
  SubscriptionTier,
  SubscriptionStatus,
  BillingInterval
} from '../../../core/models/subscription.model';

function toSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\u0370-\u03ff-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function addDaysIsoDate(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

@Component({
  selector: 'app-subscriptions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './subscription-list.html',
  styleUrls: ['./subscription-list.scss']
})
export class SubscriptionComponent {
  readonly subService = inject(SubscriptionService);

  // Filters
  readonly selectedProduct = signal<EcosystemProduct | 'all'>('all');
  readonly selectedStatus = signal<SubscriptionStatus | 'all'>('all');

  editingSubId: string | null = null;
  editingLicenseKey = '';
  editingStartDate = '';

  // Modal Form State
  isModalOpen = false;
  newClientName = '';
  newAppSlug = '';
  slugManuallyEdited = false;
  newTaxNumber = '';
  newDoy = '';
  newAddress = '';
  newContactPhone = '';
  newContactEmail = '';
  newProduct: EcosystemProduct = 'Market Engine POS';
  newTier: SubscriptionTier = 'enterprise';
  newInterval: BillingInterval = 'annual';
  newAmount = 99;
  newSeats = 1;
  newNextBillingDate = addDaysIsoDate(365);
  newAutoRenew = true;
  newTrialStartsOnFirstOpen = true;

  // 1. Filtered Data for Template @for loop
  readonly subscriptions = computed<ClientSubscriptionComputed[]>(() => {
    const list = this.subService.allSubscriptions();
    const prod = this.selectedProduct();
    const stat = this.selectedStatus();

    return list.filter(sub => {
      const matchesProduct = prod === 'all' || sub.product === prod;
      const matchesStatus = stat === 'all' || sub.status === stat;
      return matchesProduct && matchesStatus;
    });
  });

  // 2. Metrics conforming strictly to SubscriptionMetrics contract
  readonly metrics = computed<SubscriptionMetrics>(() => {
    const list = this.subService.allSubscriptions();

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

  setProductFilter(prod: EcosystemProduct | 'all'): void {
    this.selectedProduct.set(prod);
  }

  setStatusFilter(stat: SubscriptionStatus | 'all'): void {
    this.selectedStatus.set(stat);
  }

  toggleStatus(id: string, currentStatus: SubscriptionStatus): void {
    const nextStatus: SubscriptionStatus = currentStatus === 'active' || currentStatus === 'trial' ? 'canceled' : 'active';
    this.subService.updateStatus(id, nextStatus);
  }

  onClientNameChange(name: string): void {
    this.newClientName = name;
    if (!this.slugManuallyEdited) {
      this.newAppSlug = toSlug(name);
    }
  }

  onAppSlugChange(slug: string): void {
    this.slugManuallyEdited = true;
    this.newAppSlug = toSlug(slug);
  }

  onTierChange(tier: SubscriptionTier): void {
    this.newTier = tier;
    if (tier === 'trial_7d' || tier === 'public_demo_7d') {
      this.newAmount = 0;
      this.newAutoRenew = false;
      this.newNextBillingDate = tier === 'public_demo_7d' ? '2030-01-01' : addDaysIsoDate(7);
      this.newTrialStartsOnFirstOpen = tier === 'trial_7d';
    } else {
      if (this.newAmount === 0) {
        this.newAmount = this.newInterval === 'annual' ? 99 : 19;
      }
      this.newAutoRenew = true;
      this.newTrialStartsOnFirstOpen = false;
      this.newNextBillingDate = addDaysIsoDate(this.newInterval === 'annual' ? 365 : 30);
    }
  }

  openModal(): void {
    this.editingSubId = null;
    this.editingLicenseKey = '';
    this.editingStartDate = '';
    this.newClientName = '';
    this.newAppSlug = '';
    this.slugManuallyEdited = false;
    this.newTaxNumber = '';
    this.newDoy = '';
    this.newAddress = '';
    this.newContactPhone = '';
    this.newContactEmail = '';
    this.newTier = 'enterprise';
    this.newAmount = 99;
    this.newSeats = 1;
    this.newNextBillingDate = addDaysIsoDate(365);
    this.newAutoRenew = true;
    this.newTrialStartsOnFirstOpen = false;
    this.isModalOpen = true;
  }

  openEditModal(sub: ClientSubscriptionComputed): void {
    this.editingSubId = sub.id;
    this.editingLicenseKey = sub.licenseKey;
    this.editingStartDate = sub.startDate;
    this.newClientName = sub.clientName;
    this.newAppSlug = sub.appSlug || sub.id;
    this.slugManuallyEdited = true;
    this.newTaxNumber = sub.taxNumber || '';
    this.newDoy = sub.doy || '';
    this.newAddress = sub.address || '';
    this.newContactPhone = sub.contactPhone || '';
    this.newContactEmail = sub.contactEmail || '';
    this.newProduct = sub.product;
    this.newTier = sub.tier;
    this.newInterval = sub.interval;
    this.newAmount = sub.amount;
    this.newSeats = sub.seats || 1;
    this.newNextBillingDate = sub.nextBillingDate;
    this.newAutoRenew = sub.autoRenew;
    this.newTrialStartsOnFirstOpen = Boolean(sub.trialStartsOnFirstOpen);
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveClient(): void {
    const cleanSlug = toSlug(this.newAppSlug || this.newClientName);
    const isTrial = this.newTier === 'trial_7d' || this.newTier === 'public_demo_7d';
    const cleanAfm = isTrial
      ? ''
      : this.newTaxNumber.replace(/^el/i, '').replace(/\s+/g, '').trim();

    const payload: Omit<ClientSubscription, 'id'> = {
      clientName: this.newClientName.trim(),
      appSlug: cleanSlug,
      taxNumber: cleanAfm,
      doy: this.newDoy.trim(),
      address: this.newAddress.trim(),
      contactPhone: this.newContactPhone.trim(),
      contactEmail: this.newContactEmail.trim() || `${cleanSlug}@maranth.gr`,
      product: this.newProduct,
      tier: this.newTier,
      status: isTrial ? 'trial' : 'active',
      interval: this.newInterval,
      amount: this.newAmount,
      startDate: this.editingStartDate || new Date().toISOString().split('T')[0],
      nextBillingDate: this.newNextBillingDate,
      trialExpiresAt: isTrial ? this.newNextBillingDate : undefined,
      trialStartsOnFirstOpen: this.newTier === 'trial_7d' ? this.newTrialStartsOnFirstOpen : false,
      licenseKey:
        this.editingLicenseKey ||
        `${this.newProduct.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      seats: this.newSeats,
      autoRenew: this.newAutoRenew
    };

    if (this.editingSubId) {
      this.subService.updateSubscription(this.editingSubId, payload);
    } else {
      this.subService.createSubscription(payload);
    }

    this.closeModal();
  }

  onIntervalChange(interval: BillingInterval): void {
    this.newInterval = interval;
    if (this.newTier !== 'trial_7d' && this.newTier !== 'public_demo_7d') {
      this.newNextBillingDate = addDaysIsoDate(interval === 'annual' ? 365 : 30);
    }
  }
}