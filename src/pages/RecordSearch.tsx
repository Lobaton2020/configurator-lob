import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Schema, type Column, type PaginatedRecords } from '../api/client';

export function RecordSearch() {
  const { id } = useParams<{ id: string }>();
  const schemaId = Number(id);

  const [schema, setSchema] = useState<Schema | null>(null);
  const [filterableCols, setFilterableCols] = useState<Column[]>([]);
  const [results, setResults] = useState<PaginatedRecords | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadColumns();
  }, [schemaId]);

  const loadColumns = async () => {
    setLoading(true);
    try {
      const [schemaData, cols] = await Promise.all([
        api.getSchema(schemaId),
        api.getColumns(schemaId),
      ]);
      setSchema(schemaData);
      setFilterableCols(cols.filter(c => c.is_filterable));
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
      setResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.searchRecords(schemaId, activeFilters, page, 20);
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleFilterChange = (colName: string, value: string) => {
    setFilters((prev: Record<string, string>) => ({ ...prev, [colName]: value }));
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!schema) return <div className="p-6">Schema not found</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Search Records</h1>
      <p className="text-slate-500 mb-6">Filter records by {schema.name} columns</p>

      {filterableCols.length === 0 ? (
        <div className="text-slate-500">No filterable columns in this schema</div>
      ) : (
        <form onSubmit={handleSearch} className="mb-8 p-4 bg-white rounded-lg shadow border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {filterableCols.map((col) => (
              <div key={col.id}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{col.name}</label>
                <input
                  type={col.data_type === 'number' ? 'number' : 'text'}
                  value={filters[col.name] || ''}
                  onChange={(e) => handleFilterChange(col.name, e.target.value)}
                  placeholder={`Filter by ${col.name}`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            ))}
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
      )}

      {results && (
        <div>
          <div className="mb-4 text-slate-600">
            Found {results.total} record{results.total !== 1 ? 's' : ''}
          </div>

          {results.items.length === 0 ? (
            <div className="text-slate-500">No records match the filters</div>
          ) : (
            <div className="space-y-3">
              {results.items.map((rec) => (
                <div key={rec.id} className="p-4 bg-white rounded-lg shadow border border-slate-200">
                  <pre className="text-sm text-slate-700 font-mono">{JSON.stringify(rec.data, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}

          {results.pages > 1 && (
            <div className="flex gap-2 justify-center mt-6">
              {Array.from({ length: results.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-1 rounded ${page === p ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}