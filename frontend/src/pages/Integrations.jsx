import React, { useState } from 'react';
import { api } from '../api';
import AIOutput from '../components/AIOutput';

// Apply pass 5: creds-gated integrations and product-decision stubs
// (payment-square, payment-ncr, supplier-order, location-tracking)
export default function Integrations() {
  const [tab, setTab] = useState('square');
  return (
    <div className="fade-in">
      <h1 className="text-2xl font-bold mb-2">Integrations</h1>
      <p className="text-gray-400 mb-4 text-sm">Payment processors, supplier orders, IoT location tracking. Each is gated on creds and returns 503 if unset.</p>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          ['square', 'Square'],
          ['ncr', 'NCR'],
          ['supplier', 'Supplier Order'],
          ['iot', 'Location Tracking'],
        ].map(([k, label]) => (
          <button key={k} className={tab === k ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'square' && <SquarePanel />}
      {tab === 'ncr' && <NcrPanel />}
      {tab === 'supplier' && <SupplierPanel />}
      {tab === 'iot' && <IotPanel />}
    </div>
  );
}

function Result({ data, error }) {
  if (error) return <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-red-300 text-sm">{error}</div>;
  if (data) return <div className="mt-4"><AIOutput result={data} /></div>;
  return null;
}

function SquarePanel() {
  const [machineId, setMachineId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setData(null); setError(null);
    try { setData(await api.aiPaymentSquare({ machineId, location_id: locationId })); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <p className="text-xs text-gray-500">Requires SQUARE_ACCESS_TOKEN env var.</p>
      <input className="input w-full" placeholder="Machine ID" value={machineId} onChange={(e) => setMachineId(e.target.value)} required />
      <input className="input w-full" placeholder="Square location_id (optional)" value={locationId} onChange={(e) => setLocationId(e.target.value)} />
      <button className="btn btn-primary" disabled={loading}>{loading ? 'Linking...' : 'Link Square'}</button>
      <Result data={data} error={error} />
    </form>
  );
}

function NcrPanel() {
  const [machineId, setMachineId] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setData(null); setError(null);
    try { setData(await api.aiPaymentNcr({ machineId, terminal_id: terminalId })); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <p className="text-xs text-gray-500">Requires NCR_API_KEY env var.</p>
      <input className="input w-full" placeholder="Machine ID" value={machineId} onChange={(e) => setMachineId(e.target.value)} required />
      <input className="input w-full" placeholder="NCR terminal_id (optional)" value={terminalId} onChange={(e) => setTerminalId(e.target.value)} />
      <button className="btn btn-primary" disabled={loading}>{loading ? 'Linking...' : 'Link NCR'}</button>
      <Result data={data} error={error} />
    </form>
  );
}

function SupplierPanel() {
  const [supplier, setSupplier] = useState('');
  const [machineId, setMachineId] = useState('');
  const [deliverBy, setDeliverBy] = useState('');
  const [itemsText, setItemsText] = useState('[\n  {"sku":"COKE-12","qty":48}\n]');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    let items;
    try { items = JSON.parse(itemsText || '[]'); } catch { setError('Items must be valid JSON.'); return; }
    setLoading(true); setData(null); setError(null);
    try { setData(await api.aiSupplierOrder({ supplier, machineId: machineId || undefined, deliver_by: deliverBy || undefined, items })); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <p className="text-xs text-gray-500">PRODUCT-DECISION: order is queued; external EDI/REST submission required.</p>
      <input className="input w-full" placeholder="Supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} required />
      <input className="input w-full" placeholder="Machine ID (optional)" value={machineId} onChange={(e) => setMachineId(e.target.value)} />
      <input className="input w-full" placeholder="Deliver by (YYYY-MM-DD)" value={deliverBy} onChange={(e) => setDeliverBy(e.target.value)} />
      <label className="block text-sm">Items (JSON array):</label>
      <textarea className="input w-full font-mono" rows={4} value={itemsText} onChange={(e) => setItemsText(e.target.value)} />
      <button className="btn btn-primary" disabled={loading}>{loading ? 'Queuing...' : 'Queue Order'}</button>
      <Result data={data} error={error} />
    </form>
  );
}

function IotPanel() {
  const [machineId, setMachineId] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setData(null); setError(null);
    try { setData(await api.aiLocationTracking({ machineId })); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-3 max-w-xl">
      <p className="text-xs text-gray-500">Requires IOT_BROKER_URL and IOT_BROKER_TOKEN env vars.</p>
      <input className="input w-full" placeholder="Machine ID" value={machineId} onChange={(e) => setMachineId(e.target.value)} required />
      <button className="btn btn-primary" disabled={loading}>{loading ? 'Subscribing...' : 'Register IoT Subscription'}</button>
      <Result data={data} error={error} />
    </form>
  );
}
