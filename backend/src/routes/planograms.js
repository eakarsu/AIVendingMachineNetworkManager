const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callAI } = require('../services/openrouter');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, m.name as machine_name, m.location as machine_location
      FROM planograms p
      JOIN machines m ON p.machine_id = m.id
      ORDER BY p.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, m.name as machine_name, m.location as machine_location
      FROM planograms p
      JOIN machines m ON p.machine_id = m.id
      WHERE p.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Planogram not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { machine_id, name, config, status } = req.body;
    const result = await pool.query(
      'INSERT INTO planograms (machine_id, name, config, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [machine_id, name, JSON.stringify(config || {}), status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { machine_id, name, config, status } = req.body;
    const result = await pool.query(
      'UPDATE planograms SET machine_id=$1, name=$2, config=$3, status=$4, updated_at=NOW() WHERE id=$5 RETURNING *',
      [machine_id, name, JSON.stringify(config || {}), status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Planogram not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM planograms WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Planogram not found' });
    res.json({ message: 'Planogram deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Planogram Optimization
router.post('/ai/optimize', authenticateToken, async (req, res) => {
  try {
    const { machine_id } = req.body;
    let whereClause = '';
    let params = [];
    if (machine_id) {
      whereClause = 'WHERE s.machine_id = $1';
      params = [machine_id];
    }

    const salesData = await pool.query(`
      SELECT p.name as product_name, p.category, p.price,
        SUM(s.quantity) as total_sold, SUM(s.amount) as total_revenue,
        m.name as machine_name, m.location
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN machines m ON s.machine_id = m.id
      ${whereClause}
      GROUP BY p.name, p.category, p.price, m.name, m.location
      ORDER BY total_sold DESC
    `, params);

    const systemPrompt = `You are an AI planogram optimization expert for vending machines. Analyze sales data to suggest optimal product placement. Return JSON:
    {
      "summary": "Overview of optimization opportunities",
      "current_performance_score": number (0-100),
      "optimized_performance_score": number (0-100),
      "layout_suggestions": [
        {
          "slot_position": "eye-level/middle/bottom/top",
          "product": "product name",
          "reason": "why this placement",
          "expected_lift": "percentage improvement"
        }
      ],
      "category_insights": [
        {
          "category": "category name",
          "performance": "strong/average/weak",
          "recommendation": "what to do"
        }
      ],
      "recommendations": ["strategic recommendations"],
      "expected_revenue_increase": "percentage"
    }`;

    const userPrompt = `Optimize planogram based on this sales data:\n${JSON.stringify(salesData.rows, null, 2)}`;

    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json(aiResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
