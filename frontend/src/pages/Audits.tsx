import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Audit } from '../api/client';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

export function Audits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);

  const loadAudits = (pageNum: number, limitNum?: number) => {
    setLoading(true);
    const limitVal = limitNum ?? limit;
    api.getAudits(pageNum, limitVal)
      .then(res => {
        setAudits(res.items);
        setTotalPages(res.pages);
        setPage(pageNum);
        setSearchParams({ page: String(pageNum), limit: String(limitVal) });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const p = Number(searchParams.get('page')) || 1;
    const l = Number(searchParams.get('limit')) || 20;
    setPage(p);
    setLimit(l);
    loadAudits(p, l);
  }, []);

  if (loading) return <div className="p-6 text-slate-600 dark:text-slate-400">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
        <Clock className="w-7 h-7" />
        Audits
      </h1>
      {audits.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-8 text-center text-slate-600 dark:text-slate-400">
          No audit records yet
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">User</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Action</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Entity</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {audits.map(audit => (
                <tr key={audit.id} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">{audit.user_id ?? 'unknown'}</td>
                  <td className="px-4 py-2 text-sm text-slate-800 dark:text-white">{audit.action}</td>
                  <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">{audit.entity_type}</td>
                  <td className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">{audit.entity_id}</td>
                  <td className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">{new Date(audit.created_at + 'Z').toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  loadAudits(1, Number(e.target.value));
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
                onClick={() => loadAudits(page - 1, limit)}
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
                onClick={() => loadAudits(page + 1, limit)}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}