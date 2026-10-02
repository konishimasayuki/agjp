'use client';
import { ProductThumb } from './ui';

// 商品明細の入力（発注・受注 共通）
export default function LineEditor({ lines, onChange, products, priceKey, priceLabel, defaultPrice, formatAmount, hint }) {
  const set = (i, patch) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const add = () => {
    const p = products.find(x => !lines.some(l => l.productId === x.id)) || products[0];
    if (!p) return;
    onChange([...lines, { productId: p.id, cases: 1, [priceKey]: defaultPrice(p) }]);
  };
  return (
    <div className="lines">
      {lines.map((l, i) => {
        const p = products.find(x => x.id === l.productId);
        return (
          <div className="line" key={i}>
            <span className="line-thumb"><ProductThumb product={p} size={40} /></span>
            <label className="line-prod">
              <span className="mini-label">商品</span>
              <select value={l.productId} onChange={e => { const np = products.find(x => x.id === e.target.value); set(i, { productId: np.id, [priceKey]: defaultPrice(np) }); }}>
                {products.map(x => <option key={x.id} value={x.id}>{x.name}（{x.volumeMl}ml×{x.perCase}）</option>)}
              </select>
            </label>
            <label className="line-cases">
              <span className="mini-label">ケース</span>
              <input type="number" min="0" inputMode="numeric" value={l.cases} onChange={e => set(i, { cases: e.target.value })} />
            </label>
            <label className="line-price">
              <span className="mini-label">{priceLabel}</span>
              <input type="number" min="0" step="any" inputMode="decimal" value={l[priceKey]} onChange={e => set(i, { [priceKey]: e.target.value })} />
            </label>
            <div className="line-amt num">
              <span className="mini-label">金額</span>
              {formatAmount((Number(l.cases) || 0) * (Number(l[priceKey]) || 0))}
            </div>
            <button type="button" className="icon-btn line-del" onClick={() => onChange(lines.filter((_, j) => j !== i))} aria-label="この行を削除">×</button>
            {hint && p && <div className="line-hint">{hint(p, l)}</div>}
          </div>
        );
      })}
      <button type="button" className="btn btn-ghost btn-sm add-line" onClick={add}>＋ 商品を追加</button>
    </div>
  );
}
