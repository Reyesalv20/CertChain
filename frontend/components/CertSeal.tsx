import { ShieldIcon } from './icons';

// Ilustración decorativa (sello) para el panel izquierdo del login.
export function CertSeal() {
  const S = 340;
  const C = 170;
  return (
    <div className="relative flex items-center justify-center" style={{ width: S, height: S }}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: 'absolute', inset: 0 }}>
        <circle cx={C} cy={C} r="162" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="5 7" />
        <circle cx={C} cy={C} r="148" fill="none" stroke="rgba(46,134,171,0.22)" strokeWidth="1.5" />
        <circle cx={C} cy={C} r="130" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <circle cx={C} cy={C} r="128" fill="rgba(255,255,255,0.03)" />
        {Array.from({ length: 48 }).map((_, i) => {
          const angle = (i * 7.5 * Math.PI) / 180;
          const r1 = 150;
          const r2 = i % 4 === 0 ? 158 : 153;
          const x1 = C + r1 * Math.cos(angle);
          const y1 = C + r1 * Math.sin(angle);
          const x2 = C + r2 * Math.cos(angle);
          const y2 = C + r2 * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(46,134,171,0.30)"
              strokeWidth={i % 4 === 0 ? 1.5 : 0.7}
            />
          );
        })}
      </svg>
      <div className="relative flex flex-col items-center gap-2 text-center" style={{ zIndex: 1 }}>
        <ShieldIcon size={68} color="#2E86AB" />
        <span className="font-display text-white leading-tight mt-2" style={{ fontSize: '1.6rem' }}>
          CertChain
        </span>
        <span className="font-mono text-white/30 text-xs uppercase tracking-widest">Registro académico</span>
        <div
          className="mt-4 px-5 py-1.5 rounded-full"
          style={{ border: '1px solid rgba(46,134,171,0.4)', backgroundColor: 'rgba(46,134,171,0.1)' }}
        >
          <span className="font-mono text-xs text-steel">ISO/IEC 27001 · TLS 1.3</span>
        </div>
      </div>
    </div>
  );
}
