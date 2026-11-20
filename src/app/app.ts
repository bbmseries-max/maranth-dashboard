import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { environment } from '../environments/environment';
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
export class AppComponent implements OnInit {
  private readonly subService = inject(SubscriptionService);
  private readonly horizonService = inject(HorizonService);
  private readonly healthService = inject(SentryHealthService);
  private readonly actionService = inject(ActionBoardService);

  // Live badge signals
  readonly subMetrics = this.subService.metrics;
  readonly horizonMetrics = this.horizonService.metrics;
  readonly healthOverview = this.healthService.healthOverview;
  readonly actionMetrics = this.actionService.metrics;

  readonly isAuthReady = signal(false);
  sidebarCollapsed = false;

  ngOnInit(): void {
    const app = getApps().length > 0 ? getApp() : initializeApp(environment.firebase.hub);
    const auth = getAuth(app);

    onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          await signInWithEmailAndPassword(
            auth,
            environment.adminAuth.email,
            environment.adminAuth.password
          );
          return; // onAuthStateChanged will fire again once signed in
        }

        // Auth is now active as superadmin -> re-attach Firestore listeners if needed
        if (typeof (this.subService as any).initListeners === 'function') {
          (this.subService as any).initListeners();
        }
        this.isAuthReady.set(true);
      } catch (err) {
        console.error('[Dashboard] Silent admin authentication failed:', err);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
}