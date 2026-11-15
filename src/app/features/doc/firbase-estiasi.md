# Maranth Dashboard: Integration & Architecture Milestone Report

**Date:** October 25, 2026  
**Status:** Operational (Build: Pass, Proxy: Pass, Firestore: Pass)

---

## 1. Executive Summary & Accomplishments

We resolved all critical build, network proxy, and database permission blockers across the **Maranth Dashboard** Angular application. The application now successfully communicates simultaneously with external monitoring services (Sentry) and operational telemetry stores (Firebase Firestore) without runtime exceptions.

### Key Milestones Achieved:
* **TypeScript & Angular Compiler Cleanup:** Resolved interface mismatches (`SubscriptionTier`, `ClientSubscription`) and fixed property visibility/typecast errors across core data models.
* **Sentry API Integration & CORS Elimination:** Implemented `proxy.conf.json` with path rewriting (`/api/sentry` $\rightarrow$ `https://sentry.io/api/0`) and updated `angular.json` dev-server configurations to bypass origin restrictions during local development.
* **Database Architecture Definition:** Formally clarified the multi-tenant architecture between `maranth-hub` (global registry) and `maranth-estiasi` (operational data).
* **Multi-Tenancy Firestore Registry:** Introduced a clean `/tenants` root-level collection in `maranth-estiasi` that exposes tenant-level metadata without altering existing POS schemas (`sales`, `tables`, `employees`, `vaults`).
* **Firestore Security Hardening:** Restructured security rules in `maranth-estiasi` so explicit collection reads (`allow read: if true`) evaluate before catch-all deny rules, clearing the `FirebaseError: Missing or insufficient permissions` error.
* **Live Realtime Table Streaming:** Verified dynamic synchronization with live documents (`estiasi-hub-pa`) alongside the perpetual sandbox store (`demo-sandbox`).

---

## 2. Current Architecture Snapshot

                   ┌────────────────────────────────────────┐
                   │           maranth-dashboard            │
                   └───────┬────────────────────────┬───────┘
                           │                        │
                HTTP Proxy │                        │ Firestore WebSocket
             (dev-server)  │                        │ onSnapshot(/tenants)
                           ▼                        ▼
                ┌─────────────────────┐  ┌─────────────────────┐
                │      Sentry.io      │  │   maranth-estiasi   │
                │   Issue Monitoring  │  │  Multi-tenant Store │
                │ (estiasi-hub-pa)    │  │      Registry       │
                └─────────────────────┘  └─────────────────────┘

             ## 3. Current Live Data State

| Client & Store Slug | Tier & Seats | Plan & Rate | Renewal Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Estiasi Hub Parnasos** (`estiasi-hub-pa`) | Enterprise (1 seat) | €240/yr (~€20/mo) | 2027-08-30 (309 days) | `ACTIVE` |
| **Maranth Showcase Sandbox** (`demo-sandbox`) | Enterprise (99 seats) | Perpetual Free | 2099-12-31 (Perpetual) | `ACTIVE` |

---

## 4. Recommended Next Additions

When you return from the break, consider prioritizing the following areas:

### High Priority (Operational Readiness)
1. **Dynamic Sentry Status Indicator in the Table:**
   * Wire the existing Sentry HTTP issue status (e.g., Unresolved Issues count / Green-Amber-Red health pill) directly into each table row using `shopSlug`.
2. **Direct POS Application Launcher Button:**
   * Add a direct launcher action (`posUrl`) linking to `https://pos.maranth.gr/pos?shop=estiasi-hub-pa` with appropriate auth token/session context.
3. **Tenant Details Slide-over / Modal:**
   * Clicking a store row opens a detail panel displaying live counts from `maranth-estiasi` (e.g., active shifts, open tables, today's sales totals).

### Medium Priority (Business & License Controls)
4. **License Key Generator & Renewal Actions:**
   * Implement UI actions for the `Suspend`, `Extend`, and `Activate` buttons to write status changes back to `/tenants/{tenantId}` in Firestore with confirmation dialogs.
5. **Real-time Filter & Search Bar:**
   * Connect the product filter dropdown (`All`, `Estiasi Hub`, `Market Engine POS`, `Invoice Pro`) and status chips (`Active`, `Trial`, `Past Due`) to filter the live table reactively.

### Low Priority / Polish
6. **Dark/Light Theme Polish & Responsive Layout:**
   * Ensure dashboard cards scale cleanly onto tablet/mobile screens for on-the-go ops checking.   