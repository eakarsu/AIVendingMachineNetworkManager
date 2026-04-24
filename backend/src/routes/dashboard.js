const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [machines, products, alerts, sales, inventory, maintenance] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'active\') as active FROM machines'),
      pool.query('SELECT COUNT(*) as total FROM products'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'active\') as active FROM alerts'),
      pool.query('SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_revenue FROM sales WHERE sold_at > NOW() - INTERVAL \'30 days\''),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE quantity < max_quantity * 0.2) as low_stock FROM inventory'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'scheduled\') as pending FROM maintenance'),
    ]);

    res.json({
      machines: { total: parseInt(machines.rows[0].total), active: parseInt(machines.rows[0].active) },
      products: { total: parseInt(products.rows[0].total) },
      alerts: { total: parseInt(alerts.rows[0].total), active: parseInt(alerts.rows[0].active) },
      sales: { total: parseInt(sales.rows[0].total), revenue: parseFloat(sales.rows[0].total_revenue) },
      inventory: { total: parseInt(inventory.rows[0].total), low_stock: parseInt(inventory.rows[0].low_stock) },
      maintenance: { total: parseInt(maintenance.rows[0].total), pending: parseInt(maintenance.rows[0].pending) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
