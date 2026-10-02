// 営業支援のロジック（代理店ごとの進捗・売上・フォロー判定）
import { todayStr, addDays, addMonths, ym, totals, caseSum } from './biz';
import { t } from './i18n';

export const STAGES = [
  { id: 'lead', label: t('見込み'), tone: 'plain' },
  { id: 'talk', label: t('商談中'), tone: 'blue' },
  { id: 'proposal', label: t('提案・見積'), tone: 'warn' },
  { id: 'active', label: t('取引中'), tone: 'ok' },
  { id: 'dormant', label: t('休眠'), tone: 'danger' },
];
export const STAGE_BY = Object.fromEntries(STAGES.map(s => [s.id, s]));
export const FLOW = ['lead', 'talk', 'proposal', 'active']; // 進捗バーに出す段階

export const ACT_TYPES = [
  { id: 'visit', label: t('訪問') }, { id: 'call', label: t('電話') }, { id: 'mail', label: t('メール') },
  { id: 'tasting', label: t('試飲会') }, { id: 'quote', label: t('見積') }, { id: 'other', label: t('その他') },
];
export const ACT_LABEL = Object.fromEntries(ACT_TYPES.map(a => [a.id, a.label]));
export const RANKS = ['A', 'B', 'C'];
export const AREAS = ['北海道', '東北', '関東', '中部', '関西', '中国・四国', '九州・沖縄'];

export const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
export const agoLabel = d => (d == null ? '—' : d <= 0 ? t('今日') : d === 1 ? t('昨日') : d < 60 ? t`${d}日前` : t`${Math.floor(d / 30)}か月前`);

// 注文があれば取引中、なければ見込み（stage 未設定の既存データ用）
export const effectiveStage = (agent, hasOrders) => agent.stage || (hasOrders ? 'active' : 'lead');

export function agentStats(data, agent, today = todayStr()) {
  const orders = data.salesOrders.filter(o => o.agentId === agent.id);
  const acts = (data.activities || []).filter(a => a.agentId === agent.id).sort((a, b) => b.date.localeCompare(a.date));
  const stage = effectiveStage(agent, orders.length > 0);

  const lastOrder = orders.reduce((m, o) => (!m || o.date > m ? o.date : m), null);
  const since3m = addDays(today, -90);
  const sales3m = orders.filter(o => o.date >= since3m).reduce((s, o) => s + totals(o.lines).subtotal, 0);
  const salesTotal = orders.reduce((s, o) => s + totals(o.lines).subtotal, 0);
  const m0 = ym(today);
  const series = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(m0, i - 5);
    return { m, sales: orders.filter(o => ym(o.date) === m).reduce((s, o) => s + totals(o.lines).subtotal, 0) };
  });

  const prod = {};
  for (const o of orders) for (const l of o.lines) prod[l.productId] = (prod[l.productId] || 0) + (Number(l.cases) || 0);
  const products = Object.entries(prod).map(([productId, cases]) => ({ productId, cases })).sort((a, b) => b.cases - a.cases);

  const lastAct = acts[0] ? acts[0].date : null;
  const lastContact = [lastAct, lastOrder].filter(Boolean).sort().pop() || null;
  const daysSinceContact = lastContact ? diffDays(lastContact, today) : null;
  const daysSinceOrder = lastOrder ? diffDays(lastOrder, today) : null;

  const nextDate = agent.nextDate || '';
  const overdue = !!nextDate && nextDate < today;
  const dueToday = nextDate === today;
  const soon = !!nextDate && nextDate > today && nextDate <= addDays(today, 7);
  const risk = stage === 'active' && daysSinceOrder != null && daysSinceOrder >= 45;
  const watch = stage === 'active' && daysSinceOrder != null && daysSinceOrder >= 30 && !risk;
  const noPlan = ['lead', 'talk', 'proposal'].includes(stage) && !nextDate;

  // 並び順用（小さいほど要フォロー）
  const pri = overdue ? 0 : dueToday ? 1 : risk ? 2 : soon ? 3 : nextDate ? 4 : 5;

  return {
    agent, stage, orders, acts, lastOrder, sales3m, salesTotal, series, products,
    orderCount: orders.length, cases: orders.reduce((s, o) => s + caseSum(o.lines), 0),
    lastContact, daysSinceContact, daysSinceOrder, nextDate,
    overdue, dueToday, soon, risk, watch, noPlan, pri,
  };
}

export const needsFollow = s => s.overdue || s.dueToday;

export function sortRows(rows, key) {
  const r = [...rows];
  const byName = (a, b) => (a.agent.name || '').localeCompare(b.agent.name || '', 'ja');
  if (key === 'sales') r.sort((a, b) => b.sales3m - a.sales3m || byName(a, b));
  else if (key === 'order') r.sort((a, b) => (b.lastOrder || '').localeCompare(a.lastOrder || '') || byName(a, b));
  else if (key === 'name') r.sort(byName);
  else r.sort((a, b) => a.pri - b.pri || (a.nextDate || '9').localeCompare(b.nextDate || '9') || byName(a, b));
  return r;
}
