import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIOutput from '../components/AIOutput';

const columns = [
  { key: 'machine_name', label: 'Machine' },
  { key: 'product_name', label: 'Product' },
  { key: 'product_category', label: 'Category' },
  { key: 'quantity', label: 'Qty', type: 'number' },
  { key: 'max_quantity', label: 'Max', type: 'number' },
  { key: 'slot_number', label: 'Slot' },
  { key: 'last_restocked', label: 'Last Restocked', type: 'date' },
  { key: 'quantity', label: 'Stock Level', render: (val, row) => {
    const pct = row.max_quantity > 0 ? (row.quantity / row.max_quantity * 100) : 0;
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct < 20 ? 'bg-red-500' : pct < 50 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-gray-400">{Math.round(pct)}%</span>
      </div>
    );
  }},
];

const formFields = [
  { key: 'machine_id', label: 'Machine ID', type: 'number', required: true },
  { key: 'product_id', label: 'Product ID', type: 'number', required: true },
  { key: 'quantity', label: 'Quantity', type: 'number', required: true },
  { key: 'max_quantity', label: 'Max Quantity', type: 'number', required: true },
  { key: 'slot_number', label: 'Slot Number', required: true },
];

export default function Inventory() {
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
    api.getAll('inventory').then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      if (editItem) await api.update('inventory', editItem.id, formData);
      else await api.create('inventory', formData);
      setShowForm(false); setEditItem(null); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (item) => {
    if (!confirm('Delete this inventory record?')) return;
    try { await api.delete('inventory', item.id); setSelected(null); load(); }
    catch (err) { alert(err.message); }
  };

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); setSelected(null); };

  const runAI = async () => {
    setShowAI(true); setAiLoading(true); setAiError(null);
    try {
      const result = await api.aiReplenishment();
      setAiResult(result);
    } catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track stock levels across all machines</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAI} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
            🤖 AI Replenishment Prediction
          </button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">+ New Record</button>
        </div>
      </div>

      {showAI && (
        <div className="mb-6">
          <AIOutput data={aiResult} loading={aiLoading} error={aiError} title="AI Replenishment Prediction" />
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <DataTable columns={columns} data={data} onRowClick={setSelected} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onDelete={handleDelete} title="Inventory Details" />}
      {showForm && <FormModal fields={formFields} item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Inventory' : 'New Inventory Record'} />}
    </div>
  );
}
