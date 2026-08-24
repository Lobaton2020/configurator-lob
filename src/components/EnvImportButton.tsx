import { useRef, useState } from 'react';
import { Upload, ClipboardPaste, FileText, AlertTriangle, X } from 'lucide-react';
import { parseEnvFile, type EnvParseResult } from '../lib/envFile';

export interface KeyValueRow {
  key: string;
  value: string;
}

export type MergeMode = 'replace' | 'overwrite-same' | 'append-all';

interface MergeModalProps {
  parsed: EnvParseResult;
  existing: KeyValueRow[];
  onResolve: (mode: MergeMode) => void;
  onCancel: () => void;
}

function MergeModal({ parsed, existing, onResolve, onCancel }: MergeModalProps) {
  const incomingKeys = new Set(parsed.rows.map((r) => r.key));
  const conflictKeys = existing
    .map((r) => r.key.trim())
    .filter((k) => k && incomingKeys.has(k));

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl w-full max-w-md">
        <div className="p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold">Como fusionar?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              El archivo trae <strong>{parsed.rows.length}</strong> claves.
              Ya hay <strong>{existing.filter((r) => r.key.trim()).length}</strong> claves en el formulario.
              {conflictKeys.length > 0 && (
                <> Hay <strong>{conflictKeys.length}</strong> claves en conflicto: <code className="font-mono text-xs">{conflictKeys.slice(0, 5).join(', ')}{conflictKeys.length > 5 ? '...' : ''}</code></>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onResolve('replace')}
              className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="font-medium text-sm">Reemplazar todo</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Borra las filas actuales y deja solo lo del archivo.
              </div>
            </button>
            <button
              type="button"
              onClick={() => onResolve('overwrite-same')}
              className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="font-medium text-sm">Sobrescribir solo claves repetidas</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mantiene las filas del form; actualiza valor si la KEY ya existe; agrega las nuevas.
              </div>
            </button>
            <button
              type="button"
              onClick={() => onResolve('append-all')}
              className="w-full text-left p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <div className="font-medium text-sm">Agregar como nuevas</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Conserva las filas del form y suma todas las del archivo (renombra si chocan).
              </div>
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ImportModalProps {
  existing: KeyValueRow[];
  onApply: (parsed: EnvParseResult, mode: MergeMode) => void;
  onCancel: () => void;
}

function ImportModal({ existing, onApply, onCancel }: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [source, setSource] = useState<'upload' | 'paste'>('upload');
  const [pasted, setPasted] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      setRawText(text);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo');
    }
  };

  const preview = rawText !== null ? parseEnvFile(rawText) : null;
  const existingKeys = existing.filter((r) => r.key.trim()).length;

  const submit = () => {
    setError(null);
    if (!preview || preview.rows.length === 0) {
      setError('No hay claves validas para importar');
      return;
    }
    onApply(preview, existingKeys === 0 ? 'replace' : 'replace');
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-semibold">Importar .env</h2>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setSource('upload'); setError(null); }}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                source === 'upload'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              Subir archivo
            </button>
            <button
              type="button"
              onClick={() => { setSource('paste'); setError(null); }}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                source === 'paste'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              Pegar contenido
            </button>
          </div>

          {source === 'upload' ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".env,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-center"
              >
                <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                <div className="text-sm font-medium">
                  {fileName ?? 'Click para seleccionar un archivo .env'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Acepta .env o texto plano
                </div>
              </button>
            </div>
          ) : (
            <div>
              <label className="label">Pega el contenido de tu .env (Ctrl + V)</label>
              <textarea
                value={pasted}
                onChange={(e) => {
                  setPasted(e.target.value);
                  setRawText(e.target.value);
                  setFileName(null);
                }}
                placeholder={'KEY1=value1\nKEY2=value2\nKEY3=value3'}
                className="input font-mono text-sm h-40 resize-y"
                spellCheck={false}
                autoFocus
              />
            </div>
          )}

          {error && (
            <div className="alert alert-red">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {preview && preview.rows.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                Vista previa: {preview.rows.length} clave{preview.rows.length === 1 ? '' : 's'}
              </div>
              <div className="max-h-40 overflow-y-auto text-xs font-mono">
                {preview.rows.map((r, i) => (
                  <div key={i} className="flex border-t border-slate-100 dark:border-slate-800">
                    <span className="px-3 py-1 w-1/3 truncate text-slate-700 dark:text-slate-200">{r.key}</span>
                    <span className="px-3 py-1 flex-1 truncate text-slate-500 dark:text-slate-400">{r.value || '(vacio)'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview && preview.warnings.length > 0 && (
            <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
              {preview.warnings.slice(0, 3).map((w, i) => (
                <div key={i}>· {w}</div>
              ))}
              {preview.warnings.length > 3 && <div>· y {preview.warnings.length - 3} mas...</div>}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button
            type="button"
            onClick={submit}
            disabled={!preview || preview.rows.length === 0}
            className="btn-primary"
          >
            {existingKeys > 0 ? 'Siguiente' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EnvImportButtonProps {
  currentRows: KeyValueRow[];
  onApply: (rows: KeyValueRow[]) => void;
  className?: string;
}

export function EnvImportButton({ currentRows, onApply, className }: EnvImportButtonProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [pending, setPending] = useState<EnvParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyMerge = (parsed: EnvParseResult, mode: MergeMode) => {
    const incoming = parsed.rows;
    let next: KeyValueRow[];
    if (mode === 'replace') {
      next = incoming.length ? incoming : [{ key: '', value: '' }];
    } else if (mode === 'overwrite-same') {
      const incomingMap = new Map(incoming.map((r) => [r.key, r.value]));
      const existingKeys = new Set<string>();
      next = currentRows
        .filter((r) => r.key.trim())
        .map((r) => {
          existingKeys.add(r.key.trim());
          const override = incomingMap.get(r.key.trim());
          return override !== undefined ? { key: r.key, value: override } : r;
        });
      for (const r of incoming) {
        if (!existingKeys.has(r.key)) next.push(r);
      }
      if (next.length === 0) next = [{ key: '', value: '' }];
    } else {
      const taken = new Set(currentRows.map((r) => r.key.trim()).filter(Boolean));
      next = [...currentRows.filter((r) => r.key.trim())];
      for (const r of incoming) {
        let key = r.key;
        if (taken.has(key)) {
          let suffix = 1;
          while (taken.has(`${key}_${suffix}`)) suffix++;
          key = `${key}_${suffix}`;
        }
        taken.add(key);
        next.push({ key, value: r.value });
      }
      if (next.length === 0) next = [{ key: '', value: '' }];
    }
    onApply(next);
    setImportOpen(false);
    setPending(null);
  };

  const handleApply = (parsed: EnvParseResult, mode: MergeMode) => {
    const existingKeys = currentRows.filter((r) => r.key.trim()).length;
    if (existingKeys === 0) {
      applyMerge(parsed, mode);
      return;
    }
    setPending(parsed);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className={className ?? 'btn-secondary btn-sm'}
        title="Importar archivo .env o pegar contenido"
      >
        <Upload className="w-3 h-3" />
        Importar .env
      </button>

      {importOpen && (
        <ImportModal
          existing={currentRows}
          onApply={handleApply}
          onCancel={() => { setImportOpen(false); setError(null); }}
        />
      )}

      {pending && (
        <MergeModal
          parsed={pending}
          existing={currentRows}
          onResolve={(mode) => applyMerge(pending, mode)}
          onCancel={() => setPending(null)}
        />
      )}

      {error && (
        <div className="mt-2 alert alert-red text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </>
  );
}
