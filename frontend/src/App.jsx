import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './api';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Machines from './pages/Machines';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Planograms from './pages/Planograms';
import Pricing from './pages/Pricing';
import RoutesPage from './pages/RoutesPage';
import Cash from './pages/Cash';
import Sales from './pages/Sales';
import Alerts from './pages/Alerts';
import Maintenance from './pages/Maintenance';
import DemandForecast from './pages/DemandForecast';
import DynamicPricingV2 from './pages/DynamicPricingV2';
import PredictiveMaintenanceV2 from './pages/PredictiveMaintenanceV2';
import RouteOptimization from './pages/RouteOptimization';
import AnomalyDetection from './pages/AnomalyDetection';
import Integrations from './pages/Integrations';
import CustomViewsPage from './pages/CustomViewsPage';
// === Batch 08 Gaps & Frontend Mounts ===
import CfAiDemandForecasterByMachineLocationTime from './pages/CfAiDemandForecasterByMachineLocationTime'
import CfRouteOptimizerMinimizingCollectionRestockingDistance from './pages/CfRouteOptimizerMinimizingCollectionRestockingDistance'
import CfDynamicPricingRecommendationsByDemandInventorySeasonality from './pages/CfDynamicPricingRecommendationsByDemandInventorySeasonality'
import CfPredictiveMaintenanceBasedOnTelemetrySignatures from './pages/CfPredictiveMaintenanceBasedOnTelemetrySignatures'
import CfTheftDetectionIdentifyingCashInventoryDiscrepancies from './pages/CfTheftDetectionIdentifyingCashInventoryDiscrepancies'
import CfCashlessWalletQrIntegrationForModernVending from './pages/CfCashlessWalletQrIntegrationForModernVending'
import GapNoDemandForecastingAi from './pages/GapNoDemandForecastingAi'
import GapNoAiDrivenRouteOptimization from './pages/GapNoAiDrivenRouteOptimization'
import GapNoDynamicPricingAi from './pages/GapNoDynamicPricingAi'
import GapNoPredictiveMaintenanceMl from './pages/GapNoPredictiveMaintenanceMl'
import GapNoTheftAnomalyDetectionAi from './pages/GapNoTheftAnomalyDetectionAi'
import GapLimitedPaymentProcessorIntegrationOnlyAStub from './pages/GapLimitedPaymentProcessorIntegrationOnlyAStub'
import GapNoCashlessPaymentTracking from './pages/GapNoCashlessPaymentTracking'
import GapNoSupplierIntegrationForAutoOrdering from './pages/GapNoSupplierIntegrationForAutoOrdering'
import GapNoRealTimeGpsLocationTrackingFor from './pages/GapNoRealTimeGpsLocationTrackingFor'
import GapNoNotificationsSubsystemAlertsOnly from './pages/GapNoNotificationsSubsystemAlertsOnly'
import GapNoMultiTenantOperatorSeparation from './pages/GapNoMultiTenantOperatorSeparation'

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
}

export default function App() {
  const [authState, setAuthState] = useState(isAuthenticated());

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setAuthState(true)} />} />
        <Route path="/" element={<ProtectedRoute><Layout onLogout={() => setAuthState(false)} /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="machines" element={<Machines />} />
          <Route path="products" element={<Products />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="planograms" element={<Planograms />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="cash" element={<Cash />} />
          <Route path="sales" element={<Sales />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="ai/demand-forecast" element={<DemandForecast />} />
          <Route path="ai/dynamic-pricing" element={<DynamicPricingV2 />} />
          <Route path="ai/predictive-maintenance" element={<PredictiveMaintenanceV2 />} />
          <Route path="ai/route-optimization" element={<RouteOptimization />} />
          <Route path="ai/anomaly-detection" element={<AnomalyDetection />} />
          <Route path="ai/integrations" element={<Integrations />} />
          <Route path="custom-views" element={<CustomViewsPage />} />
        </Route>
      {/* // === Batch 08 Gaps & Frontend Mounts === */}
      <Route path="/cf-ai-demand-forecaster-by-machine-location-time-for" element={<ProtectedRoute><CfAiDemandForecasterByMachineLocationTime /></ProtectedRoute>} />
      <Route path="/cf-route-optimizer-minimizing-collection-restocking-distance" element={<ProtectedRoute><CfRouteOptimizerMinimizingCollectionRestockingDistance /></ProtectedRoute>} />
      <Route path="/cf-dynamic-pricing-recommendations-by-demand-inventory-seasonality" element={<ProtectedRoute><CfDynamicPricingRecommendationsByDemandInventorySeasonality /></ProtectedRoute>} />
      <Route path="/cf-predictive-maintenance-based-on-telemetry-signatures" element={<ProtectedRoute><CfPredictiveMaintenanceBasedOnTelemetrySignatures /></ProtectedRoute>} />
      <Route path="/cf-theft-detection-identifying-cash-inventory-discrepancies" element={<ProtectedRoute><CfTheftDetectionIdentifyingCashInventoryDiscrepancies /></ProtectedRoute>} />
      <Route path="/cf-cashless-wallet-qr-integration-for-modern-vending" element={<ProtectedRoute><CfCashlessWalletQrIntegrationForModernVending /></ProtectedRoute>} />
      <Route path="/gap-no-demand-forecasting-ai" element={<ProtectedRoute><GapNoDemandForecastingAi /></ProtectedRoute>} />
      <Route path="/gap-no-ai-driven-route-optimization" element={<ProtectedRoute><GapNoAiDrivenRouteOptimization /></ProtectedRoute>} />
      <Route path="/gap-no-dynamic-pricing-ai" element={<ProtectedRoute><GapNoDynamicPricingAi /></ProtectedRoute>} />
      <Route path="/gap-no-predictive-maintenance-ml" element={<ProtectedRoute><GapNoPredictiveMaintenanceMl /></ProtectedRoute>} />
      <Route path="/gap-no-theft-anomaly-detection-ai" element={<ProtectedRoute><GapNoTheftAnomalyDetectionAi /></ProtectedRoute>} />
      <Route path="/gap-limited-payment-processor-integration-only-a-stub-integrations" element={<ProtectedRoute><GapLimitedPaymentProcessorIntegrationOnlyAStub /></ProtectedRoute>} />
      <Route path="/gap-no-cashless-payment-tracking" element={<ProtectedRoute><GapNoCashlessPaymentTracking /></ProtectedRoute>} />
      <Route path="/gap-no-supplier-integration-for-auto-ordering" element={<ProtectedRoute><GapNoSupplierIntegrationForAutoOrdering /></ProtectedRoute>} />
      <Route path="/gap-no-real-time-gps-location-tracking-for-the-fleet" element={<ProtectedRoute><GapNoRealTimeGpsLocationTrackingFor /></ProtectedRoute>} />
      <Route path="/gap-no-notifications-subsystem-alerts-only" element={<ProtectedRoute><GapNoNotificationsSubsystemAlertsOnly /></ProtectedRoute>} />
      <Route path="/gap-no-multi-tenant-operator-separation" element={<ProtectedRoute><GapNoMultiTenantOperatorSeparation /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
