import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'machine_name', label: 'Machine' },
  { key: 'machine_location', label: 'Location' },
  { key: 'type', label: 'Type', render: (val) => (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      val === 'Preventive' ? 'bg-blue-500/20 text-blue-400' :
      val === 'Repair' ? 'bg-red-500/20 text-red-400' :
      val === 'Inspection' ? 'bg-yellow-500/20 text-yellow-400' :
      val === 'Upgrade' ? 'bg-purple-500/20 text-purple-400' :
      'bg-gray-500/20 text-gray-400'
    }`}>{val}</span>
  )},
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'scheduled_date', label: 'Scheduled', type: 'date' },
  { key: 'cost', label: 'Cost', type: 'currency' },
  { key: 'technician', label: 'Technician' },
];

const formFields = [
  { key: 'machine_id', label: 'Machine ID', type: 'number', required: true },
  { key: 'type', label: 'Type', type: 'select', required: true, options: [
    { value: 'Preventive', label: 'Preventive' }, { value: 'Repair', label: 'Repair' },
    { value: 'Inspection', label: 'Inspection' }, { value: 'Upgrade', label: 'Upgrade' },
  ]},
  { key: 'description', label: 'Description', type: 'textarea', required: true },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'scheduled', label: 'Scheduled' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' },
  ]},
  { key: 'scheduled_date', label: 'Scheduled Date', type: 'date', required: true },
  { key: 'completed_date', label: 'Completed Date', type: 'date' },
  { key: 'cost', label: 'Cost ($)', type: 'number' },
  { key: 'technician', label: 'Technician', required: true },
];

export default function Maintenance() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getAll('maintenance').then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      if (editItem) await api.update('maintenance', editItem.id, formData);
      else await api.create('maintenance', formData);
      setShowForm(false); setEditItem(null); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (item) => {
    if (!confirm('Delete this maintenance record?')) return;
    try { await api.delete('maintenance', item.id); setSelected(null); load(); }
    catch (err) { alert(err.message); }
  };

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); setSelected(null); };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Maintenance Tracking</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule and track maintenance tasks</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">+ New Task</button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <DataTable columns={columns} data={data} onRowClick={setSelected} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onDelete={handleDelete} title="Maintenance Details" />}
      {showForm && <FormModal fields={formFields} item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Maintenance Task' : 'New Maintenance Task'} />}
    </div>
  );
}
