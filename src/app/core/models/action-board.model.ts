export type LinearPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';
export type LinearStatus = 'triage' | 'todo' | 'in_progress' | 'done' | 'canceled';
export type LinearTargetApp = 'Maranth Invoice Pro' | 'Market Engine POS' | 'Estiasi Hub' | 'All Ecosystem';

export interface LinearIssue {
  id: string;
  identifier: string;        // e.g., "MAR-12"
  title: string;
  description?: string;
  priority: LinearPriority;
  status: LinearStatus;
  project: LinearTargetApp;
  assignee: string;
  source: 'sentry' | 'manual';
  createdAt: string;
  url: string;
}

export interface ActionBoardMetrics {
  totalActive: number;
  urgentCount: number;
  triageCount: number;
  todoCount: number;
  inProgressCount: number;
  sentryP0Count: number;
}