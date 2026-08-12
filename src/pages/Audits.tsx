import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Search, X, Eye } from 'lucide-react';
import { ApiError, auditsApi, type AuditDto } from '../api/audits';

function highlight(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${safe})`, 'ig');
  const parts = text.split(re);
  return parts.map((p, i) => (re.test(p) ? <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5">{p}</mark> : p));
}

function matches(audit: AuditDto, term: string): boolean {
  if (!term) return true;
  const hay = [
    String(audit.id),
    audit.user_id,
    audit.action,
    audit.entity_type,
    audit.entity_id,
    JSON.stringify(audit.old_data ?? {}),
    JSON.stringify(audit.new_data ?? {}),
  ].join(' | ').toLowerCase();
  return hay.includes(term.toLowerCase());
}

export function Audits() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [audits, setAudits] = useState<AuditDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  // sincronizacion URL <-> estado
  useEffect(() => {
    const p = Number(searchParams.get('page')) || 1;
    const l = Number(searchParams.get('limit')) || 20;
    const qu = searchParams.get('q') ?? '';
    setPage(p);
    setLimit(l);
    setQ(qu);
    setDebouncedQ(qu);
  }, []); // una sola vez

  // debounce de busqueda para no bombardear al backend en cada keystroke
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => setDebouncedQ(q), 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q]);

  const load = (pageNum: number, limitNum: number, query: string) => {
    setLoading(true);
    setError(null);
    auditsApi
      .list({ page: pageNum, limit: limitNum, q: query })
      .then((res) => {
        setAudits(res.items);
        setTotal(res.total);
        setTotalPages(res.pages);
        setPage(res.page);
        setSearchParams({ page: String(res.page), limit: String(res.limit), q: query });
      })
      .catch((err: ApiError) => {
        setError(err.message);
        setAudits([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  };

  // carga inicial segun URL
  useEffect(() => {
    const p = Number(searchParams.get('page')) || 1;
    const l = Number(searchParams.get('limit')) || 20;
    const qu = searchParams.get('q') ?? '';
    load(p, l, qu);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refetch al cambiar el termino de busqueda (debounced)
  useEffect(() => {
    load(1, limit, debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const filtered = useMemo(() => audits.filter((a) => matches(a, debouncedQ)), [audits, debouncedQ]);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">
          <Clock />
          Audits
        </h1>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {total} registros
        </div>
      </div>

      <div className="card mb-4 p-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en id, user, action, entity, old_data, new_data..."
            className="input pl-10 pr-10"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Limpiar"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
        <select
          value={limit}
          onChange={(e) => load(1, Number(e.target.value), debouncedQ)}
          className="input w-auto"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-red mb-4">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-400">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-600 dark:text-slate-400">
            {total === 0 ? 'No hay registros todavía' : 'Nada coincide con la búsqueda'}
          </div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th className="th">ID</th>
                  <th className="th">Fecha</th>
                  <th className="th">User</th>
                  <th className="th">Action</th>
                  <th className="th">Entity</th>
                  <th className="th">Entity ID</th>
                  <th className="th text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const isOpen = expanded === a.id;
                  return (
                    <Fragment key={a.id}>
                      <tr className="tr align-top">
                        <td className="td font-mono text-slate-500">{highlight(String(a.id), debouncedQ)}</td>
                        <td className="td text-slate-500 whitespace-nowrap">
                          {new Date(a.created_at + 'Z').toLocaleString()}
                        </td>
                        <td className="td text-slate-500">{highlight(a.user_id ?? 'unknown', debouncedQ)}</td>
                        <td className="td">
                          <span className={`badge ${actionClass(a.action)}`}>
                            {highlight(a.action, debouncedQ)}
                          </span>
                        </td>
                        <td className="td text-slate-700 dark:text-slate-200">{highlight(a.entity_type, debouncedQ)}</td>
                        <td className="td font-mono text-slate-500 max-w-[12rem] truncate" title={a.entity_id}>
                          {highlight(a.entity_id, debouncedQ)}
                        </td>
                        <td className="td text-right">
                          <button
                            onClick={() => setExpanded(isOpen ? null : a.id)}
                            className="link inline-flex items-center gap-1 text-xs"
                          >
                            <Eye className="w-3 h-3" /> {isOpen ? 'Ocultar' : 'Detalle'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50 dark:bg-slate-800/40">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="grid md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <div className="font-semibold text-slate-500 dark:text-slate-400 mb-1">old_data</div>
                                <pre className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
                                  {a.old_data ? JSON.stringify(a.old_data, null, 2) : '—'}
                                </pre>
                              </div>
                              <div>
                                <div className="font-semibold text-slate-500 dark:text-slate-400 mb-1">new_data</div>
                                <pre className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2 overflow-auto max-h-48 text-slate-700 dark:text-slate-300">
                                  {a.new_data ? JSON.stringify(a.new_data, null, 2) : '—'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Página {page} de {totalPages} · {total} registros
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => load(page - 1, limit, debouncedQ)}
                  disabled={page === 1 || loading}
                  className="btn-secondary"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => load(page + 1, limit, debouncedQ)}
                  disabled={page === totalPages || loading}
                  className="btn-secondary"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function actionClass(action: string): string {
  if (action === 'create' || action === 'deploy')
    return 'badge-green';
  if (action === 'update')
    return 'badge-blue';
  if (action === 'delete' || action === 'undeploy')
    return 'badge-red';
  if (action === 'status')
    return 'badge-amber';
  return 'badge-gray';
}
