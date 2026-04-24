const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callAI } = require('../services/openrouter');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, m.name as machine_name, m.location as machine_location, p.name as product_name, p.category as product_category
      FROM sales s
      JOIN machines m ON s.machine_id = m.id
      JOIN products p ON s.product_id = p.id
      ORDER BY s.sold_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, m.name as machine_name, m.location as machine_location, p.name as product_name, p.category as product_category
      FROM sales s
      JOIN machines m ON s.machine_id = m.id
      JOIN products p ON s.product_id = p.id
      WHERE s.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { machine_id, product_id, quantity, amount, payment_method } = req.body;
    const result = await pool.query(
      'INSERT INTO sales (machine_id, product_id, quantity, amount, payment_method) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [machine_id, product_id, quantity || 1, amount, payment_method || 'cash']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { machine_id, product_id, quantity, amount, payment_method } = req.body;
    const result = await pool.query(
      'UPDATE sales SET machine_id=$1, product_id=$2, quantity=$3, amount=$4, payment_method=$5 WHERE id=$6 RETURNING *',
      [machine_id, product_id, quantity, amount, payment_method, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sales WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sale not found' });
    res.json({ message: 'Sale deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Sales Analytics & Forecasting
router.post('/ai/analyze', authenticateToken, async (req, res) => {
  try {
    const salesData = await pool.query(`
      SELECT p.name as product_name, p.category, m.name as machine_name, m.location,
        DATE(s.sold_at) as sale_date, SUM(s.quantity) as daily_qty, SUM(s.amount) as daily_revenue,
        s.payment_method
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN machines m ON s.machine_id = m.id
      WHERE s.sold_at > NOW() - INTERVAL '30 days'
      GROUP BY p.name, p.category, m.name, m.location, DATE(s.sold_at), s.payment_method
      ORDER BY sale_date DESC
    `);

    const systemPrompt = `You are an AI sales analytics expert for vending machines. Analyze sales data to provide insights and forecasts. Return JSON:
    {
      "summary": "Sales analytics overview",
      "total_revenue_30d": number,
      "total_units_30d": number,
      "average_daily_revenue": number,
      "top_performers": [
        {
          "product": "name",
          "total_revenue": number,
          "total_units": number,
          "trend": "growing/stable/declining"
        }
      ],
      "machine_performance": [
        {
          "machine": "name",
          "location": "location",
          "revenue": number,
          "rating": "excellent/good/average/poor"
        }
      ],
      "trends": [
        {
          "trend": "description",
          "impact": "positive/negative/neutral",
          "recommendation": "action"
        }
      ],
      "forecast": {
        "next_week_revenue": number,
        "next_month_revenue": number,
        "confidence": number
      },
      "recommendations": ["strategic recommendations"]
    }`;

    const userPrompt = `Analyze these sales data and provide insights:\n${JSON.stringify(salesData.rows, null, 2)}`;

    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json(aiResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
