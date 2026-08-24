export interface EnvParseResult {
  rows: Array<{ key: string; value: string }>;
  warnings: string[];
}

export function parseEnvFile(content: string): EnvParseResult {
  const rows: Array<{ key: string; value: string }> = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  content.split(/\r?\n/).forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = rawLine.trim();
    if (!line) return;
    if (line.startsWith('#')) return;

    const eq = line.indexOf('=');
    if (eq < 0) {
      warnings.push(`Linea ${lineNum}: sin '=', ignorada`);
      return;
    }

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();

    if (!key) {
      warnings.push(`Linea ${lineNum}: clave vacia, ignorada`);
      return;
    }
    if (seen.has(key)) {
      warnings.push(`Linea ${lineNum}: clave '${key}' duplicada, ultima gana`);
    }
    seen.add(key);
    rows.push({ key, value });
  });

  return { rows, warnings };
}

export function rowsToObject(rows: Array<{ key: string; value: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of rows) {
    if (key.trim()) out[key] = value;
  }
  return out;
}
