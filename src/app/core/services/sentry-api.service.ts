import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface SentryIssue {
  id: string;
  title: string;
  culprit?: string;
  count: number;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
  level: 'info' | 'warning' | 'error' | 'fatal';
  projectSlug: string;
  permalink?: string;
}

export interface SentryProjectHealth {
  id: string;
  slug: string;
  name: string;
  unresolvedCount: number;
  criticalCount: number;
  status: 'nominal' | 'degraded' | 'incident';
  lastSeen?: string;
  lastEventTime?: string;
}

@Injectable({ providedIn: 'root' })
export class SentryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.production 
  ? 'https://sentry.io/api/0' 
  : '/api/sentry';

  readonly orgSlug = environment.sentry?.organizationSlug || 'maranth-corp';

  fetchProjectHealth(projectSlug: string): Observable<{ project: SentryProjectHealth; issues: SentryIssue[] }> {
    const { authToken, organizationSlug } = environment.sentry;

    const fallback: SentryProjectHealth = {
      id: projectSlug,
      slug: projectSlug,
      name: this.formatProjectName(projectSlug),
      unresolvedCount: 0,
      criticalCount: 0,
      status: 'nominal',
      lastEventTime: 'Just now'
    };

    if (!authToken || authToken.includes('YOUR_')) {
      return of({ project: fallback, issues: [] });
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${authToken}`
    });

    const url = `${this.baseUrl}/projects/${organizationSlug}/${projectSlug}/issues/?query=is:unresolved`;

    return this.http.get<any[]>(url, { headers }).pipe(
      map((rawIssues) => {
        const issues: SentryIssue[] = (rawIssues || []).map((raw) => ({
          id: raw.id,
          title: raw.title || raw.metadata?.value || 'Unknown error',
          culprit: raw.culprit || '',
          count: Number(raw.count || 1),
          userCount: Number(raw.userCount || 0),
          firstSeen: raw.firstSeen,
          lastSeen: raw.lastSeen,
          level: (raw.level || 'error') as SentryIssue['level'],
          projectSlug,
          permalink: raw.permalink
        }));

        const unresolvedCount = issues.length;
        const criticalCount = issues.filter((i) => i.level === 'fatal' || i.level === 'error').length;

        let status: 'nominal' | 'degraded' | 'incident' = 'nominal';
        if (criticalCount > 5 || unresolvedCount > 20) {
          status = 'incident';
        } else if (unresolvedCount > 0) {
          status = 'degraded';
        }

        const project: SentryProjectHealth = {
          id: projectSlug,
          slug: projectSlug,
          name: this.formatProjectName(projectSlug),
          unresolvedCount,
          criticalCount,
          status,
          lastSeen: issues[0]?.lastSeen,
          lastEventTime: issues[0]?.lastSeen ? new Date(issues[0].lastSeen).toLocaleTimeString() : 'No recent errors'
        };

        return { project, issues };
      }),
      catchError((err) => {
        console.error(`Sentry query failed for ${projectSlug}:`, err);
        return of({ project: fallback, issues: [] });
      })
    );
  }

  fetchHealthOverview(): Observable<{ projects: SentryProjectHealth[]; issues: SentryIssue[] }> {
    const projects = environment.sentry?.projects || [];
    if (!projects.length) {
      return of({ projects: [], issues: [] });
    }

    return forkJoin(projects.map((slug) => this.fetchProjectHealth(slug))).pipe(
      map((results) => ({
        projects: results.map((r) => r.project),
        issues: results.flatMap((r) => r.issues)
      }))
    );
  }

  private formatProjectName(slug: string): string {
    return slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}