const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { callAI, persistAIResult } = require('../services/openrouter');
const router = express.Router();

// Telemetry ingest endpoint
router.post('/ingest', authenticateToken, async (req, res) => {
  try {
    const { machine_id, fill_level, sales_data, fault_codes } = req.body;

    if (!machine_id) return res.status(400).json({ error: 'machine_id is required' });

    const machineResult = await pool.query('SELECT * FROM machines WHERE id = $1', [machine_id]);
    if (machineResult.rows.length === 0) return res.status(404).json({ error: 'Machine not found' });

    const results = { machine_id, processed: [], alerts_created: [], sales_created: 0 };

    // Update machine fill level if provided (store in a metadata-ish column via alert)
    if (fill_level !== undefined) {
      // Create fill level alert if below threshold
      if (fill_level < 20) {
        await pool.query(
          "INSERT INTO alerts (machine_id, type, severity, message) VALUES ($1, 'low_fill_level', 'critical', $2)",
          [machine_id, `Fill level critically low: ${fill_level}%. Immediate restocking required.`]
        );
        results.alerts_created.push('low_fill_level_critical');

        // Trigger AI replenishment check
        const inventoryResult = await pool.query(`
          SELECT i.*, p.name as product_name FROM inventory i
          JOIN products p ON i.product_id = p.id
          WHERE i.machine_id = $1 AND i.quantity < i.max_quantity * 0.3
        `, [machine_id]);

        if (inventoryResult.rows.length > 0) {
          await pool.query(
            "INSERT INTO alerts (machine_id, type, severity, message) VALUES ($1, 'replenishment_needed', 'warning', $2)",
            [machine_id, `${inventoryResult.rows.length} products need restocking in machine ${machine_id}`]
          );
          results.alerts_created.push('replenishment_needed');
        }
      } else if (fill_level < 40) {
        await pool.query(
          "INSERT INTO alerts (machine_id, type, severity, message) VALUES ($1, 'low_fill_level', 'warning', $2)",
          [machine_id, `Fill level low: ${fill_level}%. Schedule restocking.`]
        );
        results.alerts_created.push('low_fill_level_warning');
      }
      results.processed.push({ action: 'fill_level_processed', fill_level });
    }

    // Process sales data
    if (sales_data && Array.isArray(sales_data)) {
      for (const sale of sales_data) {
        try {
          const productResult = await pool.query('SELECT price FROM products WHERE id = $1', [sale.product_id]);
          const price = productResult.rows[0]?.price || 0;
          await pool.query(
            'INSERT INTO sales (machine_id, product_id, quantity, amount, payment_method, sold_at) VALUES ($1, $2, $3, $4, $5, NOW())',
            [machine_id, sale.product_id, sale.quantity || 1, price * (sale.quantity || 1), 'telemetry']
          );
          // Update inventory
          await pool.query(
            'UPDATE inventory SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE machine_id = $2 AND product_id = $3',
            [sale.quantity || 1, machine_id, sale.product_id]
          );
          results.sales_created++;
        } catch (e) {
          console.error('Sale insert error:', e.message);
        }
      }
    }

    // Process fault codes
    if (fault_codes && fault_codes.length > 0) {
      for (const code of fault_codes) {
        await pool.query(
          "INSERT INTO alerts (machine_id, type, severity, message) VALUES ($1, 'fault_code', 'error', $2)",
          [machine_id, `Fault code detected: ${code}`]
        );
      }
      results.alerts_created.push(...fault_codes.map(c => `fault:${c}`));
    }

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent telemetry summary per machine
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id, m.name, m.location, m.status,
        (SELECT COUNT(*) FROM alerts a WHERE a.machine_id = m.id AND a.status = 'active') as active_alerts,
        (SELECT COALESCE(SUM(s.amount), 0) FROM sales s WHERE s.machine_id = m.id AND s.sold_at > NOW() - INTERVAL '24 hours') as sales_24h,
        (SELECT COALESCE(AVG(i.quantity::float / NULLIF(i.max_quantity, 0) * 100), 100) FROM inventory i WHERE i.machine_id = m.id) as fill_pct
      FROM machines m
      WHERE m.status = 'active'
      ORDER BY active_alerts DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
