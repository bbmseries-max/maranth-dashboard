import { Injectable, inject, signal, computed } from '@angular/core';
import { SentryApiService, SentryProjectHealth, SentryIssue } from './sentry-api.service';

export interface HealthOverview {
  projects: SentryProjectHealth[];
  systemStatus: 'nominal' | 'degraded' | 'incident';
  totalIssues: number;
  totalUnresolved: number;
  criticalAlerts: number;
}

@Injectable({ providedIn: 'root' })
export class SentryHealthService {
  private readonly sentryApi = inject(SentryApiService);

  readonly orgSlug = this.sentryApi.orgSlug;

  private readonly projectList = signal<SentryProjectHealth[]>([
    {
      id: 'market-engine-pos',
      slug: 'market-engine-pos',
      name: 'Market Engine POS',
      unresolvedCount: 0,
      criticalCount: 0,
      status: 'nominal',
      lastEventTime: 'Nominal'
    },
    {
      id: 'gateway-api',
      slug: 'gateway-api',
      name: 'Gateway API',
      unresolvedCount: 0,
      criticalCount: 0,
      status: 'nominal',
      lastEventTime: 'Nominal'
    },
    {
      id: 'cloud-core',
      slug: 'cloud-core',
      name: 'Cloud Core',
      unresolvedCount: 0,
      criticalCount: 0,
      status: 'nominal',
      lastEventTime: 'Nominal'
    }
  ]);

  readonly recentIssues = signal<SentryIssue[]>([]);
  readonly loading = signal<boolean>(false);

  constructor() {
    this.refreshHealth();
  }

  refreshHealth(): void {
    this.loading.set(true);
    this.sentryApi.fetchHealthOverview().subscribe({
      next: ({ projects, issues }) => {
        if (projects.length > 0) {
          this.projectList.set(projects);
        }
        this.recentIssues.set(issues);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  resolveIssueLocally(issueId: string): void {
    this.recentIssues.update((issues) => issues.filter((i) => i.id !== issueId));
  }

  readonly healthOverview = computed<HealthOverview>(() => {
    const projects = this.projectList();
    const totalIssues = projects.reduce((acc, p) => acc + p.unresolvedCount, 0);
    const criticalAlerts = projects.reduce((acc, p) => acc + p.criticalCount, 0);

    let systemStatus: 'nominal' | 'degraded' | 'incident' = 'nominal';
    if (projects.some((p) => p.status === 'incident')) {
      systemStatus = 'incident';
    } else if (projects.some((p) => p.status === 'degraded')) {
      systemStatus = 'degraded';
    }

    return {
      projects,
      systemStatus,
      totalIssues,
      totalUnresolved: totalIssues,
      criticalAlerts
    };
  });
}