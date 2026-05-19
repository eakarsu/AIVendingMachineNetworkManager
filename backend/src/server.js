const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
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
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/custom-views', require('./routes/customViews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/demand-forecaster', require('./routes/demandForecaster')); app.use('/api/route-optimizer', require('./routes/routeOptimizer')); app.use('/api/dynamic-pricing', require('./routes/dynamicPricing')); app.use('/api/predictive-maintenance', require('./routes/predictiveMaintenance')); app.use('/api/theft-detection', require('./routes/theftDetection')); app.use('/api/cashless-integration', require('./routes/cashlessIntegration'));

// === Batch 08 Gaps & Frontend Mounts ===
app.use('/api/gap-no-demand-forecasting-ai', require('./routes/gapNoDemandForecastingAi'));
app.use('/api/gap-no-ai-driven-route-optimization', require('./routes/gapNoAiDrivenRouteOptimization'));
app.use('/api/gap-no-dynamic-pricing-ai', require('./routes/gapNoDynamicPricingAi'));
app.use('/api/gap-no-predictive-maintenance-ml', require('./routes/gapNoPredictiveMaintenanceMl'));
app.use('/api/gap-no-theft-anomaly-detection-ai', require('./routes/gapNoTheftAnomalyDetectionAi'));
app.use('/api/gap-limited-payment-processor-integration-only-a-stub-integrations', require('./routes/gapLimitedPaymentProcessorIntegrationOnlyAStubIntegrations'));
app.use('/api/gap-no-cashless-payment-tracking', require('./routes/gapNoCashlessPaymentTracking'));
app.use('/api/gap-no-supplier-integration-for-auto-ordering', require('./routes/gapNoSupplierIntegrationForAutoOrdering'));
app.use('/api/gap-no-real-time-gps-location-tracking-for-the-fleet', require('./routes/gapNoRealTimeGpsLocationTrackingForTheFleet'));
app.use('/api/gap-no-notifications-subsystem-alerts-only', require('./routes/gapNoNotificationsSubsystemAlertsOnly'));
app.use('/api/gap-no-multi-tenant-operator-separation', require('./routes/gapNoMultiTenantOperatorSeparation'));

app.listen(PORT, () => {
  console.log(`\nVending Network API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health\n`);
});
