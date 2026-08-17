const WB = 200;
const H = 40;

function wavePath(period: number, amp: number, base: number): string {
  const periods = WB / period;
  let d = `M0,${base}`;
  for (let i = 0; i < periods; i++) {
    const x0 = i * period;
    const peak = base - amp;
    d += `C${x0 + period * 0.24},${base} ${x0 + period * 0.24},${peak} ${x0 + period * 0.5},${peak}`;
    d += `C${x0 + period * 0.76},${peak} ${x0 + period * 0.76},${base} ${x0 + period},${base}`;
  }
  return `${d}L${WB},${H}L0,${H}Z`;
}

const LAYERS = [
  { period: 100, amp: 18, base: 34, speed: 32, reverse: true, fill: 'url(#landscape-g0)', height: 'h-64' },
  { period: 200 / 3, amp: 13, base: 36, speed: 22, fill: 'url(#landscape-g1)', height: 'h-44' },
  { period: 50, amp: 9, base: 38, speed: 15, reverse: true, fill: 'url(#landscape-g2)', height: 'h-28' },
];

export function LandscapeBg() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-indigo-50/70 to-teal-100/60 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/40" />
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full brand-gradient opacity-20 dark:opacity-10 blur-3xl" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 opacity-20 dark:opacity-10 blur-3xl" />

      <svg className="absolute w-0 h-0 overflow-hidden" focusable="false">
        <defs>
          <linearGradient id="landscape-g0" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1a73e8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="landscape-g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="landscape-g2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>

      {LAYERS.map((l, i) => (
        <div
          key={i}
          className={`landscape-anim absolute inset-x-0 bottom-0 ${l.height}`}
          style={{
            animation: `${l.reverse ? 'drift-reverse' : 'drift-forward'} ${l.speed}s linear infinite`,
          }}
        >
          <svg viewBox={`0 0 ${WB} ${H}`} preserveAspectRatio="none" className="w-full h-full">
            <path d={wavePath(l.period, l.amp, l.base)} fill={l.fill} />
          </svg>
        </div>
      ))}
    </div>
  );
}
