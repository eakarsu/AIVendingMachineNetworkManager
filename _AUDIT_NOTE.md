# Audit Recommendations & Status — AIVendingMachineNetworkManager

Source: /Users/erolakarsu/projects/_AUDIT/reports/batch_08.md (section 24)

## Original audit recommendations

Missing AI:
- Demand forecasting
- Route optimization
- Dynamic pricing
- Predictive maintenance

Missing non-AI:
- Payment processor integration (Square, NCR)
- Cashless payment tracking
- Supplier integration for auto-ordering
- Real-time location tracking

Custom feature ideas:
- AI demand forecaster
- Route optimizer
- Dynamic pricing
- Predictive maintenance
- Theft detection from anomalies

## Implemented in this pass (MECHANICAL)

Created `backend/src/routes/ai.js` and registered under `/api/ai` in `server.js`. Reuses `callAI` (services/openrouter.js), `aiRateLimiter`, and `authenticateToken`. Persists to `ai_results` via `persistAIResult`.

- `POST /api/ai/demand-forecast` — forecast next-N-day product demand per machine.
- `POST /api/ai/dynamic-pricing` — price recommendations respecting margin floor.
- `POST /api/ai/predictive-maintenance` — risk score and preventive actions from telemetry/history.

## Backlog

1. Route optimization endpoint — straightforward to add but better fit if combined with map/distance-matrix; deferred until route data shape confirmed.
2. Theft / anomaly detection (cash-vs-sales reconciliation) — needs richer data model.
3. Payment processor integrations (Square, NCR) — credentials decision.
4. Supplier auto-ordering — needs supplier integration spec.
5. Real-time location tracking — IoT/MQTT decision.

## Apply pass 3 (frontend)

- Verified: `frontend/src/App.jsx` has dedicated routes for the three new AI endpoints:
  - `/ai/demand-forecast` → `pages/DemandForecast.jsx`
  - `/ai/dynamic-pricing` → `pages/DynamicPricingV2.jsx`
  - `/ai/predictive-maintenance` → `pages/PredictiveMaintenanceV2.jsx`
- `frontend/src/api.js` exposes wrappers (`aiDemandForecast`, `aiDynamicPricing`, `aiPredictiveMaintenanceV2`) that hit the matching backend endpoints with bearer-token auth from `localStorage`.
- **Action: LEFT-AS-IS** — frontend is fully wired for all backend AI endpoints added in pass 2.

## Apply pass 4 (mechanical backlog)

Implemented `route-optimization` (backlog item 1):

- BE (`backend/src/routes/ai.js`): `POST /api/ai/route-optimization` accepts a `machines` array plus optional `startLocation`, `vehicleConstraints`, and `objectives`; the system prompt asks for an ordered stops list with rationale, totalEstimatedMinutes, skippedMachines, and a summary. Explicit 503 returned when `OPENROUTER_API_KEY` is unset (the existing `callAI` helper otherwise returns demo content).
- FE: new `frontend/src/pages/RouteOptimization.jsx` with JSON textarea for machines, start location, vehicle-constraint JSON, and objectives. Reuses existing `AIOutput` and Tailwind classes from siblings (`DemandForecast.jsx`). New `aiRouteOptimization` helper in `frontend/src/api.js` (bearer token via `localStorage`). Wired into `App.jsx` (`/ai/route-optimization`) and the sidebar in `components/Layout.jsx`.
- Syntax: `node --check` PASS; `@babel/parser` PASS on all touched JSX.

Items still skipped: theft / anomaly detection (richer data model required), payment processor integrations (NEEDS-CREDS), supplier auto-ordering (NEEDS-INTEGRATION-SPEC), real-time location tracking (IoT/MQTT decision).

## Apply pass 5 (all backlog)

Added 5 backlog endpoints (mix of MECHANICAL and NEEDS-CREDS).

- BE (`backend/src/routes/ai.js`):
  - `POST /api/ai/anomaly-detection` — theft / cash-vs-sales / tamper signal AI scoring (503 + `missing: OPENROUTER_API_KEY` when no key).
  - `POST /api/ai/payment-square` (NEEDS-CREDS: SQUARE_ACCESS_TOKEN) — records link in new `payment_provider_links` table.
  - `POST /api/ai/payment-ncr` (NEEDS-CREDS: NCR_API_KEY) — records link in `payment_provider_links`.
  - `POST /api/ai/supplier-order` — queues into new `supplier_orders` table (PRODUCT-DECISION: external EDI/REST submission deferred).
  - `POST /api/ai/location-tracking` (NEEDS-CREDS: IOT_BROKER_URL + IOT_BROKER_TOKEN) — registers a subscription in `iot_subscriptions`.
- FE: new pages `AnomalyDetection.jsx` and `Integrations.jsx` (tabs: Square, NCR, Supplier, IoT). 5 new wrappers in `frontend/src/api.js`. Routes wired in `App.jsx`; sidebar entries in `Layout.jsx`.
- Syntax: `node --check` PASS; `@babel/parser` PASS on all JSX.
