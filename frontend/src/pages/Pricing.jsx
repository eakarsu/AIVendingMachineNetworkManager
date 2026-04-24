import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIOutput from '../components/AIOutput';

const columns = [
  { key: 'product_name', label: 'Product' },
  { key: 'machine_name', label: 'Machine' },
  { key: 'base_price', label: 'Base Price', type: 'currency' },
  { key: 'current_price', label: 'Current Price', type: 'currency' },
  { key: 'rule_type', label: 'Rule Type', render: (val) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      val === 'standard' ? 'bg-gray-500/20 text-gray-400' :
      val === 'demand_surge' ? 'bg-red-500/20 text-red-400' :
      val === 'location_premium' ? 'bg-blue-500/20 text-blue-400' :
      val === 'student_discount' ? 'bg-green-500/20 text-green-400' :
      val === 'time_based' ? 'bg-yellow-500/20 text-yellow-400' :
      val === 'volume_discount' ? 'bg-purple-500/20 text-purple-400' :
      'bg-orange-500/20 text-orange-400'
    }`}>{val?.replace(/_/g, ' ')}</span>
  )},
  { key: 'active', label: 'Active', type: 'boolean' },
];

const formFields = [
  { key: 'product_id', label: 'Product ID', type: 'number', required: true },
  { key: 'machine_id', label: 'Machine ID', type: 'number' },
  { key: 'base_price', label: 'Base Price ($)', type: 'number', required: true },
  { key: 'current_price', label: 'Current Price ($)', type: 'number', required: true },
  { key: 'rule_type', label: 'Rule Type', type: 'select', options: [
    { value: 'standard', label: 'Standard' }, { value: 'demand_surge', label: 'Demand Surge' },
    { value: 'location_premium', label: 'Location Premium' }, { value: 'student_discount', label: 'Student Discount' },
    { value: 'time_based', label: 'Time Based' }, { value: 'volume_discount', label: 'Volume Discount' },
    { value: 'event_pricing', label: 'Event Pricing' },
  ]},
  { key: 'active', label: 'Active', type: 'select', options: [
    { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }
  ]},
];

export default function Pricing() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [showAI, setShowAI] = useState(false);

  const load = () => {
    setLoading(true);
    api.getAll('pricing').then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      const processed = { ...formData, active: formData.active === 'true' || formData.active === true };
      if (editItem) await api.update('pricing', editItem.id, processed);
      else await api.create('pricing', processed);
      setShowForm(false); setEditItem(null); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (item) => {
    if (!confirm('Delete this pricing rule?')) return;
    try { await api.delete('pricing', item.id); setSelected(null); load(); }
    catch (err) { alert(err.message); }
  };

  const handleEdit = (item) => { setEditItem({ ...item, active: String(item.active) }); setShowForm(true); setSelected(null); };

  const runAI = async () => {
    setShowAI(true); setAiLoading(true); setAiError(null);
    try { setAiResult(await api.aiPricing()); } catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dynamic Pricing</h1>
          <p className="text-gray-500 text-sm mt-1">Manage pricing rules and AI-driven optimizations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAI} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">🤖 AI Pricing Suggestions</button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">+ New Rule</button>
        </div>
      </div>

      {showAI && <div className="mb-6"><AIOutput data={aiResult} loading={aiLoading} error={aiError} title="AI Dynamic Pricing Analysis" /></div>}

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <DataTable columns={columns} data={data} onRowClick={setSelected} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onDelete={handleDelete} title="Pricing Rule Details" />}
      {showForm && <FormModal fields={formFields} item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Pricing Rule' : 'New Pricing Rule'} />}
    </div>
  );
}
