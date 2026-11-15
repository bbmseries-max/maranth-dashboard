import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SentryHealthService } from '../../../core/services/sentry-health.service';

@Component({
  selector: 'app-health-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './health-view.html',
  styleUrl: './health-view.scss'
})
export class HealthViewComponent {
  readonly healthService = inject(SentryHealthService);

  readonly overview = this.healthService.healthOverview;
  readonly recentIssues = this.healthService.recentIssues;

  resolveIssue(id: string): void {
    this.healthService.resolveIssueLocally(id);
  }
}