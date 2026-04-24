const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callAI } = require('../services/openrouter');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, m.name as machine_name, m.location as machine_location
      FROM cash_records c
      JOIN machines m ON c.machine_id = m.id
      ORDER BY c.record_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, m.name as machine_name, m.location as machine_location
      FROM cash_records c
      JOIN machines m ON c.machine_id = m.id
      WHERE c.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cash record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { machine_id, record_date, expected_amount, actual_amount, status, notes } = req.body;
    const variance = (actual_amount || 0) - (expected_amount || 0);
    const result = await pool.query(
      'INSERT INTO cash_records (machine_id, record_date, expected_amount, actual_amount, variance, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [machine_id, record_date || new Date(), expected_amount, actual_amount, variance, status || 'pending', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { machine_id, record_date, expected_amount, actual_amount, status, notes } = req.body;
    const variance = (actual_amount || 0) - (expected_amount || 0);
    const result = await pool.query(
      'UPDATE cash_records SET machine_id=$1, record_date=$2, expected_amount=$3, actual_amount=$4, variance=$5, status=$6, notes=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [machine_id, record_date, expected_amount, actual_amount, variance, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cash record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cash_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cash record not found' });
    res.json({ message: 'Cash record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Cash Reconciliation Analysis
router.post('/ai/analyze', authenticateToken, async (req, res) => {
  try {
    const cashData = await pool.query(`
      SELECT c.*, m.name as machine_name, m.location,
        ABS(c.variance) as abs_variance,
        ROUND(ABS(c.variance) / NULLIF(c.expected_amount, 0) * 100, 2) as variance_percentage
      FROM cash_records c
      JOIN machines m ON c.machine_id = m.id
      ORDER BY c.record_date DESC
      LIMIT 50
    `);

    const systemPrompt = `You are an AI cash reconciliation analyst for vending machines. Analyze cash collection data to detect anomalies, patterns, and potential issues. Return JSON:
    {
      "summary": "Cash reconciliation overview",
      "overall_accuracy": number (percentage),
      "total_variance": number (dollars),
      "anomalies": [
        {
          "machine": "machine name",
          "date": "date",
          "expected": number,
          "actual": number,
          "variance": number,
          "severity": "critical/warning/info",
          "possible_cause": "explanation"
        }
      ],
      "patterns": [
        {
          "pattern": "description of pattern",
          "affected_machines": ["machine names"],
          "recommendation": "what to do"
        }
      ],
      "risk_assessment": {
        "high_risk_machines": ["machine names"],
        "estimated_loss": number,
        "fraud_likelihood": "high/medium/low"
      },
      "recommendations": ["strategic recommendations"]
    }`;

    const userPrompt = `Analyze these cash reconciliation records for anomalies:\n${JSON.stringify(cashData.rows, null, 2)}`;

    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json(aiResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
