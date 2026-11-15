Telemetry & Incident Pipeline ReferenceProject: Market Engine POS (maranth-estiasi)Status: Verified & OperationalLast Updated: October 23, 20261. Pipeline OverviewAngular POS Client (localhost:4201)
  └─► @sentry/angular SDK (captureException / flush)
        └─► Sentry Ingest (de.sentry.io -> robert-cuko.sentry.io)
              └─► Alert Rule Trigger (Severity / Level Matching)
                    └─► Linear Issue Tracker (Triage Queue: ROB-5)
2. Configuration DetailsSentry CredentialsProject Name: market-engine-posProject ID: 4512295397163088Ingest Host: o4512295315898368.ingest.de.sentry.ioDashboard URL: https://robert-cuko.sentry.io/issues/?project=4512295397163088Active DSN:https://7b7c18852774244b4d1833d9f713323a@o4512295315898368.ingest.de.sentry.io/4512295397163088
Sentry Initialization (src/main.ts)import * as Sentry from '@sentry/angular';

Sentry.init({
  dsn: 'https://7b7c18852774244b4d1833d9f713323a@o4512295315898368.ingest.de.sentry.io/4512295397163088',
  environment: 'development', // Migrate to environment.production for release builds
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
3. Linear Automation & RoutingLinear Team / Workspace: maranthLinear Project: Market Engine POSVerified Test Issue: ROB-5 (linked to Sentry issue MARKET-ENGINE-POS-2)Alert Trigger: Configured in Sentry under Alerts $\rightarrow$ fires Linear ticket creation on new unhandled exceptions.Sync Mode: Bidirectional (resolving in Linear closes the issue in Sentry and vice-versa).4. Pending / Next Steps (Tomorrow)[ ] Remove test crash triggers (throwTestError) from component templates.[ ] Migrate raw DSN strings into Angular environment files (environment.ts / environment.prod.ts).[ ] Re-enable "Filter out events coming from localhost" on Sentry once local testing is finalized.[ ] Fine-tune alert conditions in Sentry to route only severity: p0 / fatal exceptions to Linear triage.