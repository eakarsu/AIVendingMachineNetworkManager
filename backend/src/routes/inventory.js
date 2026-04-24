const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callAI } = require('../services/openrouter');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, m.name as machine_name, m.location as machine_location, p.name as product_name, p.category as product_category
      FROM inventory i
      JOIN machines m ON i.machine_id = m.id
      JOIN products p ON i.product_id = p.id
      ORDER BY i.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, m.name as machine_name, m.location as machine_location, p.name as product_name, p.category as product_category
      FROM inventory i
      JOIN machines m ON i.machine_id = m.id
      JOIN products p ON i.product_id = p.id
      WHERE i.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Inventory record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { machine_id, product_id, quantity, max_quantity, slot_number } = req.body;
    const result = await pool.query(
      'INSERT INTO inventory (machine_id, product_id, quantity, max_quantity, slot_number) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [machine_id, product_id, quantity, max_quantity || 20, slot_number]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { machine_id, product_id, quantity, max_quantity, slot_number } = req.body;
    const result = await pool.query(
      'UPDATE inventory SET machine_id=$1, product_id=$2, quantity=$3, max_quantity=$4, slot_number=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [machine_id, product_id, quantity, max_quantity, slot_number, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Inventory record not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Inventory record not found' });
    res.json({ message: 'Inventory record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Replenishment Prediction
router.post('/ai/replenishment', authenticateToken, async (req, res) => {
  try {
    const inventoryData = await pool.query(`
      SELECT i.*, m.name as machine_name, m.location, p.name as product_name, p.category,
        (SELECT COUNT(*) FROM sales s WHERE s.machine_id = i.machine_id AND s.product_id = i.product_id AND s.sold_at > NOW() - INTERVAL '7 days') as weekly_sales
      FROM inventory i
      JOIN machines m ON i.machine_id = m.id
      JOIN products p ON i.product_id = p.id
      ORDER BY i.quantity::float / NULLIF(i.max_quantity, 0) ASC
      LIMIT 20
    `);

    const systemPrompt = `You are an AI inventory analyst for a vending machine network. Analyze inventory levels and sales velocity to predict replenishment needs. Return JSON with this structure:
    {
      "summary": "Brief overview of inventory status",
      "urgency_level": "critical/high/medium/low",
      "predictions": [
        {
          "machine": "machine name",
          "product": "product name",
          "current_stock": number,
          "max_stock": number,
          "stock_percentage": number,
          "weekly_sales": number,
          "days_until_empty": number,
          "recommended_action": "action description",
          "priority": "critical/high/medium/low"
        }
      ],
      "recommendations": ["list of strategic recommendations"],
      "estimated_revenue_at_risk": "dollar amount"
    }`;

    const userPrompt = `Analyze this inventory data and predict replenishment needs:\n${JSON.stringify(inventoryData.rows, null, 2)}`;

    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json(aiResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
