const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, m.name as machine_name, m.location as machine_location
      FROM alerts a
      LEFT JOIN machines m ON a.machine_id = m.id
      ORDER BY a.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, m.name as machine_name, m.location as machine_location
      FROM alerts a
      LEFT JOIN machines m ON a.machine_id = m.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { machine_id, type, severity, message, status } = req.body;
    const result = await pool.query(
      'INSERT INTO alerts (machine_id, type, severity, message, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [machine_id, type, severity || 'info', message, status || 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { machine_id, type, severity, message, status } = req.body;
    const result = await pool.query(
      'UPDATE alerts SET machine_id=$1, type=$2, severity=$3, message=$4, status=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [machine_id, type, severity, message, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM alerts WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
