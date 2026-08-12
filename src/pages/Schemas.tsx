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
    <div className="p-6 text-slate-800 dark:text-white dark:text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-7 h-7" />
          Schemas
        </h1>
        <button onClick={() => { handleCancel(); setShowForm(!showForm); }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Schema'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {editingId ? 'Edit Name' : 'Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Columns</label>
              <div className="space-y-2 mb-3">
                {columns.map((col, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded">
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
                  className="px-2 py-1 border border-slate-300 rounded-lg text-sm"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <select
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  className="px-2 py-1.5 border border-slate-300 rounded-lg"
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
                <button type="button" onClick={handleAddColumn} className="px-2 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  + Add
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Update Schema' : 'Create Schema'}
              </button>
              <button type="button" onClick={handleCancel} className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg">
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
            <div key={schema.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 flex justify-between items-center">
              <Link to={`/schema/${schema.id}`} className="flex-1">
                <h3 className="font-medium text-slate-900 hover:text-slate-700 dark:text-slate-300">{schema.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{schema.description}</p>
              </Link>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(schema)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
                <button onClick={() => handleDelete(schema.id)} className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
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