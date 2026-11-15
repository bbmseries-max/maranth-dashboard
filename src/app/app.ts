import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { SubscriptionService } from './core/services/subscription.service';
import { HorizonService } from './core/services/horizon.service';
import { SentryHealthService } from './core/services/sentry-health.service';
import { ActionBoardService } from './core/services/action-board.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent {
  private readonly subService = inject(SubscriptionService);
  private readonly horizonService = inject(HorizonService);
  private readonly healthService = inject(SentryHealthService);
  private readonly actionService = inject(ActionBoardService);

  // Live badge signals
  readonly subMetrics = this.subService.metrics;
  readonly horizonMetrics = this.horizonService.metrics;
  readonly healthOverview = this.healthService.healthOverview;
  readonly actionMetrics = this.actionService.metrics;

  sidebarCollapsed = false;

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}