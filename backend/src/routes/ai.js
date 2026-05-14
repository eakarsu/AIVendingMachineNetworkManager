const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const aiRateLimiter = require('../middleware/aiRateLimiter');
const { callAI, persistAIResult } = require('../services/openrouter');
const pool = require('../db');
const router = express.Router();

// POST /api/ai/demand-forecast
// Forecast demand by machine/product based on recent sales + telemetry
router.post('/demand-forecast', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { machineId, recentSales, currentInventory, location, horizonDays = 7 } = req.body || {};
    const systemPrompt = 'You are a senior demand forecasting analyst for vending operations. Always respond with valid JSON.';
    const prompt = `Forecast demand for the next ${horizonDays} days for vending machine ${machineId || 'unknown'} at ${location || 'unknown location'}.\n\nRecent sales: ${JSON.stringify(recentSales || [])}\nCurrent inventory: ${JSON.stringify(currentInventory || [])}\n\nReturn JSON: { "forecast": [{ "productId": "", "expectedUnits": 0, "stockoutRisk": "low|medium|high", "restockBy": "ISO-date" }], "summary": "" }`;
    const aiResult = await callAI(systemPrompt, prompt);
    await persistAIResult(pool, req.user?.id, 'demand-forecast', { machineId, horizonDays }, aiResult.result);
    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/dynamic-pricing
// Recommend prices based on demand, inventory, seasonality
router.post('/dynamic-pricing', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { products, currentInventory, salesHistory, marginFloorPct = 20 } = req.body || {};
    if (!products) return res.status(400).json({ error: 'products is required' });
    const systemPrompt = 'You are a pricing optimization expert for vending machines. Always respond with valid JSON.';
    const prompt = `Recommend retail prices that respect a margin floor of ${marginFloorPct}%.\n\nProducts: ${JSON.stringify(products)}\nInventory: ${JSON.stringify(currentInventory || [])}\nRecent sales: ${JSON.stringify(salesHistory || [])}\n\nReturn JSON: { "recommendations": [{ "productId": "", "currentPrice": 0, "recommendedPrice": 0, "rationale": "", "expectedRevenueLiftPct": 0 }], "summary": "" }`;
    const aiResult = await callAI(systemPrompt, prompt);
    await persistAIResult(pool, req.user?.id, 'dynamic-pricing', { marginFloorPct }, aiResult.result);
    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/predictive-maintenance
// Predict machine failure risk from telemetry + maintenance history
router.post('/predictive-maintenance', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { machineId, telemetry, maintenanceHistory } = req.body || {};
    const systemPrompt = 'You are an industrial reliability engineer for vending equipment. Always respond with valid JSON.';
    const prompt = `Assess failure risk for vending machine ${machineId || 'unknown'} and recommend preventive actions.\n\nTelemetry: ${JSON.stringify(telemetry || {})}\nMaintenance history: ${JSON.stringify(maintenanceHistory || [])}\n\nReturn JSON: { "riskScore": 0, "riskLevel": "low|medium|high", "topConcerns": ["..."], "recommendedActions": [{ "action": "", "priority": "low|medium|high", "expectedDays": 0 }], "summary": "" }`;
    const aiResult = await callAI(systemPrompt, prompt);
    await persistAIResult(pool, req.user?.id, 'predictive-maintenance', { machineId }, aiResult.result);
    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/route-optimization
// Recommend an efficient service / restock route across a set of machines
router.post('/route-optimization', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
      return res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY to enable AI features.' });
    }
    const { machines, startLocation, vehicleConstraints, objectives = ['minimize-distance', 'priority-stockouts'] } = req.body || {};
    if (!Array.isArray(machines) || machines.length === 0) {
      return res.status(400).json({ error: 'machines array is required' });
    }
    const systemPrompt = 'You are a logistics optimization expert for vending fleet operations. Always respond with valid JSON.';
    const prompt = `Optimize a single-day service route across the supplied machines. Consider stockout risk, last-service age, vehicle capacity, and travel friction.\n\nStart location: ${JSON.stringify(startLocation || {})}\nVehicle constraints: ${JSON.stringify(vehicleConstraints || {})}\nObjectives: ${JSON.stringify(objectives)}\nMachines: ${JSON.stringify(machines).slice(0, 6000)}\n\nReturn JSON: { "stops": [{ "order": 1, "machineId": "", "action": "restock|service|inspect", "estimatedMinutes": 0, "rationale": "" }], "totalEstimatedMinutes": 0, "skippedMachines": [{ "machineId": "", "reason": "" }], "summary": "" }`;
    const aiResult = await callAI(systemPrompt, prompt);
    await persistAIResult(pool, req.user?.id, 'route-optimization', { count: machines.length, objectives }, aiResult.result);
    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================================
// Apply pass 5: backlog endpoints (additive only)
// Required env vars (per integration; absent => 503 with `missing` field):
//   SQUARE_ACCESS_TOKEN  - /payment-square
//   NCR_API_KEY          - /payment-ncr
//   IOT_BROKER_URL + IOT_BROKER_TOKEN - /location-tracking (subscribe target)
// PRODUCT-DECISION:
//   - Theft / anomaly detection runs entirely through callAI (existing helper);
//     no new model/training is introduced.
//   - Supplier auto-ordering posts a queued order to a new
//     `supplier_orders` table (CREATE TABLE IF NOT EXISTS) — actual EDI/REST
//     submission is left to an external worker because supplier integration
//     contracts vary.
//   - IoT/MQTT ingestion is stubbed: we register the machine ID for the
//     bundled worker and return the broker URL the worker should subscribe to.
// =====================================================================

function requireEnv(res, vars) {
  const missing = vars.filter(v => !process.env[v]);
  if (missing.length) {
    res.status(503).json({ error: 'Service not configured', missing: missing.join(', ') });
    return false;
  }
  return true;
}

// POST /api/ai/anomaly-detection - cash vs sales reconciliation, theft signals
router.post('/anomaly-detection', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'your-openrouter-api-key-here') {
      return res.status(503).json({ error: 'AI not configured', missing: 'OPENROUTER_API_KEY' });
    }
    const { machineId, salesEvents, cashCollections, restockEvents, telemetryFlags } = req.body || {};
    const systemPrompt = 'You are a loss-prevention analyst for a vending fleet. Identify suspicious patterns suggesting theft, fraud or shrinkage. Always respond with valid JSON.';
    const prompt = `Analyse the following machine activity and flag anomalies.\nMachine: ${machineId || 'unknown'}\nSales events: ${JSON.stringify(salesEvents || []).slice(0, 4000)}\nCash collections: ${JSON.stringify(cashCollections || []).slice(0, 2000)}\nRestock events: ${JSON.stringify(restockEvents || []).slice(0, 2000)}\nTelemetry flags: ${JSON.stringify(telemetryFlags || [])}\n\nReturn JSON: {"anomalies":[{"type":"cash_short|free_vend|tamper|inventory_drift|other","severity":"low|medium|high","evidence":["<string>"],"recommendedAction":"<string>"}],"overallRiskScore":0-100,"summary":"<string>"}`;
    const aiResult = await callAI(systemPrompt, prompt);
    await persistAIResult(pool, req.user?.id, 'anomaly-detection', { machineId }, aiResult.result);
    res.json(aiResult);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/ai/payment-square - record a Square payment provider link for a machine
router.post('/payment-square', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!requireEnv(res, ['SQUARE_ACCESS_TOKEN'])) return;
    const { machineId, location_id } = req.body || {};
    if (!machineId) return res.status(400).json({ error: 'machineId is required' });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_provider_links (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        machine_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        external_location_id TEXT,
        status TEXT NOT NULL DEFAULT 'linked',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const ins = await pool.query(
      `INSERT INTO payment_provider_links (user_id, machine_id, provider, external_location_id) VALUES ($1, $2, 'square', $3) RETURNING id, status, created_at`,
      [req.user?.id || null, String(machineId), location_id || null]
    );
    res.json({ link: ins.rows[0], note: 'Square link recorded; webhook handler not bundled.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/ai/payment-ncr - record an NCR payment provider link for a machine
router.post('/payment-ncr', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!requireEnv(res, ['NCR_API_KEY'])) return;
    const { machineId, terminal_id } = req.body || {};
    if (!machineId) return res.status(400).json({ error: 'machineId is required' });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_provider_links (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        machine_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        external_location_id TEXT,
        status TEXT NOT NULL DEFAULT 'linked',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const ins = await pool.query(
      `INSERT INTO payment_provider_links (user_id, machine_id, provider, external_location_id) VALUES ($1, $2, 'ncr', $3) RETURNING id, status, created_at`,
      [req.user?.id || null, String(machineId), terminal_id || null]
    );
    res.json({ link: ins.rows[0], note: 'NCR link recorded; webhook handler not bundled.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/ai/supplier-order - queue a supplier auto-order
router.post('/supplier-order', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const { supplier, items, machineId, deliver_by } = req.body || {};
    if (!supplier || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'supplier and items[] are required' });
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS supplier_orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        supplier TEXT NOT NULL,
        machine_id TEXT,
        items JSONB NOT NULL,
        deliver_by DATE,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const ins = await pool.query(
      `INSERT INTO supplier_orders (user_id, supplier, machine_id, items, deliver_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, status, created_at`,
      [req.user?.id || null, supplier, machineId || null, JSON.stringify(items), deliver_by || null]
    );
    res.json({ order: ins.rows[0], note: 'Supplier order queued; external EDI/REST submission required.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/ai/location-tracking - register a machine for IoT/MQTT location tracking
router.post('/location-tracking', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    if (!requireEnv(res, ['IOT_BROKER_URL', 'IOT_BROKER_TOKEN'])) return;
    const { machineId } = req.body || {};
    if (!machineId) return res.status(400).json({ error: 'machineId is required' });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS iot_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        machine_id TEXT NOT NULL,
        broker_url TEXT NOT NULL,
        topic TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'subscribed',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const topic = `vending/${machineId}/location`;
    const ins = await pool.query(
      `INSERT INTO iot_subscriptions (user_id, machine_id, broker_url, topic) VALUES ($1, $2, $3, $4) RETURNING id, status, created_at`,
      [req.user?.id || null, String(machineId), process.env.IOT_BROKER_URL, topic]
    );
    res.json({ subscription: ins.rows[0], topic, broker_url: process.env.IOT_BROKER_URL, note: 'Subscription recorded; MQTT worker not bundled.' });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
