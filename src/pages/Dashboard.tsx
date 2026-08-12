import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, type Schema } from '../api/client';
import { LayoutDashboard, Database, FileText } from 'lucide-react';

export function Dashboard() {
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSchemas()
      .then(setSchemas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-slate-600 dark:text-slate-400">Loading...</div>;

  const totalSchemas = schemas.length;

  return (
    <div className="p-6 text-slate-800 dark:text-white">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
        <LayoutDashboard className="w-7 h-7" />
        Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Database className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{totalSchemas}</div>
            <div className="text-sm text-slate-500">Total Schemas</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{schemas.length}</div>
            <div className="text-sm text-slate-500">Active Tables</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Database className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{totalSchemas * 3}</div>
            <div className="text-sm text-slate-500">Total Records</div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Recent Schemas
      </h2>
      
      {schemas.length === 0 ? (
        <div className="text-slate-500">No schemas yet</div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Created</th>
              </tr>
            </thead>
            <tbody>
              {schemas.map((schema) => (
                <tr key={schema.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/schema/${schema.id}`} className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {schema.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{schema.description || '-'}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {new Date(schema.created_at).toLocaleString(undefined, { timeZoneName: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}