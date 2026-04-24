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
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'payment_method', label: 'Payment', render: (val) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      val === 'cash' ? 'bg-green-500/20 text-green-400' :
      val === 'card' ? 'bg-blue-500/20 text-blue-400' :
      'bg-purple-500/20 text-purple-400'
    }`}>{val}</span>
  )},
  { key: 'sold_at', label: 'Sold At', type: 'datetime' },
];

const formFields = [
  { key: 'machine_id', label: 'Machine ID', type: 'number', required: true },
  { key: 'product_id', label: 'Product ID', type: 'number', required: true },
  { key: 'quantity', label: 'Quantity', type: 'number', required: true },
  { key: 'amount', label: 'Amount ($)', type: 'number', required: true },
  { key: 'payment_method', label: 'Payment Method', type: 'select', required: true, options: [
    { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'mobile', label: 'Mobile' },
  ]},
];

export default function Sales() {
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
    api.getAll('sales').then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      if (editItem) await api.update('sales', editItem.id, formData);
      else await api.create('sales', formData);
      setShowForm(false); setEditItem(null); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (item) => {
    if (!confirm('Delete this sale record?')) return;
    try { await api.delete('sales', item.id); setSelected(null); load(); }
    catch (err) { alert(err.message); }
  };

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); setSelected(null); };

  const runAI = async () => {
    setShowAI(true); setAiLoading(true); setAiError(null);
    try { setAiResult(await api.aiSales()); } catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Analyze sales data with AI-powered insights and forecasting</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAI} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">🤖 AI Sales Insights</button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">+ New Sale</button>
        </div>
      </div>

      {showAI && <div className="mb-6"><AIOutput data={aiResult} loading={aiLoading} error={aiError} title="AI Sales Analytics & Forecasting" /></div>}

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <DataTable columns={columns} data={data} onRowClick={setSelected} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onDelete={handleDelete} title="Sale Details" />}
      {showForm && <FormModal fields={formFields} item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Sale' : 'New Sale'} />}
    </div>
  );
}
