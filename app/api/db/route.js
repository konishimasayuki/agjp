import { getRedis, PREFIX } from '../../../lib/redis';
import { KEYS, applyOps, touchedKeys } from '../../../lib/ops';

export const dynamic = 'force-dynamic';

// 全データ取得。Upstash 未設定なら mode:'local' を返し、画面側はブラウザ保存で動く
export async function GET() {
  const r = getRedis();
  if (!r) return Response.json({ mode: 'local' });
  try {
    const vals = await r.mget(...KEYS.map(k => PREFIX + k));
    const data = {};
    KEYS.forEach((k, i) => { if (vals[i] != null) data[k] = vals[i]; });
    return Response.json({ mode: 'redis', data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}

// 変更の適用：{ ops: [{op:'set'|'upsert'|'remove', key, ...}] }
export async function POST(req) {
  const r = getRedis();
  if (!r) return Response.json({ error: 'Upstash が設定されていません' }, { status: 501 });
  try {
    const { ops } = await req.json();
    if (!Array.isArray(ops) || !ops.length) return Response.json({ error: 'ops が空です' }, { status: 400 });
    const keys = touchedKeys(ops);
    const vals = await r.mget(...keys.map(k => PREFIX + k));
    let cur = {};
    keys.forEach((k, i) => { cur[k] = vals[i] ?? (k === 'settings' ? {} : []); });
    cur = applyOps(cur, ops.filter(o => keys.includes(o.key)));
    const p = r.pipeline();
    keys.forEach(k => p.set(PREFIX + k, cur[k]));
    await p.exec();
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
}
