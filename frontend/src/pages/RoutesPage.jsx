import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';
import AIOutput from '../components/AIOutput';

const columns = [
  { key: 'name', label: 'Route Name' },
  { key: 'driver', label: 'Driver' },
  { key: 'route_date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'estimated_time', label: 'Est. Time (hrs)', type: 'number' },
  { key: 'distance', label: 'Distance (km)', type: 'number' },
];

const formFields = [
  { key: 'name', label: 'Route Name', required: true },
  { key: 'driver', label: 'Driver', required: true },
  { key: 'route_date', label: 'Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'planned', label: 'Planned' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }
  ]},
  { key: 'estimated_time', label: 'Estimated Time (hours)', type: 'number' },
  { key: 'distance', label: 'Distance (km)', type: 'number' },
];

export default function RoutesPage() {
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
    api.getAll('routes').then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      if (editItem) await api.update('routes', editItem.id, formData);
      else await api.create('routes', formData);
      setShowForm(false); setEditItem(null); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete route "${item.name}"?`)) return;
    try { await api.delete('routes', item.id); setSelected(null); load(); }
    catch (err) { alert(err.message); }
  };

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); setSelected(null); };

  const runAI = async () => {
    setShowAI(true); setAiLoading(true); setAiError(null);
    try { setAiResult(await api.aiRoutes()); } catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Route Optimization</h1>
          <p className="text-gray-500 text-sm mt-1">Manage and optimize restocking routes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runAI} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">🤖 AI Optimize Routes</button>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">+ New Route</button>
        </div>
      </div>

      {showAI && <div className="mb-6"><AIOutput data={aiResult} loading={aiLoading} error={aiError} title="AI Route Optimization" /></div>}

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <DataTable columns={columns} data={data} onRowClick={setSelected} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onDelete={handleDelete} title="Route Details" />}
      {showForm && <FormModal fields={formFields} item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Route' : 'New Route'} />}
    </div>
  );
}
