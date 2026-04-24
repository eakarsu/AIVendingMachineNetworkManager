const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM machines ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM machines WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Machine not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, location, status, capacity, model_type, lat, lng } = req.body;
    const result = await pool.query(
      'INSERT INTO machines (name, location, status, capacity, model_type, lat, lng) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, location, status || 'active', capacity || 40, model_type || 'Standard', lat || 0, lng || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, location, status, capacity, model_type, lat, lng } = req.body;
    const result = await pool.query(
      'UPDATE machines SET name=$1, location=$2, status=$3, capacity=$4, model_type=$5, lat=$6, lng=$7, updated_at=NOW() WHERE id=$8 RETURNING *',
      [name, location, status, capacity, model_type, lat, lng, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Machine not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM machines WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Machine not found' });
    res.json({ message: 'Machine deleted', machine: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
