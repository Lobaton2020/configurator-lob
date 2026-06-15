import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api, type Schema, type Column, type ConfigRecord, type PaginatedRecords } from '../api/client';
import { Table, Database, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

type Tab = 'data' | 'metadata' | 'search';

export function SchemaDetail() {
  const { id } = useParams<{ id: string }>();
  const schemaId = Number(id);
  
  const [tab, setTab] = useState<Tab>('data');
  const [schema, setSchema] = useState<Schema | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [records, setRecords] = useState<ConfigRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [editingRecord, setEditingRecord] = useState<number | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecordData, setNewRecordData] = useState<Record<string, unknown>>({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search state
  const [filterableCols, setFilterableCols] = useState<Column[]>([]);
  const [searchResults, setSearchResults] = useState<PaginatedRecords | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const p = Number(searchParams.get('page')) || 1;
    const l = Number(searchParams.get('limit')) || 20;
    const t = searchParams.get('tab') as Tab;
    setPage(p);
    setLimit(l);
    if (t === 'data' || t === 'metadata' || t === 'search') setTab(t);
  }, []);

  useEffect(() => {
    loadData();
  }, [schemaId, page, limit]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [schemaData, colsData, recsData] = await Promise.all([
        api.getSchema(schemaId),
        api.getColumns(schemaId),
        api.getRecords(schemaId, page, limit),
      ]);
      setSchema(schemaData);
      setColumns(colsData);
      setRecords(recsData.items);
      setTotalRecords(recsData.total);
      setTotalPages(recsData.pages);
      setFilterableCols(colsData.filter(c => c.is_filterable));
      setSearchParams({ page: String(page), limit: String(limit), tab });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v && v.trim() !== '')
    );
    if (Object.keys(activeFilters).length === 0) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchRecords(schemaId, activeFilters, 1, 50);
      setSearchResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleEditStart = (record: ConfigRecord) => {
    setEditingRecord(record.id);
    setEditData({ ...record.data });
  };

  const handleEditSave = async (recordId: number) => {
    try {
      await api.updateRecord(schemaId, recordId, editData);
      setEditingRecord(null);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditCancel = () => {
    setEditingRecord(null);
    setEditData({});
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('Delete record?')) return;
    try {
      await api.deleteRecord(schemaId, recordId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createRecord(schemaId, newRecordData);
      setShowAddForm(false);
      setNewRecordData({});
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-6 text-slate-600 dark:text-slate-400">Loading...</div>;
  if (!schema) return <div className="p-6 text-slate-600 dark:text-slate-400">Schema not found</div>;

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => { setTab('data'); setSearchParams({ ...Object.fromEntries(searchParams), tab: 'data' }); }}
          className={`flex items-center gap-2 pb-2 px-1 ${tab === 'data' ? 'border-b-2 border-slate-600 text-slate-800 dark:text-white' : 'text-slate-500'}`}
        >
          <Table className="w-4 h-4" />
          Data
        </button>
        <button
          onClick={() => { setTab('metadata'); setSearchParams({ ...Object.fromEntries(searchParams), tab: 'metadata' }); }}
          className={`flex items-center gap-2 pb-2 px-1 ${tab === 'metadata' ? 'border-b-2 border-slate-600 text-slate-800 dark:text-white' : 'text-slate-500'}`}
        >
          <Database className="w-4 h-4" />
          Metadata
        </button>
        <button
          onClick={() => { setTab('search'); setSearchParams({ ...Object.fromEntries(searchParams), tab: 'search' }); }}
          className={`flex items-center gap-2 pb-2 px-1 ${tab === 'search' ? 'border-b-2 border-slate-600 text-slate-800 dark:text-white' : 'text-slate-500'}`}
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Data Tab */}
      {tab === 'data' && (
        <>
          {showAddForm && (
            <div className="mb-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
              <h3 className="font-medium text-slate-800 dark:text-white mb-3">Add New Record</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {columns.map((col) => (
                  <div key={col.id}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {col.name} ({col.data_type})
                    </label>
                    {col.data_type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={!!newRecordData[col.name]}
                        onChange={(e) => setNewRecordData({ ...newRecordData, [col.name]: e.target.checked })}
                        className="w-5 h-5"
                      />
                    ) : col.data_type === 'json' ? (
                      <textarea
                        value={JSON.stringify(newRecordData[col.name] || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            setNewRecordData({ ...newRecordData, [col.name]: JSON.parse(e.target.value) });
                          } catch {}
                        }}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono text-sm"
                        rows={3}
                      />
                    ) : (
                      <input
                        type={col.data_type === 'number' ? 'number' : 'text'}
                        value={String(newRecordData[col.name] || '')}
                        onChange={(e) => setNewRecordData({ ...newRecordData, [col.name]: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddRecord} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Save
                </button>
                <button onClick={() => { setShowAddForm(false); setNewRecordData({}); }} className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
<button onClick={() => setShowAddForm(!showAddForm)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Cancel' : 'Add Record'}
        </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((col) => (
                    <th key={col.id} className="px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                      {col.name} <span className="text-xs text-slate-400">({col.data_type})</span>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={columns.length + 1} className="px-3 py-8 text-center text-slate-500">No records</td></tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="border-t border-slate-100">
                      {columns.map((col) => (
                        <td key={col.id} className="px-3 py-2">
                          {editingRecord === record.id ? (
                            col.data_type === 'boolean' ? (
                              <input type="checkbox" checked={!!editData[col.name]} onChange={(e) => setEditData({ ...editData, [col.name]: e.target.checked })} className="w-4 h-4" />
                            ) : col.data_type === 'json' ? (
                              <textarea value={JSON.stringify(editData[col.name] || {}, null, 2)} onChange={(e) => { try { setEditData({ ...editData, [col.name]: JSON.parse(e.target.value) }); } catch {} }} className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono" rows={2} />
                            ) : (
                              <input type={col.data_type === 'number' ? 'number' : 'text'} value={String(editData[col.name] || '')} onChange={(e) => setEditData({ ...editData, [col.name]: e.target.value })} className="w-full px-2 py-1 border border-slate-300 rounded" />
                            )
                          ) : (
                            <span className={`text-sm ${col.data_type === 'json' ? 'font-mono text-xs' : ''}`}>
                              {col.data_type === 'json' ? JSON.stringify(record.data[col.name] || {}) : String(record.data[col.name] ?? '')}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        {editingRecord === record.id ? (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleEditSave(record.id)} className="text-green-600 hover:text-green-800 text-sm">Save</button>
                            <button onClick={handleEditCancel} className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-white text-sm">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleEditStart(record)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                            <button onClick={() => handleDeleteRecord(record.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Show</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                    loadData();
                  }}
                  className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-slate-600 dark:text-slate-400">per page</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPage(page - 1); loadData(); }}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => { setPage(page + 1); loadData(); }}
                  disabled={page === totalPages || totalPages === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Metadata Tab */}
      {tab === 'metadata' && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{schema.name}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{schema.description}</p>
          
          <h3 className="font-medium text-slate-800 dark:text-white mb-3">Columns</h3>
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Type</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Filterable</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Order</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((col) => (
                  <tr key={col.id} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-4 py-2 text-slate-800 dark:text-white">{col.name}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{col.data_type}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{col.is_filterable ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{col.order}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 text-sm text-slate-500">
            <p>Created: {new Date(schema.created_at + 'Z').toLocaleString()}</p>
            <p>Updated: {new Date(schema.updated_at).toLocaleString()}</p>
            <p>Total Records: {totalRecords}</p>
          </div>
        </div>
      )}

      {/* Search Tab */}
      {tab === 'search' && (
        <>
          {filterableCols.length === 0 ? (
            <div className="text-slate-500">No filterable columns in this schema</div>
          ) : (
            <form onSubmit={handleSearch} className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {filterableCols.map((col) => (
                  <div key={col.id}>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{col.name}</label>
                    <input
                      type={col.data_type === 'number' ? 'number' : 'text'}
                      value={filters[col.name] || ''}
                      onChange={(e) => setFilters({ ...filters, [col.name]: e.target.value })}
                      placeholder={`Filter by ${col.name}`}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg"
                    />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={searching} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>
          )}

          {searchResults && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                Found {searchResults.total} record{searchResults.total !== 1 ? 's' : ''}
              </div>
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.id} className="px-3 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchResults.items.map((record) => (
                    <tr key={record.id} className="border-t border-slate-100">
                      {columns.map((col) => (
                        <td key={col.id} className="px-3 py-2 text-sm">
                          {col.data_type === 'json' ? JSON.stringify(record.data[col.name] || {}) : String(record.data[col.name] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
</tbody>
            </table>
          </div>
          )}
        </>
      )}
    </div>
  );
}