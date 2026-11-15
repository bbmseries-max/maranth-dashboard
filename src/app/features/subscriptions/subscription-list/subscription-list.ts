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

  // Modal Form State
  isModalOpen = false;
  newClientName = '';
  newTaxNumber = '';
  newContactEmail = '';
  newProduct: EcosystemProduct = 'Maranth Invoice Pro';
  newTier: SubscriptionTier = 'enterprise';
  newInterval: BillingInterval = 'annual';
  newAmount = 99;
  newSeats = 1;
  newNextBillingDate = '2027-08-30';
  newAutoRenew = true;

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
    const nextStatus: SubscriptionStatus = currentStatus === 'active' ? 'canceled' : 'active';
    this.subService.updateStatus(id, nextStatus);
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveClient(): void {
    const newSubscription: Omit<ClientSubscription, 'id'> = {
      clientName: this.newClientName,
      taxNumber: this.newTaxNumber,
      contactEmail: this.newContactEmail || `${this.newTaxNumber}@maranth.gr`,
      product: this.newProduct,
      tier: this.newTier,
      status: 'active',
      interval: this.newInterval,
      amount: this.newAmount,
      startDate: new Date().toISOString().split('T')[0],
      nextBillingDate: this.newNextBillingDate,
      licenseKey: `${this.newProduct.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      seats: this.newSeats,
      autoRenew: this.newAutoRenew
    };

    this.subService.createSubscription(newSubscription);
    this.closeModal();
  }
}