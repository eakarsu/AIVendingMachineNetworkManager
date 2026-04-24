const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callAI } = require('../services/openrouter');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, p.name as product_name, p.category, m.name as machine_name, m.location as machine_location
      FROM pricing_rules pr
      JOIN products p ON pr.product_id = p.id
      LEFT JOIN machines m ON pr.machine_id = m.id
      ORDER BY pr.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, p.name as product_name, p.category, m.name as machine_name, m.location as machine_location
      FROM pricing_rules pr
      JOIN products p ON pr.product_id = p.id
      LEFT JOIN machines m ON pr.machine_id = m.id
      WHERE pr.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pricing rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { product_id, machine_id, base_price, current_price, rule_type, parameters, active } = req.body;
    const result = await pool.query(
      'INSERT INTO pricing_rules (product_id, machine_id, base_price, current_price, rule_type, parameters, active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [product_id, machine_id, base_price, current_price || base_price, rule_type || 'standard', JSON.stringify(parameters || {}), active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { product_id, machine_id, base_price, current_price, rule_type, parameters, active } = req.body;
    const result = await pool.query(
      'UPDATE pricing_rules SET product_id=$1, machine_id=$2, base_price=$3, current_price=$4, rule_type=$5, parameters=$6, active=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [product_id, machine_id, base_price, current_price, rule_type, JSON.stringify(parameters || {}), active, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pricing rule not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pricing_rules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Pricing rule not found' });
    res.json({ message: 'Pricing rule deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Dynamic Pricing
router.post('/ai/optimize', authenticateToken, async (req, res) => {
  try {
    const salesData = await pool.query(`
      SELECT p.name as product_name, p.category, p.price as base_price, p.cost,
        COUNT(s.id) as transaction_count, SUM(s.quantity) as total_sold,
        SUM(s.amount) as total_revenue, AVG(s.amount/s.quantity) as avg_selling_price,
        m.name as machine_name, m.location
      FROM sales s
      JOIN products p ON s.product_id = p.id
      JOIN machines m ON s.machine_id = m.id
      WHERE s.sold_at > NOW() - INTERVAL '30 days'
      GROUP BY p.name, p.category, p.price, p.cost, m.name, m.location
      ORDER BY total_revenue DESC
    `);

    const systemPrompt = `You are an AI dynamic pricing strategist for vending machines. Analyze sales data to suggest optimal pricing. Return JSON:
    {
      "summary": "Pricing optimization overview",
      "total_potential_revenue_increase": "percentage",
      "pricing_suggestions": [
        {
          "product": "product name",
          "machine": "machine name",
          "current_price": number,
          "suggested_price": number,
          "change_percentage": number,
          "strategy": "increase/decrease/maintain",
          "reasoning": "why this change",
          "expected_impact": "description of expected impact",
          "confidence": number (0-100)
        }
      ],
      "time_based_strategies": [
        {
          "time_period": "morning/afternoon/evening/weekend",
          "strategy": "description",
          "products_affected": ["product names"]
        }
      ],
      "recommendations": ["strategic recommendations"]
    }`;

    const userPrompt = `Analyze this sales data and suggest dynamic pricing:\n${JSON.stringify(salesData.rows, null, 2)}`;

    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json(aiResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
