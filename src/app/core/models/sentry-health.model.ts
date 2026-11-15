export type SystemHealthStatus = 'nominal' | 'degraded' | 'incident';
export type ProjectHealthStatus = 'healthy' | 'warning' | 'critical';

export interface SentryProjectStats {
  id: string;
  name: string;
  slug: string;
  unresolvedCount: number;
  criticalCount: number;
  lastEventTime: string;
  status: ProjectHealthStatus;
}

export interface SentryIssueItem {
  id: string;
  title: string;
  culprit: string;
  projectSlug: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  permalink: string;
  level?: 'fatal' | 'error' | 'warning' | 'info';
}

export interface EcosystemHealthOverview {
  totalUnresolved: number;
  criticalAlerts: number;
  systemStatus: SystemHealthStatus;
  projects: SentryProjectStats[];
}