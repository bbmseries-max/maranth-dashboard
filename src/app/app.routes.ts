import { Routes } from '@angular/router';


export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'subscriptions'
  },
  {
    path: 'subscriptions',
    loadComponent: () =>
      import('./features/subscriptions/subscription-list/subscription-list').then(
        m => m.SubscriptionComponent
      ),
    title: 'Maranth • Subscriptions & Licensing'
  },
  {
    path: 'horizon',
    loadComponent: () =>
      import('./features/horizon/horizon-radar/horizon-radar').then(
        m => m.HorizonRadarComponent
      ),
    title: 'Maranth • Horizon Radar'
  },
  {
    path: 'health',
    loadComponent: () =>
      import('./features/health/health-view/health-view').then(
        m => m.HealthViewComponent
      ),
    title: 'Maranth • Sentry Health Telemetry'
  },
  {
    path: 'actions',
    loadComponent: () =>
      import('./features/action-board/action-board').then(
        m => m.ActionBoardComponent
      ),
    title: 'Maranth • Action Board'
  },
  {
    path: '**',
    redirectTo: 'subscriptions'
  }
];