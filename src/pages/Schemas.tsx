import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, type Schema, type Column } from '../api/client';
import { Plus, Edit, Trash2, FileText, Type, Hash, ToggleLeft, Braces } from 'lucide-react';

export function Schemas() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [valueType, setValueType] = useState('json');
  const [columns, setColumns] = useState<{ name: string; data_type: string; is_filterable: boolean }[]>([
    { name: 'Value', data_type: 'json', is_filterable: false }
  ]);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('string');
  const [newColFilterable, setNewColFilterable] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    setLoading(true);
    try {
      const data = await api.getSchemas();
      setSchemas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (schema: Schema) => {
    setEditingId(schema.id);
    setName(schema.name);
    setDescription(schema.description || '');
    setShowForm(true);
    
    const cols = await api.getColumns(schema.id);
    const colData = cols.map((c: Column) => ({ name: c.name, data_type: c.data_type, is_filterable: c.is_filterable }));
    setColumns(colData);
    setValueType(colData.find(c => c.name === 'Value')?.data_type || 'json');
  };

  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    if (columns.some(c => c.name === newColName)) return;
    setColumns([...columns, { name: newColName, data_type: newColType, is_filterable: newColFilterable }]);
    setNewColName('');
    setNewColType('string');
    setNewColFilterable(true);
  };

  const handleRemoveColumn = (colName: string) => {
    setColumns(columns.filter(c => c.name !== colName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.updateSchema(editingId, { name, description });
        
        const existingCols = await api.getColumns(editingId);
        for (const col of existingCols) {
          if (!columns.find(c => c.name === col.name)) {
            await api.deleteColumn(editingId, col.id);
          }
        }
        
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          const existing = existingCols.find((c: Column) => c.name === col.name);
          if (existing) {
            await api.updateColumn(editingId, existing.id, {
              name: col.name,
              data_type: col.data_type as 'string' | 'number' | 'boolean' | 'json',
              is_filterable: col.is_filterable,
              order: i,
            });
          } else {
            await api.createColumn(editingId, {
              name: col.name,
              data_type: col.data_type as 'string' | 'number' | 'boolean' | 'json',
              is_filterable: col.is_filterable,
              order: i,
            });
          }
        }
      } else {
        const newSchema = await api.createSchema({ name, description });
        for (const col of columns) {
          await api.createColumn(newSchema.id, {
            name: col.name,
            data_type: col.data_type as 'string' | 'number' | 'boolean' | 'json',
            is_filterable: col.is_filterable,
            order: columns.indexOf(col),
          });
        }
      }
      
      setName('');
      setDescription('');
      setValueType('json');
      setColumns([{ name: 'Value', data_type: 'json', is_filterable: false }]);
      setShowForm(false);
      setEditingId(null);
      loadSchemas();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setValueType('json');
    setColumns([{ name: 'Value', data_type: 'json', is_filterable: false }]);
    setShowForm(false);
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete schema?')) return;
    try {
      await api.deleteSchema(id);
      loadSchemas();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-6 text-slate-900">Loading...</div>;

  return (
    <div className="p-4 lg:p-6 text-slate-800 dark:text-white">
      <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
        <h1 className="page-title">
          <FileText />
          Schemas
        </h1>
        <button onClick={() => { handleCancel(); setShowForm(!showForm); }} className={showForm ? 'btn-secondary' : 'btn-primary'}>
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Schema'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 card p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {editingId ? 'Edit Name' : 'Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Columns</label>
              <div className="space-y-2 mb-3">
                {columns.map((col, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{col.name}</span>
                    <span className="text-slate-500">({col.data_type})</span>
                    {!col.is_filterable && <span className="text-slate-400 text-xs">no filter</span>}
                    {col.name !== 'Value' && (
                      <button type="button" onClick={() => handleRemoveColumn(col.name)} className="ml-auto text-red-600 hover:text-red-800">
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex gap-2 items-center mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Value type:</span>
                <select
                  value={valueType}
                  onChange={(e) => {
                    setValueType(e.target.value);
                    setColumns([{ name: 'Value', data_type: e.target.value, is_filterable: false }]);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="json">json</option>
                </select>
              </div>
              
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="Column name"
                    className="input"
                  />
                </div>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="string"><Type className="w-4 h-4 inline" /> string</option>
                  <option value="number"><Hash className="w-4 h-4 inline" /> number</option>
                  <option value="boolean"><ToggleLeft className="w-4 h-4 inline" /> boolean</option>
                  <option value="json"><Braces className="w-4 h-4 inline" /> json</option>
                </select>
                <label className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={newColFilterable}
                    onChange={(e) => setNewColFilterable(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Filter
                </label>
                <button type="button" onClick={handleAddColumn} className="btn-primary">
                  + Add
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editingId ? 'Update Schema' : 'Create Schema'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {schemas.length === 0 ? (
        <div className="text-slate-600 dark:text-slate-400">No schemas yet</div>
      ) : (
        <div className="space-y-3">
          {schemas.map((schema) => (
            <div key={schema.id} className="card p-4 flex justify-between items-center gap-3 hover:shadow-md transition-shadow">
              <Link to={`/schema/${schema.id}`} className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900 hover:text-violet-600 dark:text-slate-300">{schema.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{schema.description}</p>
              </Link>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleEdit(schema)} className="btn-ghost btn-sm">
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button onClick={() => handleDelete(schema.id)} className="btn-danger btn-sm">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}