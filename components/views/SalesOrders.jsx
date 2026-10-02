'use client';
import { useState } from 'react';
import { useStore } from '../store';
import { Btn, Field, Modal, Chip, Empty, PageHead, Tabs, ProductThumb } from '../ui';
import LineEditor from '../LineEditor';
import { go } from '../nav';
import { todayStr, addDays, byId, fmtDate, yen, num, caseSum, totals, stockOf, reservedOf, shipOps, createOrderOps, toCSV, downloadText } from '../../lib/biz';

const ST = { received: ['受付・出荷待ち', 'blue'], shipped: ['出荷済・未入金', 'warn'], paid: ['入金済', 'ok'] };

export function formUrl() {
  if (typeof window === 'undefined') return '';
  if (window.__AG_PREVIEW__) return window.location.href.split('#')[0] + '#/order-form';
  return window.location.origin + '/order';
}

export default function SalesOrders() {
  const { data, commit, toast } = useStore();
  const [tab, setTab] = useState('received');
  const [manual, setManual] = useState(false);
  const [ship, setShip] = useState(null);
  const count = s => data.salesOrders.filter(o => o.status === s).length;
  const list = [...data.salesOrders].filter(o => tab === 'all' || o.status === tab)
    .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));

  const markPaid = async o => {
    await commit([
      { op: 'upsert', key: 'salesOrders', item: { id: o.id, status: 'paid', paidAt: todayStr() } },
      ...(o.invoiceId ? [{ op: 'upsert', key: 'invoices', item: { id: o.invoiceId, status: 'paid', paidAt: todayStr() } }] : []),
    ]);
    toast(`${o.no} を入金済にしました`);
  };
  const cancel = async o => {
    if (!window.confirm(`${o.no} を取り消しますか？ 請求書（${byId(data.invoices, o.invoiceId)?.no || ''}）も削除されます。`)) return;
    await commit([{ op: 'remove', key: 'salesOrders', id: o.id }, ...(o.invoiceId ? [{ op: 'remove', key: 'invoices', id: o.invoiceId }] : [])]);
    toast('受注を取り消しました');
  };
  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(formUrl()); toast('注文フォームのURLをコピーしました'); }
    catch { window.prompt('注文フォームのURL', formUrl()); }
  };
  const exportCSV = () => {
    const out = [['受注No', '受注日', '代理店', '商品', 'ケース', '単価', '金額', '状態', '出荷日', '請求書No']];
    list.forEach(o => o.lines.forEach(l => out.push([o.no, o.date, byId(data.agents, o.agentId)?.name, l.name, l.cases, l.unitPrice, l.cases * l.unitPrice, ST[o.status][0], o.shippedAt || '', byId(data.invoices, o.invoiceId)?.no || ''])));
    downloadText(`受注一覧_${todayStr()}.csv`, toCSV(out));
  };

  return (
    <>
      <PageHead title="受注管理" desc="代理店が注文フォームから注文すると、ここに入り、請求書も自動で作られます。出荷すると在庫が古いロットから減り、原価と粗利が確定します。"
        actions={<>
          <Btn kind="sub" icon="copy" onClick={copyUrl}>注文フォームURL</Btn>
          <Btn icon="plus" onClick={() => setManual(true)}>電話・FAXの注文を入力</Btn>
        </>} />
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'received', label: '出荷待ち', count: count('received') },
        { value: 'shipped', label: '出荷済・未入金', count: count('shipped') },
        { value: 'paid', label: '入金済', count: count('paid') },
        { value: 'all', label: 'すべて', count: data.salesOrders.length },
      ]} />
      {list.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>受注No</th><th>代理店</th><th>内容</th><th className="r">合計（税込）</th><th>状態</th><th></th></tr></thead>
            <tbody>
              {list.map(o => {
                const ag = byId(data.agents, o.agentId);
                const t = totals(o.lines, data.settings.taxRate);
                const gross = o.cogs != null && o.status !== 'received' ? t.subtotal - o.cogs : null;
                return (
                  <tr key={o.id}>
                    <td className="lead"><b className="num">{o.no}</b><span className="muted small block">{fmtDate(o.date)}・{o.source === 'form' ? '注文フォーム' : '手入力'}</span></td>
                    <td data-label="代理店">{ag?.name || '—'}<span className="muted small block">希望日 {fmtDate(o.desiredDate)}</span></td>
                    <td data-label="内容"><span className="small">{o.lines.map(l => `${l.name} ${l.cases}`).join('、')}</span><span className="muted small block">計 {num(caseSum(o.lines))}ケース</span></td>
                    <td data-label="合計（税込）" className="r num">{yen(t.total)}{gross != null && <span className="muted small block">粗利 {yen(gross)}</span>}</td>
                    <td data-label="状態"><Chip tone={ST[o.status][1]}>{ST[o.status][0]}</Chip>{o.shippedAt && <span className="muted small block">出荷 {fmtDate(o.shippedAt)}</span>}</td>
                    <td className="actions">
                      {o.invoiceId && <Btn kind="ghost" size="sm" onClick={() => go('print/invoice/' + o.invoiceId)}>請求書</Btn>}
                      {o.status === 'received' && <><Btn kind="ghost" size="sm" onClick={() => cancel(o)}>取消</Btn><Btn size="sm" icon="truck" onClick={() => setShip(o)}>出荷する</Btn></>}
                      {o.status === 'shipped' && <Btn size="sm" icon="check" onClick={() => markPaid(o)}>入金確認</Btn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <Empty title="この条件の受注はありません">代理店に「注文フォームURL」を送ると、注文がここに届きます。</Empty>}
      {list.length > 0 && <div className="below-table"><Btn kind="ghost" size="sm" icon="download" onClick={exportCSV}>表示中の受注をCSVで書き出す</Btn></div>}
      {manual && <ManualOrder onClose={() => setManual(false)} />}
      {ship && <ShipModal order={ship} onClose={() => setShip(null)} />}
    </>
  );
}

function ManualOrder({ onClose }) {
  const { data, commit, toast } = useStore();
  const products = data.products.filter(p => p.active !== false);
  const [agentId, setAgentId] = useState(data.agents[0]?.id || '');
  const [date, setDate] = useState(todayStr());
  const [deliveryTo, setDeliveryTo] = useState(data.agents[0]?.address || '');
  const [desiredDate, setDesired] = useState(addDays(todayStr(), 3));
  const [note, setNote] = useState('');
  const [lines, setLines] = useState(products[0] ? [{ productId: products[0].id, cases: 1, unitPrice: products[0].salePrice }] : []);
  const [err, setErr] = useState('');
  const t = totals(lines, data.settings.taxRate);
  const save = async () => {
    const L = lines.map(l => ({ ...l, cases: Number(l.cases) || 0, unitPrice: Number(l.unitPrice) || 0 })).filter(l => l.cases > 0);
    if (!agentId) return setErr('代理店を選んでください');
    if (!L.length) return setErr('1ケース以上の商品を入れてください');
    const { order, inv, ops } = createOrderOps(data, { agentId, date, lines: L, deliveryTo, desiredDate, note, source: 'manual' });
    if (await commit(ops)) { toast(`${order.no} を登録し、請求書 ${inv.no} を作成しました`); onClose(); }
  };
  return (
    <Modal title="注文を手入力" onClose={onClose} size="lg"
      footer={<>{err && <span className="form-err">{err}</span>}<Btn kind="ghost" onClick={onClose}>キャンセル</Btn><Btn onClick={save}>受注を登録（請求書も作成）</Btn></>}>
      <div className="grid2">
        <Field label="代理店">
          <select value={agentId} onChange={e => { setAgentId(e.target.value); setDeliveryTo(byId(data.agents, e.target.value)?.address || ''); }}>
            {data.agents.map(a => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select>
        </Field>
        <Field label="受注日"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="納品先"><input type="text" value={deliveryTo} onChange={e => setDeliveryTo(e.target.value)} /></Field>
        <Field label="希望納品日"><input type="date" value={desiredDate} onChange={e => setDesired(e.target.value)} /></Field>
      </div>
      <h3 className="sub-h">商品とケース数</h3>
      <LineEditor lines={lines} onChange={setLines} products={products} priceKey="unitPrice" priceLabel="単価（円/ケース）"
        defaultPrice={p => p.salePrice} formatAmount={yen}
        hint={(p, l) => { const av = stockOf(data.lots, p.id) - reservedOf(data.salesOrders, p.id); return <span className={av < Number(l.cases) ? 'neg' : 'muted'}>出荷できる在庫 {num(av)}ケース</span>; }} />
      <div className="sum-bar"><span>小計 <b className="num">{yen(t.subtotal)}</b></span><span>消費税 <b className="num">{yen(t.tax)}</b></span><span>合計 <b className="num">{yen(t.total)}</b></span></div>
      <Field label="備考" wide><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} /></Field>
    </Modal>
  );
}

function ShipModal({ order, onClose }) {
  const { data, commit, toast } = useStore();
  const [wid, setWid] = useState('');
  const [date, setDate] = useState(todayStr());
  const r = shipOps(data, order, wid, date);
  const t = totals(order.lines, data.settings.taxRate);
  const ok = !r.error;
  const save = async () => { if (!ok) return; if (await commit(r.ops)) { toast(`${order.no} を出荷しました。粗利 ${yen(t.subtotal - r.cogs)}`); onClose(); } };
  return (
    <Modal title={`出荷　${order.no}`} onClose={onClose} size="lg"
      footer={<><Btn kind="ghost" onClick={onClose}>キャンセル</Btn><Btn icon="truck" onClick={save} disabled={!ok}>出荷を確定（在庫を減らす）</Btn></>}>
      <p><b>{byId(data.agents, order.agentId)?.name}</b>　<span className="muted">納品先：{order.deliveryTo || '—'}／希望日 {fmtDate(order.desiredDate)}</span></p>
      <div className="grid2">
        <Field label="出荷する倉庫">
          <select value={wid} onChange={e => setWid(e.target.value)}>
            <option value="">指定なし（全倉庫から古い順）</option>
            {data.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="出荷日"><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
      </div>
      {!ok && <div className="notice notice-danger">{r.error}。倉庫を変えるか、先に発注・入荷処理をしてください。</div>}
      {ok && (
        <>
          <h3 className="sub-h">引き当てるロット（先入先出）</h3>
          <div className="tbl-wrap">
            <table className="tbl tbl-tight">
              <thead><tr><th>商品</th><th>ロット</th><th className="r">ケース</th><th className="r">原価</th><th className="r">売上</th><th className="r">粗利</th></tr></thead>
              <tbody>
                {order.lines.map((l, i) => {
                  const al = r.allocations.filter(a => a.productId === l.productId);
                  const cost = al.reduce((s, a) => s + a.cases * a.unitCostJpy, 0);
                  const sale = l.cases * l.unitPrice;
                  return (
                    <tr key={i}>
                      <td className="lead"><span className="cell-prod"><ProductThumb product={byId(data.products, l.productId)} size={32} />{l.name}</span></td>
                      <td data-label="ロット" className="small">{al.map(a => <span className="block" key={a.lotId}>{fmtDate(a.receivedDate)}入荷 {a.cases}ケース × {yen(a.unitCostJpy)}</span>)}</td>
                      <td data-label="ケース" className="r num">{num(l.cases)}</td>
                      <td data-label="原価" className="r num">{yen(cost)}</td>
                      <td data-label="売上" className="r num">{yen(sale)}</td>
                      <td data-label="粗利" className="r num"><b>{yen(sale - cost)}</b></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sum-bar">
            <span>売上（税抜） <b className="num">{yen(t.subtotal)}</b></span>
            <span>原価 <b className="num">{yen(r.cogs)}</b></span>
            <span>粗利 <b className="num">{yen(t.subtotal - r.cogs)}</b>（{t.subtotal ? Math.round((t.subtotal - r.cogs) / t.subtotal * 1000) / 10 : 0}%）</span>
          </div>
        </>
      )}
    </Modal>
  );
}
