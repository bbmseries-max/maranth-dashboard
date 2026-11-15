import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { SubscriptionService } from './subscription.service';
import { HorizonService } from './horizon.service';
import { SentryHealthService } from './sentry-health.service';
import { ActionBoardService } from './action-board.service';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({}))
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  onSnapshot: vi.fn((_ref, cb) => {
    cb({ empty: true, docs: [] });
    return () => {};
  }),
  doc: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
  addDoc: vi.fn(() => Promise.resolve({ id: 'mock-doc-123' })),
  deleteDoc: vi.fn(() => Promise.resolve())
}));

describe('Maranth Ops Control Core Services Smoke Test', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        SubscriptionService,
        HorizonService,
        SentryHealthService,
        ActionBoardService
      ]
    });
  });

  describe('1. SubscriptionService & Demo Sandbox', () => {
    it('should initialize with perpetual demo sandbox', () => {
      const service = TestBed.inject(SubscriptionService);
      const list = service.computedSubscriptions();
      expect(list.length).toBeGreaterThanOrEqual(1);

      const demo = list.find(s => s.id === 'demo-sandbox');
      expect(demo).toBeDefined();
      expect(demo?.renewalTargetDate).toBe('Perpetual');
      expect(demo?.daysUntilRenewal).toBe(9999);
      expect(demo?.isExpiringSoon).toBe(false);
      expect(demo?.isExpired).toBe(false);
    });

    it('should filter tenants cleanly by product', () => {
      const service = TestBed.inject(SubscriptionService);
      service.setProductFilter('Market Engine POS');
      expect(service.filteredSubscriptions().every(s => s.product === 'Market Engine POS')).toBe(true);
      service.setProductFilter('all');
    });
  });

  describe('2. SentryHealthService', () => {
    it('should calculate system overview status', () => {
      const service = TestBed.inject(SentryHealthService);
      const overview = service.healthOverview();
      expect(overview.projects.length).toBe(3);
      expect(['nominal', 'degraded', 'incident']).toContain(overview.systemStatus);
    });
  });

  describe('3. ActionBoardService', () => {
    it('should advance an issue status', () => {
      const service = TestBed.inject(ActionBoardService);
      const issue = service.issues()[0];
      service.updateIssueStatus(issue.id, 'in_progress');
      const updated = service.issues().find(i => i.id === issue.id);
      expect(updated?.status).toBe('in_progress');
    });
  });

  describe('4. HorizonService', () => {
    it('should report committed costs and critical count', () => {
      const service = TestBed.inject(HorizonService);
      const metrics = service.metrics();
      expect(metrics.total).toBeGreaterThanOrEqual(0);
      expect(metrics.criticalCount).toBeGreaterThanOrEqual(0);
    });
  });
});