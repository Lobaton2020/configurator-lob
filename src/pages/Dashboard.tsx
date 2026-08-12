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
    <div className="p-4 lg:p-6">
      <h1 className="page-title mb-6">
        <LayoutDashboard />
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-5 flex items-center gap-4">
          <div className="icon-box icon-box-blue">
            <Database />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{totalSchemas}</div>
            <div className="text-sm text-slate-500">Total Schemas</div>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="icon-box icon-box-green">
            <FileText />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{schemas.length}</div>
            <div className="text-sm text-slate-500">Active Tables</div>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4">
          <div className="icon-box icon-box-violet">
            <Database />
          </div>
          <div>
            <div className="text-3xl font-bold text-slate-800 dark:text-white">{totalSchemas * 3}</div>
            <div className="text-sm text-slate-500">Total Records</div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-violet-500" />
        Recent Schemas
      </h2>

      {schemas.length === 0 ? (
        <div className="text-slate-500">No schemas yet</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Name</th>
                <th className="th">Description</th>
                <th className="th">Created</th>
              </tr>
            </thead>
            <tbody>
              {schemas.map((schema) => (
                <tr key={schema.id} className="tr">
                  <td className="td">
                    <Link to={`/schema/${schema.id}`} className="link flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {schema.name}
                    </Link>
                  </td>
                  <td className="td text-slate-500">{schema.description || '-'}</td>
                  <td className="td text-slate-500 text-sm">
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