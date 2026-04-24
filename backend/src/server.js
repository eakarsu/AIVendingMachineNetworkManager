const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/machines', require('./routes/machines'));
app.use('/api/products', require('./routes/products'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/planograms', require('./routes/planograms'));
app.use('/api/pricing', require('./routes/pricing'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/cash', require('./routes/cash'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/maintenance', require('./routes/maintenance'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Vending Network API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health\n`);
});
