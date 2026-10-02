'use client';
import { useStore } from '../store';
import { Icon } from '../icons';
import { Chip, ProductThumb } from '../ui';
import { href } from '../nav';
import { agentStats, needsFollow } from '../../lib/sales';
import { todayStr, ym, addMonths, fmtDateLong, fmtDate, fmtMonth, yen, num, monthPL, stockOf, reservedOf, incomingOf, totals, byId, caseSum } from '../../lib/biz';

export default function Dashboard() {
  const { data } = useStore();
  const t = todayStr(), m = ym(t);
  const pending = data.salesOrders.filter(o => o.status === 'received');
  const incoming = data.purchaseOrders.filter(p => p.status === 'sent');
  const drafts = data.purchaseOrders.filter(p => p.status === 'draft');
  const unpaid = data.invoices.filter(i => i.status === 'unpaid');
  const overdue = unpaid.filter(i => i.dueDate < t);
  const stockRows = data.products.filter(p => p.active !== false).map(p => {
    const stock = stockOf(data.lots, p.id), res = reservedOf(data.salesOrders, p.id);
    return { p, stock, avail: stock - res, inc: incomingOf(data.purchaseOrders, p.id) };
  });
  const low = stockRows.filter(r => r.avail <= (r.p.reorderPoint || 0));
  const pl = monthPL(data, m);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(m, i - 5));
  const series = months.map(mm => ({ m: mm, ...monthPL(data, mm) }));
  const max = Math.max(1, ...series.map(s => s.sales));
  const recent = [...data.salesOrders].sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date)).slice(0, 6);
  const maxStock = Math.max(1, ...stockRows.map(r => Math.max(r.stock, r.p.reorderPoint || 0)));

  const followRows = data.agents.map(a => agentStats(data, a, t)).filter(needsFollow);
  const todos = [
    { n: pending.length, label: '出荷待ちの受注', detail: pending.length ? `${num(pending.reduce((s, o) => s + caseSum(o.lines), 0))}ケース分を倉庫から出荷` : '新しい注文はまだありません', to: 'orders', icon: 'truck' },
    { n: followRows.length, label: '今日までにフォローする代理店', detail: followRows.length ? followRows.slice(0, 3).map(r => r.agent.name).join('、') + (followRows.length > 3 ? ' ほか' : '') : '期限の来ている営業アクションはありません', to: 'sales', icon: 'users', tone: followRows.some(r => r.overdue) ? 'warn' : '' },
    { n: low.length, label: '発注点を下回った商品', detail: low.length ? low.slice(0, 3).map(r => r.p.name).join('、') + (low.length > 3 ? ' ほか' : '') : '在庫は足りています', to: 'inventory', icon: 'box', tone: low.length ? 'warn' : '' },
    { n: drafts.length, label: '未送信の発注書', detail: drafts.length ? drafts.map(d => d.no).join('、') : '下書きはありません', to: 'purchase', icon: 'send' },
    { n: incoming.length, label: '中国からの入荷待ち', detail: incoming.length ? incoming.map(p => `${p.no}（納期 ${fmtDate(p.deliveryDate)}）`).join('、') : '入荷待ちはありません', to: 'purchase', icon: 'inbox' },
    { n: overdue.length, label: '支払期限を過ぎた請求', detail: overdue.length ? yen(overdue.reduce((s, i) => s + i.total, 0)) + ' が未入金' : `未入金 ${unpaid.length}件 ${yen(unpaid.reduce((s, i) => s + i.total, 0))}（期限内）`, to: 'invoices', icon: 'doc', tone: overdue.length ? 'danger' : '' },
  ];

  return (
    <div className="dash">
      <section className="dash-hero">
        <div className="dash-date">{fmtDateLong(t)}</div>
        <h1 className="dash-title">今日やること</h1>
        <ul className="todo">
          {todos.map(td => (
            <li key={td.label}>
              <a href={href(td.to)} className={'todo-item' + (td.n ? '' : ' done') + (td.tone ? ' todo-' + td.tone : '')}>
                <span className="todo-n num">{td.n}</span>
                <span className="todo-body"><span className="todo-label">{td.label}</span><span className="todo-detail">{td.detail}</span></span>
                <Icon name="chev" size={18} className="todo-chev" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head"><h2>{fmtMonth(m)}の損益</h2><span className="muted small">出荷日ベース・税抜／原価は入荷ロットの先入先出</span></div>
        <div className="pl-flow">
          <div className="pl-cell"><span className="pl-label">売上</span><span className="pl-val num">{yen(pl.sales)}</span><span className="pl-sub">{pl.count}件出荷</span></div>
          <span className="pl-op" aria-hidden="true">−</span>
          <div className="pl-cell"><span className="pl-label">売上原価</span><span className="pl-val num">{yen(pl.cogs)}</span></div>
          <span className="pl-op" aria-hidden="true">=</span>
          <div className="pl-cell"><span className="pl-label">粗利</span><span className="pl-val num">{yen(pl.gross)}</span><span className="pl-sub">粗利率 {pl.sales ? Math.round(pl.gross / pl.sales * 1000) / 10 : 0}%</span></div>
          <span className="pl-op" aria-hidden="true">−</span>
          <div className="pl-cell"><span className="pl-label">経費</span><span className="pl-val num">{yen(pl.exp)}</span></div>
          <span className="pl-op" aria-hidden="true">=</span>
          <div className={'pl-cell pl-result' + (pl.op < 0 ? ' neg' : '')}><span className="pl-label">営業利益</span><span className="pl-val num">{yen(pl.op)}</span></div>
        </div>
        <div className="mchart" role="img" aria-label="過去6か月の売上と粗利">
          {series.map(s => (
            <div className="mchart-col" key={s.m}>
              <div className="mchart-bars">
                <span className="mbar mbar-sales" style={{ height: `${(s.sales / max) * 100}%` }} title={`売上 ${yen(s.sales)}`} />
                <span className="mbar mbar-gross" style={{ height: `${(Math.max(0, s.gross) / max) * 100}%` }} title={`粗利 ${yen(s.gross)}`} />
              </div>
              <span className="mchart-label">{Number(s.m.slice(5))}月</span>
            </div>
          ))}
          <div className="mchart-legend"><span><i className="lg-sales" />売上</span><span><i className="lg-gross" />粗利</span></div>
        </div>
      </section>

      <div className="dash-cols">
        <section className="panel">
          <div className="panel-head"><h2>最近の受注</h2><a href={href('orders')} className="small">すべて見る</a></div>
          <ul className="mini-list">
            {recent.map(o => {
              const ag = byId(data.agents, o.agentId);
              const st = { received: ['出荷待ち', 'blue'], shipped: ['出荷済', 'warn'], paid: ['入金済', 'ok'] }[o.status];
              return (
                <li key={o.id}>
                  <div><b>{ag ? ag.name : '—'}</b><div className="muted small num">{o.no}・{fmtDate(o.date)}・{o.source === 'form' ? '注文フォーム' : '手入力'}</div></div>
                  <div className="r"><div className="num">{yen(totals(o.lines, data.settings.taxRate).total)}</div><Chip tone={st[1]}>{st[0]}</Chip></div>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>在庫の状況</h2><a href={href('inventory')} className="small">在庫管理へ</a></div>
          <ul className="stock-bars">
            {stockRows.map(r => (
              <li key={r.p.id}>
                <ProductThumb product={r.p} size={32} />
                <div className="sb-main">
                  <div className="sb-top"><span>{r.p.name}</span><span className="num">{num(r.avail)}<span className="muted small"> / 在庫 {num(r.stock)}</span></span></div>
                  <div className="sb-track">
                    <span className={'sb-fill' + (r.avail <= (r.p.reorderPoint || 0) ? ' low' : '')} style={{ width: `${Math.max(0, r.avail) / maxStock * 100}%` }} />
                    <span className="sb-mark" style={{ left: `${(r.p.reorderPoint || 0) / maxStock * 100}%` }} title="発注点" />
                  </div>
                  {r.inc > 0 && <div className="muted small">入荷待ち {num(r.inc)}ケース</div>}
                </div>
              </li>
            ))}
          </ul>
          <p className="muted small">数字は「出荷できる数（在庫 − 出荷待ち）」。縦線は発注点です。</p>
        </section>
      </div>
    </div>
  );
}
