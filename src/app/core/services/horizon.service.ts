import { Injectable, computed, signal } from '@angular/core';
import { HorizonCategory, HorizonItem, HorizonItemComputed, UrgencyLevel } from '../models/horizon.model';

@Injectable({
  providedIn: 'root'
})
export class HorizonService {
  // Master signal seeded with infrastructure & regulatory milestones
  private readonly itemsSignal = signal<HorizonItem[]>([
    {
      id: 'h-1',
      title: 'maranth.gr Domain & TLS Certificate Renewal',
      category: 'infrastructure',
      dueDate: '2026-11-15',
      targetApp: 'maranth.gr',
      autoRenews: true,
      cost: 45,
      actionUrl: 'https://www.papaki.gr',
      notes: 'Auto-debit on primary business card.'
    },
    {
      id: 'h-2',
      title: 'AADE myDATA Annual B2B Format & Token Review',
      category: 'compliance',
      dueDate: '2026-11-28',
      targetApp: 'Maranth Invoice Pro',
      autoRenews: false,
      actionUrl: 'https://mydata.aade.gov.gr',
      notes: 'Verify production API credentials and schema changes.'
    },
    {
      id: 'h-3',
      title: 'Market POS Pilot Client Contract Renewal (Athens Mart)',
      category: 'subscription',
      dueDate: '2026-11-04',
      targetApp: 'Market Engine POS',
      autoRenews: false,
      cost: 180,
      notes: 'Send annual subscription invoice and check hardware health.'
    },
    {
      id: 'h-4',
      title: 'Estiasi Hub Cloud Sync & DB Maintenance',
      category: 'infrastructure',
      dueDate: '2026-12-10',
      targetApp: 'Estiasi Hub',
      autoRenews: true,
      cost: 25,
      notes: 'Verify table state replica & offline IndexedDB sync.'
    }
  ]);

  // Active filter signals
  readonly selectedCategory = signal<HorizonCategory | 'all'>('all');
  readonly selectedUrgency = signal<UrgencyLevel | 'all'>('all');

  // Read-only raw items
  readonly items = this.itemsSignal.asReadonly();

  // Computed timeline with countdowns and urgency categorization
  readonly timeline = computed<HorizonItemComputed[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.itemsSignal()
      .map(item => {
        const [year, month, day] = item.dueDate.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day);
        targetDate.setHours(0, 0, 0, 0);

        const diffMs = targetDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let urgency: UrgencyLevel = 'normal';
        if (daysRemaining < 0) {
          urgency = 'overdue';
        } else if (daysRemaining <= 7) {
          urgency = 'critical';
        } else if (daysRemaining <= 30) {
          urgency = 'upcoming';
        }

        return {
          ...item,
          daysRemaining,
          urgency
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  });

  // Filtered view matching active UI selections
  readonly filteredTimeline = computed<HorizonItemComputed[]>(() => {
    const category = this.selectedCategory();
    const urgency = this.selectedUrgency();

    return this.timeline().filter(item => {
      const matchCategory = category === 'all' || item.category === category;
      const matchUrgency = urgency === 'all' || item.urgency === urgency;
      return matchCategory && matchUrgency;
    });
  });

  // Top metric counters for the executive summary row
  readonly metrics = computed(() => {
    const all = this.timeline();
    return {
      total: all.length,
      overdueCount: all.filter(i => i.urgency === 'overdue').length,
      criticalCount: all.filter(i => i.urgency === 'critical').length,
      upcomingCount: all.filter(i => i.urgency === 'upcoming').length,
      monthlyCommittedCost: all
        .filter(i => i.daysRemaining >= 0 && i.daysRemaining <= 30 && i.cost)
        .reduce((sum, i) => sum + (i.cost || 0), 0)
    };
  });

  // Actions
  addItem(item: Omit<HorizonItem, 'id'>): void {
    const newItem: HorizonItem = {
      ...item,
      id: `h-${Date.now()}`
    };
    this.itemsSignal.update(items => [...items, newItem]);
  }

  removeItem(id: string): void {
    this.itemsSignal.update(items => items.filter(i => i.id !== id));
  }

  updateCategoryFilter(category: HorizonCategory | 'all'): void {
    this.selectedCategory.set(category);
  }

  updateUrgencyFilter(urgency: UrgencyLevel | 'all'): void {
    this.selectedUrgency.set(urgency);
  }
}