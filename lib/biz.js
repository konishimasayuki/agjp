// 業務ロジック（クライアント／サーバー共通）
export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);
const z = n => String(n).padStart(2, '0');
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
export const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return todayStr(d); };
export const ym = s => (s || '').slice(0, 7);
export const addMonths = (m, n) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}`;
};
export const fmtDate = s => (s ? s.slice(0, 10).replaceAll('-', '/') : '—');
export const fmtMonth = m => { const [y, mo] = m.split('-'); return `${y}年${Number(mo)}月`; };
const WD = '日月火水木金土';
export const fmtDateLong = s => { const d = new Date(s + 'T00:00:00'); return `${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`; };
export const num = n => (Number(n) || 0).toLocaleString('ja-JP', { maximumFractionDigits: 2 });
export const yen = n => '¥' + Math.round(Number(n) || 0).toLocaleString('ja-JP');
export const rmb = n => (Number(n) || 0).toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' 元';
export const cnyF = n => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const byId = (arr, id) => (arr || []).find(x => x.id === id);
export const spec = p => (p ? `${p.volumeMl}ml × ${p.perCase}本` : '');

export const EXPENSE_CATS = ['運送費', '倉庫保管料', '通関・手数料', '広告宣伝費', '旅費交通費', '通信費', '交際費', '消耗品費', '支払手数料', '地代家賃', 'その他'];
export const PAY_METHODS = ['振込', 'カード', '現金', '口座振替'];

export function nextNo(prefix, list, dateStr = todayStr()) {
  const p = `${prefix}-${dateStr.slice(2, 4)}${dateStr.slice(5, 7)}-`;
  const max = (list || []).filter(x => x.no && x.no.startsWith(p))
    .reduce((m, x) => Math.max(m, parseInt(x.no.slice(p.length), 10) || 0), 0);
  return p + String(max + 1).padStart(3, '0');
}

export const caseSum = lines => (lines || []).reduce((s, l) => s + (Number(l.cases) || 0), 0);
export const lineSum = (lines, key) => (lines || []).reduce((s, l) => s + (Number(l.cases) || 0) * (Number(l[key]) || 0), 0);

export function totals(lines, taxRate = 10) {
  const subtotal = Math.round(lineSum(lines, 'unitPrice'));
  const tax = Math.floor(subtotal * taxRate / 100);
  return { subtotal, tax, total: subtotal + tax };
}

// ---- 在庫 ----
export const stockOf = (lots, pid, wid) => lots.filter(l => l.productId === pid && (!wid || l.warehouseId === wid)).reduce((s, l) => s + l.remaining, 0);
export const stockValue = (lots, pid, wid) => lots.filter(l => (!pid || l.productId === pid) && (!wid || l.warehouseId === wid)).reduce((s, l) => s + l.remaining * l.unitCostJpy, 0);
export const reservedOf = (orders, pid) => orders.filter(o => o.status === 'received')
  .reduce((s, o) => s + o.lines.filter(l => l.productId === pid).reduce((a, l) => a + Number(l.cases), 0), 0);
export const incomingOf = (pos, pid) => pos.filter(p => p.status === 'sent')
  .reduce((s, p) => s + p.lines.filter(l => l.productId === pid).reduce((a, l) => a + Number(l.cases), 0), 0);

// 古い入荷から順に引き当て（先入先出）。lots は呼び出し側で複製済みのものを渡すこと
export function allocateFIFO(lots, pid, cases, wid) {
  const cand = lots.filter(l => l.productId === pid && l.remaining > 0 && (!wid || l.warehouseId === wid))
    .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate) || (a.poNo || '').localeCompare(b.poNo || ''));
  let need = cases; const allocs = [];
  for (const l of cand) {
    if (need <= 0) break;
    const take = Math.min(need, l.remaining);
    allocs.push({ lotId: l.id, cases: take, unitCostJpy: l.unitCostJpy, receivedDate: l.receivedDate, poNo: l.poNo });
    l.remaining -= take; need -= take;
  }
  return { allocs, short: need };
}

// 出荷：在庫を引き当て、原価を確定する操作を作る
export function shipOps(data, order, wid, date) {
  const lots = data.lots.map(l => ({ ...l }));
  const allocations = []; let cogs = 0;
  for (const line of order.lines) {
    const { allocs, short } = allocateFIFO(lots, line.productId, Number(line.cases), wid);
    if (short > 0) {
      const p = byId(data.products, line.productId);
      return { error: `${p ? p.name : '商品'} の在庫が ${short} ケース足りません` };
    }
    for (const a of allocs) { cogs += a.cases * a.unitCostJpy; allocations.push({ ...a, productId: line.productId }); }
  }
  const changed = lots.filter((l, i) => l.remaining !== data.lots[i].remaining);
  return {
    cogs, allocations,
    ops: [
      ...changed.map(l => ({ op: 'upsert', key: 'lots', item: { id: l.id, remaining: l.remaining } })),
      { op: 'upsert', key: 'salesOrders', item: { id: order.id, status: 'shipped', shippedAt: date, shipWarehouseId: wid || '', allocations, cogs } },
    ],
  };
}

// 入荷：発注からロット（仕入単価ごとの在庫のかたまり）を作る
export function buildLots(po, { date, rate, extraTotal, lines, warehouseId }) {
  const total = caseSum(lines);
  const extraPer = total ? (Number(extraTotal) || 0) / total : 0;
  return lines.filter(l => Number(l.cases) > 0).map(l => ({
    id: uid(), productId: l.productId, warehouseId, poId: po.id, poNo: po.no,
    receivedDate: date, cases: Number(l.cases), remaining: Number(l.cases),
    unitCny: Number(l.unitCny), rate: Number(rate), extraPerCase: Math.round(extraPer),
    unitCostJpy: Math.round(Number(l.unitCny) * Number(rate) + extraPer),
  }));
}

export function buildInvoice({ order, settings, invoices, date }) {
  const t = totals(order.lines, settings.taxRate);
  return {
    id: uid(), no: nextNo('INV', invoices, date), issueDate: date,
    dueDate: addDays(date, Number(settings.paymentTermsDays) || 30),
    orderId: order.id, orderNo: order.no, agentId: order.agentId,
    lines: order.lines.map(l => ({ ...l })), taxRate: settings.taxRate, ...t, status: 'unpaid',
  };
}

// 受注作成（注文フォーム・手入力 共通）→ 請求書も自動作成
export function createOrderOps(data, { agentId, date, lines, deliveryTo, desiredDate, note, source }) {
  const snap = lines.map(l => {
    const p = byId(data.products, l.productId) || {};
    return { productId: l.productId, name: p.name, perCase: p.perCase, volumeMl: p.volumeMl, cases: Number(l.cases), unitPrice: Number(l.unitPrice) };
  });
  const order = {
    id: uid(), no: nextNo('SO', data.salesOrders, date), date, agentId, lines: snap,
    deliveryTo, desiredDate, note, status: 'received', source, createdAt: new Date().toISOString(),
  };
  const inv = buildInvoice({ order, settings: data.settings, invoices: data.invoices, date });
  order.invoiceId = inv.id;
  const ops = [{ op: 'upsert', key: 'salesOrders', item: order }, { op: 'upsert', key: 'invoices', item: inv }];
  // 注文が入った代理店は自動で「取引中」にする（営業支援の進捗）
  const ag = byId(data.agents, agentId);
  if (ag && ag.stage && ag.stage !== 'active') ops.push({ op: 'upsert', key: 'agents', item: { id: ag.id, stage: 'active' } });
  return { order, inv, ops };
}

// 月次損益（出荷日ベース）
export function monthPL(data, m) {
  const shipped = data.salesOrders.filter(o => (o.status === 'shipped' || o.status === 'paid') && ym(o.shippedAt) === m);
  const sales = shipped.reduce((s, o) => s + totals(o.lines).subtotal, 0);
  const cogs = shipped.reduce((s, o) => s + (o.cogs || 0), 0);
  const exp = data.expenses.filter(e => ym(e.date) === m).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return { sales, cogs, gross: sales - cogs, exp, op: sales - cogs - exp, count: shipped.length };
}

export function downloadText(filename, text, type = 'text/csv') {
  const blob = new Blob([type === 'text/csv' ? '\ufeff' + text : text], { type: type + ';charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export const toCSV = rows => rows.map(r => r.map(v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s;
}).join(',')).join('\r\n');

export function compressImage(file, max = 520, q = 0.74) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('画像を読み込めませんでした')); };
    img.src = url;
  });
}
