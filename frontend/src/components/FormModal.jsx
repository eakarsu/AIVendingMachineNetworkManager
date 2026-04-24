import React, { useState, useEffect } from 'react';

export default function FormModal({ fields, item, onSave, onClose, title }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (item) {
      setForm({ ...item });
    } else {
      const defaults = {};
      fields.forEach(f => { defaults[f.key] = f.default || ''; });
      setForm(defaults);
    }
  }, [item, fields]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const processed = { ...form };
    fields.forEach(f => {
      if (f.type === 'number' && processed[f.key] !== '' && processed[f.key] !== undefined) {
        processed[f.key] = Number(processed[f.key]);
      }
    });
    onSave(processed);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-800 border border-gray-700/50 rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white">{title || (item ? 'Edit Record' : 'New Record')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 overflow-y-auto max-h-[55vh] space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                {f.label}
                {f.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {f.type === 'select' ? (
                <select
                  value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-primary-500"
                  required={f.required}
                >
                  <option value="">Select...</option>
                  {f.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-primary-500 min-h-[80px]"
                  required={f.required}
                />
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                  step={f.type === 'number' ? '0.01' : undefined}
                  value={form[f.key] || ''}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:border-primary-500"
                  required={f.required}
                  placeholder={f.placeholder || ''}
                />
              )}
            </div>
          ))}
        </form>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-700/50 bg-dark-900/50">
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {item ? 'Update' : 'Create'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
