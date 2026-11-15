// src/app/core/models/horizon.model.ts

export type HorizonCategory = 'infrastructure' | 'compliance' | 'subscription' | 'security' | 'roadmap';
export type UrgencyLevel = 'critical' | 'upcoming' | 'normal' | 'overdue';
export type TargetApp = 'maranth.gr' | 'Maranth Invoice Pro' | 'Market Engine POS' | 'Estiasi Hub';

export interface HorizonItem {
  id: string;
  title: string;
  category: HorizonCategory;
  dueDate: string;               // ISO 'YYYY-MM-DD'
  targetApp: TargetApp;
  autoRenews: boolean;
  cost?: number;
  actionUrl?: string;
  notes?: string;
}

export interface HorizonItemComputed extends HorizonItem {
  daysRemaining: number;
  urgency: UrgencyLevel;
}