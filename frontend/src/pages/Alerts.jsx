import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'machine_name', label: 'Machine' },
  { key: 'type', label: 'Type', render: (val) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      val === 'low_stock' ? 'bg-orange-500/20 text-orange-400' :
      val === 'maintenance' ? 'bg-yellow-500/20 text-yellow-400' :
      val === 'cash_anomaly' ? 'bg-red-500/20 text-red-400' :
      val === 'temperature' ? 'bg-cyan-500/20 text-cyan-400' :
      val === 'connectivity' ? 'bg-blue-500/20 text-blue-400' :
      val === 'vandalism' ? 'bg-red-500/20 text-red-400' :
      val === 'service_due' ? 'bg-yellow-500/20 text-yellow-400' :
      'bg-gray-500/20 text-gray-400'
    }`}>{val?.replace(/_/g, ' ')}</span>
  )},
  { key: 'severity', label: 'Severity', type: 'severity' },
  { key: 'message', label: 'Message' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'created_at', label: 'Time', type: 'datetime' },
];

const formFields = [
  { key: 'machine_id', label: 'Machine ID', type: 'number', required: true },
  { key: 'type', label: 'Alert Type', type: 'select', required: true, options: [
    { value: 'low_stock', label: 'Low Stock' }, { value: 'maintenance', label: 'Maintenance' },
    { value: 'cash_anomaly', label: 'Cash Anomaly' }, { value: 'temperature', label: 'Temperature' },
    { value: 'connectivity', label: 'Connectivity' }, { value: 'vandalism', label: 'Vandalism' },
    { value: 'service_due', label: 'Service Due' }, { value: 'performance', label: 'Performance' },
    { value: 'sales_milestone', label: 'Sales Milestone' },
  ]},
  { key: 'severity', label: 'Severity', type: 'select', required: true, options: [
    { value: 'critical', label: 'Critical' }, { value: 'warning', label: 'Warning' }, { value: 'info', label: 'Info' },
  ]},
  { key: 'message', label: 'Message', type: 'textarea', required: true },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' }, { value: 'acknowledged', label: 'Acknowledged' }, { value: 'resolved', label: 'Resolved' },
  ]},
];

export default function Alerts() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getAll('alerts').then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      if (editItem) await api.update('alerts', editItem.id, formData);
      else await api.create('alerts', formData);
      setShowForm(false); setEditItem(null); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (item) => {
    if (!confirm('Delete this alert?')) return;
    try { await api.delete('alerts', item.id); setSelected(null); load(); }
    catch (err) { alert(err.message); }
  };

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); setSelected(null); };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts & Notifications</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor system alerts and critical notifications</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">+ New Alert</button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <DataTable columns={columns} data={data} onRowClick={setSelected} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onDelete={handleDelete} title="Alert Details" />}
      {showForm && <FormModal fields={formFields} item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Alert' : 'New Alert'} />}
    </div>
  );
}
