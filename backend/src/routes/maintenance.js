const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mt.*, m.name as machine_name, m.location as machine_location
      FROM maintenance mt
      JOIN machines m ON mt.machine_id = m.id
      ORDER BY mt.scheduled_date DESC
    `);
    res.json(result.rows);
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

module.exports = router;
