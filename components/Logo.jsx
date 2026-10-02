// A&G ロゴ：落款（印）をモチーフに、酒の水面を波線で表現
export function LogoMark({ size = 40, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <rect x="1" y="1" width="46" height="46" rx="10" fill="#1B3F8B" />
      <rect x="4.5" y="4.5" width="39" height="39" rx="7" fill="none" stroke="#FFFFFF" strokeOpacity=".4" strokeWidth="1" />
      <text x="24" y="28.5" textAnchor="middle" fontFamily="'Shippori Mincho B1','Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" fontWeight="800" fontSize="17.5" fill="#FFFFFF" letterSpacing="-0.4">
        A<tspan fill="#9DBBF5" fontSize="13.5" dx="0.6" dy="-1.2">&amp;</tspan><tspan dx="0.6" dy="1.2">G</tspan>
      </text>
      <path d="M11.5 35.2c2.1-1.6 4.2-1.6 6.3 0s4.2 1.6 6.3 0 4.2-1.6 6.3 0 4.2 1.6 6.3 0" fill="none" stroke="#9DBBF5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Brand({ compact }) {
  return (
    <div className="brand">
      <LogoMark size={compact ? 34 : 40} title="A&G" />
      <div className="brand-text">
        <div className="brand-name">A&G一括管理システム</div>
        <div className="brand-sub">A&G企画株式会社</div>
      </div>
    </div>
  );
}
