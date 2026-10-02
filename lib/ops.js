// データ操作（クライアント／サーバー共通）
export const KEYS = [
  'settings', 'products', 'suppliers', 'warehouses', 'agents',
  'purchaseOrders', 'lots', 'salesOrders', 'invoices', 'expenses', 'adjustments', 'activities',
];

export function applyOps(data, ops) {
  const d = { ...data };
  for (const o of ops) {
    if (o.op === 'set') d[o.key] = o.value;
    else if (o.op === 'upsert') {
      const arr = [...(d[o.key] || [])];
      const i = arr.findIndex(x => x.id === o.item.id);
      if (i >= 0) arr[i] = { ...arr[i], ...o.item };
      else arr.push(o.item);
      d[o.key] = arr;
    } else if (o.op === 'remove') {
      d[o.key] = (d[o.key] || []).filter(x => x.id !== o.id);
    }
  }
  return d;
}

export const touchedKeys = ops => [...new Set(ops.map(o => o.key))].filter(k => KEYS.includes(k));
