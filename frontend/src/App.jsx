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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
