import React from 'react';
import 'leaflet/dist/leaflet.css';
import MachineMap from '../components/MachineMap';
import SalesByMachine from '../components/SalesByMachine';
import RestockRoutePlanner from '../components/RestockRoutePlanner';
import RestockSlipExporter from '../components/RestockSlipExporter';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6 fade-in" data-testid="custom-views-page">
      <header>
        <h1 className="text-2xl font-bold text-white">Fleet Analytics</h1>
        <p className="text-sm text-gray-400">
          Live map of vending machines (status color-coded), top-revenue ranking,
          restock route planning, and printable restock slips.
        </p>
      </header>

      <MachineMap />
      <SalesByMachine />
      <RestockRoutePlanner />
      <RestockSlipExporter />
    </div>
  );
}
