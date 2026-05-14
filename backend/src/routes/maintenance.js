const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callAI, parseAIJson, persistAIResult } = require('../services/openrouter');
const aiRateLimiter = require('../middleware/aiRateLimiter');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM maintenance');
    const result = await pool.query(`
      SELECT mt.*, m.name as machine_name, m.location as machine_location
      FROM maintenance mt
      JOIN machines m ON mt.machine_id = m.id
      ORDER BY mt.scheduled_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    const total = parseInt(countResult.rows[0].count);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mt.*, m.name as machine_name, m.location as machine_location
      FROM maintenance mt
      JOIN machines m ON mt.machine_id = m.id
      WHERE mt.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { machine_id, type, description, status, scheduled_date, completed_date, cost, technician } = req.body;
    const result = await pool.query(
      'INSERT INTO maintenance (machine_id, type, description, status, scheduled_date, completed_date, cost, technician) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [machine_id, type, description, status || 'scheduled', scheduled_date, completed_date, cost, technician]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { machine_id, type, description, status, scheduled_date, completed_date, cost, technician } = req.body;
    const result = await pool.query(
      'UPDATE maintenance SET machine_id=$1, type=$2, description=$3, status=$4, scheduled_date=$5, completed_date=$6, cost=$7, technician=$8, updated_at=NOW() WHERE id=$9 RETURNING *',
      [machine_id, type, description, status, scheduled_date, completed_date, cost, technician, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM maintenance WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json({ message: 'Maintenance record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Predictive Maintenance
router.post('/:id/ai-predict', authenticateToken, aiRateLimiter, async (req, res) => {
  try {
    const machineResult = await pool.query('SELECT * FROM machines WHERE id = $1', [req.params.id]);
    if (machineResult.rows.length === 0) return res.status(404).json({ error: 'Machine not found' });
    const machine = machineResult.rows[0];

    const maintenanceHistory = await pool.query(
      'SELECT * FROM maintenance WHERE machine_id = $1 ORDER BY scheduled_date DESC LIMIT 10',
      [req.params.id]
    );

    const alertsResult = await pool.query(
      "SELECT * FROM alerts WHERE machine_id = $1 AND created_at > NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 10",
      [req.params.id]
    );

    const systemPrompt = 'You are a predictive maintenance AI expert for vending machines. Return ONLY valid JSON.';
    const userPrompt = `Predict maintenance needs for machine "${machine.name}" at ${machine.location}.
Model: ${machine.model_type}, Last serviced: ${machine.last_serviced}, Status: ${machine.status}
Maintenance history (${maintenanceHistory.rows.length} records): ${JSON.stringify(maintenanceHistory.rows.slice(0, 5).map(r => ({ type: r.type, status: r.status, date: r.scheduled_date, cost: r.cost })))}
Recent alerts (${alertsResult.rows.length}): ${JSON.stringify(alertsResult.rows.slice(0, 5).map(r => ({ type: r.type, severity: r.severity, message: r.message })))}

Return ONLY valid JSON:
{"failure_risk":<0-1>,"components_at_risk":["..."],"recommended_service_date":"YYYY-MM-DD","estimated_downtime":"X hours","urgency":"immediate|scheduled|monitor","maintenance_type":"...","estimated_cost":<number>}`;

    const aiResult = await callAI(systemPrompt, userPrompt);
    const parsed = aiResult.result || {};

    // Ensure table exists and save prediction
    await pool.query(`
      CREATE TABLE IF NOT EXISTS maintenance_predictions (
        id SERIAL PRIMARY KEY,
        machine_id INTEGER,
        failure_probability FLOAT,
        components_at_risk JSONB,
        recommended_action TEXT,
        urgency VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(() => {});

    await pool.query(
      'INSERT INTO maintenance_predictions (machine_id, failure_probability, components_at_risk, recommended_action, urgency) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, parsed.failure_risk || 0, JSON.stringify(parsed.components_at_risk || []), parsed.recommended_service_date, parsed.urgency || 'monitor']
    ).catch(() => {});

    await persistAIResult(pool, req.user?.id || req.user?.userId, 'maintenance/ai-predict', { machine_id: req.params.id }, parsed);

    // Auto-create alert if high risk
    if ((parsed.failure_risk || 0) > 0.7) {
      await pool.query(
        "INSERT INTO alerts (machine_id, type, severity, message) VALUES ($1, 'predictive_maintenance', 'warning', $2)",
        [req.params.id, `High failure risk detected (${((parsed.failure_risk || 0) * 100).toFixed(0)}%). Components: ${(parsed.components_at_risk || []).join(', ')}`]
      ).catch(() => {});
    }

    res.json({ machine: machine.name, location: machine.location, prediction: parsed, model: aiResult.model });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
