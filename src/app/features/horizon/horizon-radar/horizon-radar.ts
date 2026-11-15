import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HorizonService } from '../../../core/services/horizon.service';
import { HorizonCategory, UrgencyLevel, TargetApp } from '../../../core/models/horizon.model';

@Component({
  selector: 'app-horizon-radar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './horizon-radar.html',
  styleUrl: './horizon-radar.scss'
})
export class HorizonRadarComponent {
  readonly horizonService = inject(HorizonService);

  // Expose signals directly to template
  readonly timeline = this.horizonService.filteredTimeline;
  readonly metrics = this.horizonService.metrics;
  readonly selectedCategory = this.horizonService.selectedCategory;
  readonly selectedUrgency = this.horizonService.selectedUrgency;

  // Option lists for templates & filter controls
  readonly categories: (HorizonCategory | 'all')[] = ['all', 'infrastructure', 'compliance', 'subscription', 'security'];
  readonly urgencies: (UrgencyLevel | 'all')[] = ['all', 'critical', 'upcoming', 'normal', 'overdue'];
  readonly targetApps: TargetApp[] = ['maranth.gr', 'Maranth Invoice Pro', 'Market Engine POS', 'Estiasi Hub'];

  // New item modal form state
  isModalOpen = false;
  newItemTitle = '';
  newItemCategory: HorizonCategory = 'infrastructure';
  newItemDueDate = '';
  newItemTargetApp: TargetApp = 'maranth.gr';
  newItemAutoRenews = false;
  newItemCost?: number;
  newItemActionUrl = '';
  newItemNotes = '';

  setCategory(category: HorizonCategory | 'all'): void {
    this.horizonService.updateCategoryFilter(category);
  }

  setUrgency(urgency: UrgencyLevel | 'all'): void {
    this.horizonService.updateUrgencyFilter(urgency);
  }

  deleteItem(id: string): void {
    this.horizonService.removeItem(id);
  }

  openModal(): void {
    const today = new Date().toISOString().split('T')[0];
    this.newItemDueDate = today;
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveItem(): void {
    if (!this.newItemTitle || !this.newItemDueDate) return;

    this.horizonService.addItem({
      title: this.newItemTitle,
      category: this.newItemCategory,
      dueDate: this.newItemDueDate,
      targetApp: this.newItemTargetApp,
      autoRenews: this.newItemAutoRenews,
      cost: this.newItemCost ? Number(this.newItemCost) : undefined,
      actionUrl: this.newItemActionUrl || undefined,
      notes: this.newItemNotes || undefined
    });

    this.resetForm();
    this.closeModal();
  }

  private resetForm(): void {
    this.newItemTitle = '';
    this.newItemCategory = 'infrastructure';
    this.newItemDueDate = '';
    this.newItemTargetApp = 'maranth.gr';
    this.newItemAutoRenews = false;
    this.newItemCost = undefined;
    this.newItemActionUrl = '';
    this.newItemNotes = '';
  }
}