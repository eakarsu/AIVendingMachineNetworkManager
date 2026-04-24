import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIOutput from '../components/AIOutput';

const columns = [
  { key: 'machine_name', label: 'Machine' },
  { key: 'machine_location', label: 'Location' },
  { key: 'record_date', label: 'Date', type: 'date' },
  { key: 'expected_amount', label: 'Expected', type: 'currency' },
  { key: 'actual_amount', label: 'Actual', type: 'currency' },
  { key: 'variance', label: 'Variance', type: 'variance' },
  { key: 'status', label: 'Status', type: 'status' },
];

const formFields = [
  { key: 'machine_id', label: 'Machine ID', type: 'number', required: true },
  { key: 'record_date', label: 'Date', type: 'date', required: true },
  { key: 'expected_amount', label: 'Expected Amount ($)', type: 'number', required: true },
  { key: 'actual_amount', label: 'Actual Amount ($)', type: 'number', required: true },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'pending', label: 'Pending' }, { value: 'reconciled', label: 'Reconciled' },
    { value: 'flagged', label: 'Flagged' }, { value: 'under_review', label: 'Under Review' },
  ]},
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function Cash() {
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
    api.getAll('cash').then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      if (editItem) await api.update('cash', editItem.id, formData);
      else await api.create('cash', formData);
      setShowForm(false); setEditItem(null); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (item) => {
    if (!confirm('Delete this cash record?')) return;
    try { await api.delete('cash', item.id); setSelected(null); load(); }
    catch (err) { alert(err.message); }
  };

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); setSelected(null); };

  const runAI = async () => {
    setShowAI(true); setAiLoading(true); setAiError(null);
    try { setAiResult(await api.aiCash()); } catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cash Reconciliation</h1>
          <p className="text-gray-500 text-sm mt-1">Track and reconcile cash collections with AI anomaly detection</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAI} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">🤖 AI Anomaly Detection</button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">+ New Record</button>
        </div>
      </div>

      {showAI && <div className="mb-6"><AIOutput data={aiResult} loading={aiLoading} error={aiError} title="AI Cash Reconciliation Analysis" /></div>}

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <DataTable columns={columns} data={data} onRowClick={setSelected} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onDelete={handleDelete} title="Cash Record Details" />}
      {showForm && <FormModal fields={formFields} item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Cash Record' : 'New Cash Record'} />}
    </div>
  );
}
