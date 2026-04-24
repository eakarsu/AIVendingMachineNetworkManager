const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callAI } = require('../services/openrouter');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM routes ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM routes WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, driver, route_date, status, machines_list, estimated_time, distance } = req.body;
    const result = await pool.query(
      'INSERT INTO routes (name, driver, route_date, status, machines_list, estimated_time, distance) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, driver, route_date, status || 'planned', JSON.stringify(machines_list || []), estimated_time, distance]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, driver, route_date, status, machines_list, estimated_time, distance } = req.body;
    const result = await pool.query(
      'UPDATE routes SET name=$1, driver=$2, route_date=$3, status=$4, machines_list=$5, estimated_time=$6, distance=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [name, driver, route_date, status, JSON.stringify(machines_list || []), estimated_time, distance, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM routes WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Route not found' });
    res.json({ message: 'Route deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI: Route Optimization
router.post('/ai/optimize', authenticateToken, async (req, res) => {
  try {
    const machineData = await pool.query(`
      SELECT m.*,
        (SELECT COUNT(*) FROM inventory i WHERE i.machine_id = m.id AND i.quantity < i.max_quantity * 0.3) as low_stock_items,
        (SELECT SUM(i.max_quantity - i.quantity) FROM inventory i WHERE i.machine_id = m.id) as total_restock_needed
      FROM machines m
      WHERE m.status = 'active'
      ORDER BY m.id
    `);

    const routeData = await pool.query('SELECT * FROM routes WHERE status != $1 ORDER BY route_date DESC LIMIT 10', ['completed']);

    const systemPrompt = `You are an AI route optimization expert for vending machine restocking. Optimize routes to minimize travel time while prioritizing machines that need restocking most urgently. Return JSON:
    {
      "summary": "Route optimization overview",
      "total_machines": number,
      "machines_needing_service": number,
      "optimized_routes": [
        {
          "route_name": "Route name",
          "priority": "critical/high/medium",
          "stops": [
            {
              "order": number,
              "machine": "machine name",
              "location": "location",
              "items_to_restock": number,
              "estimated_service_time": "minutes",
              "urgency": "critical/high/medium/low"
            }
          ],
          "total_distance": "km",
          "total_time": "hours",
          "efficiency_score": number (0-100)
        }
      ],
      "savings": {
        "time_saved": "percentage",
        "distance_saved": "percentage",
        "fuel_cost_saved": "estimated dollars"
      },
      "recommendations": ["strategic recommendations"]
    }`;

    const userPrompt = `Optimize restocking routes based on this data:\nMachines: ${JSON.stringify(machineData.rows, null, 2)}\nExisting Routes: ${JSON.stringify(routeData.rows, null, 2)}`;

    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json(aiResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
