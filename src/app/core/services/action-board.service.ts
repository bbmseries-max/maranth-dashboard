import { Injectable, computed, signal } from '@angular/core';
import { ActionBoardMetrics, LinearIssue, LinearPriority, LinearStatus, LinearTargetApp } from '../models/action-board.model';

@Injectable({
  providedIn: 'root'
})
export class ActionBoardService {
  // Master reactive issue list
  private readonly issuesSignal = signal<LinearIssue[]>([
    {
      id: 'lin-1',
      identifier: 'MAR-104',
      title: '[P0] Market POS IndexedDB transaction failure on offline sync',
      priority: 'urgent',
      status: 'triage',
      project: 'Market Engine POS',
      assignee: 'Robert Cuko',
      source: 'sentry',
      createdAt: 'Today at 11:45',
      url: 'https://linear.app'
    },
    {
      id: 'lin-2',
      identifier: 'MAR-98',
      title: 'AADE myDATA token rotation auto-renew handler',
      priority: 'high',
      status: 'todo',
      project: 'Maranth Invoice Pro',
      assignee: 'Robert Cuko',
      source: 'manual',
      createdAt: 'Yesterday',
      url: 'https://linear.app'
    },
    {
      id: 'lin-3',
      identifier: 'MAR-87',
      title: 'Estiasi Hub table state socket reconnect backoff',
      priority: 'medium',
      status: 'in_progress',
      project: 'Estiasi Hub',
      assignee: 'Robert Cuko',
      source: 'manual',
      createdAt: '2 days ago',
      url: 'https://linear.app'
    }
  ]);

  readonly selectedStatus = signal<LinearStatus | 'all'>('all');
  readonly selectedProject = signal<LinearTargetApp | 'all'>('all');

  readonly issues = this.issuesSignal.asReadonly();

  // Filtered view matching board selections
  readonly filteredIssues = computed<LinearIssue[]>(() => {
    const stat = this.selectedStatus();
    const proj = this.selectedProject();

    return this.issuesSignal().filter(issue => {
      const matchStatus = stat === 'all' || issue.status === stat;
      const matchProject = proj === 'all' || issue.project === proj;
      return matchStatus && matchProject;
    });
  });

  // Executive Action Board metrics
  readonly metrics = computed<ActionBoardMetrics>(() => {
    const all = this.issuesSignal();
    const active = all.filter(i => i.status !== 'done' && i.status !== 'canceled');

    return {
      totalActive: active.length,
      urgentCount: active.filter(i => i.priority === 'urgent').length,
      triageCount: active.filter(i => i.status === 'triage').length,
      todoCount: active.filter(i => i.status === 'todo').length,
      inProgressCount: active.filter(i => i.status === 'in_progress').length,
      sentryP0Count: active.filter(i => i.source === 'sentry' && i.priority === 'urgent').length
    };
  });

  // State actions
  updateIssueStatus(id: string, newStatus: LinearStatus): void {
    this.issuesSignal.update(issues =>
      issues.map(i => (i.id === id ? { ...i, status: newStatus } : i))
    );
  }

  addIssue(issue: Omit<LinearIssue, 'id' | 'identifier' | 'createdAt' | 'url'>): void {
    const nextNum = Math.floor(100 + Math.random() * 900);
    const newIssue: LinearIssue = {
      ...issue,
      id: `lin-${Date.now()}`,
      identifier: `MAR-${nextNum}`,
      createdAt: 'Just now',
      url: 'https://linear.app'
    };
    this.issuesSignal.update(issues => [newIssue, ...issues]);
  }

  setStatusFilter(status: LinearStatus | 'all'): void {
    this.selectedStatus.set(status);
  }

  setProjectFilter(project: LinearTargetApp | 'all'): void {
    this.selectedProject.set(project);
  }
}