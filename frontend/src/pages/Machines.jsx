import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'model_type', label: 'Model' },
  { key: 'last_serviced', label: 'Last Serviced', type: 'date' },
];

const formFields = [
  { key: 'name', label: 'Machine Name', required: true },
  { key: 'location', label: 'Location', required: true },
  { key: 'status', label: 'Status', type: 'select', options: [
    { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'maintenance', label: 'Maintenance' }
  ]},
  { key: 'capacity', label: 'Capacity', type: 'number' },
  { key: 'model_type', label: 'Model Type', type: 'select', options: [
    { value: 'Standard', label: 'Standard' }, { value: 'Combo Deluxe', label: 'Combo Deluxe' },
    { value: 'Premium XL', label: 'Premium XL' }, { value: 'Health Focus', label: 'Health Focus' },
    { value: 'Outdoor Rugged', label: 'Outdoor Rugged' }, { value: 'Heavy Duty', label: 'Heavy Duty' },
    { value: 'Compact', label: 'Compact' }, { value: 'Quiet Model', label: 'Quiet Model' },
  ]},
  { key: 'lat', label: 'Latitude', type: 'number' },
  { key: 'lng', label: 'Longitude', type: 'number' },
];

export default function Machines() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getAll('machines').then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      if (editItem) {
        await api.update('machines', editItem.id, formData);
      } else {
        await api.create('machines', formData);
      }
      setShowForm(false);
      setEditItem(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete machine "${item.name}"?`)) return;
    try {
      await api.delete('machines', item.id);
      setSelected(null);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowForm(true);
    setSelected(null);
  };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Machine Management</h1>
          <p className="text-gray-500 text-sm mt-1">Monitor and manage all vending machines</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + New Machine
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          onRowClick={setSelected}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {selected && (
        <DetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          title="Machine Details"
        />
      )}

      {showForm && (
        <FormModal
          fields={formFields}
          item={editItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          title={editItem ? 'Edit Machine' : 'New Machine'}
        />
      )}
    </div>
  );
}
