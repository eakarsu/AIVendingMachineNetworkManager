import React, { useState, useEffect } from 'react';
import { api } from '../api';
import DataTable from '../components/DataTable';
import DetailModal from '../components/DetailModal';
import FormModal from '../components/FormModal';

const columns = [
  { key: 'name', label: 'Product Name' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price', type: 'currency' },
  { key: 'cost', label: 'Cost', type: 'currency' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'supplier', label: 'Supplier' },
];

const formFields = [
  { key: 'name', label: 'Product Name', required: true },
  { key: 'category', label: 'Category', type: 'select', required: true, options: [
    { value: 'Beverages', label: 'Beverages' }, { value: 'Snacks', label: 'Snacks' },
    { value: 'Candy', label: 'Candy' }, { value: 'Healthy', label: 'Healthy' },
    { value: 'Energy Drinks', label: 'Energy Drinks' }, { value: 'Sports Drinks', label: 'Sports Drinks' },
    { value: 'Hot Beverages', label: 'Hot Beverages' },
  ]},
  { key: 'price', label: 'Price ($)', type: 'number', required: true },
  { key: 'cost', label: 'Cost ($)', type: 'number', required: true },
  { key: 'barcode', label: 'Barcode' },
  { key: 'supplier', label: 'Supplier' },
];

export default function Products() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getAll('products').then(setData).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleSave = async (formData) => {
    try {
      if (editItem) await api.update('products', editItem.id, formData);
      else await api.create('products', formData);
      setShowForm(false); setEditItem(null); load();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete product "${item.name}"?`)) return;
    try { await api.delete('products', item.id); setSelected(null); load(); }
    catch (err) { alert(err.message); }
  };

  const handleEdit = (item) => { setEditItem(item); setShowForm(true); setSelected(null); };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Product Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">Manage products, pricing, and suppliers</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">+ New Product</button>
      </div>
      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <DataTable columns={columns} data={data} onRowClick={setSelected} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onDelete={handleDelete} title="Product Details" />}
      {showForm && <FormModal fields={formFields} item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} title={editItem ? 'Edit Product' : 'New Product'} />}
    </div>
  );
}
