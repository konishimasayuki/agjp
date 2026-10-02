'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { applyOps, KEYS } from '../lib/ops';
import { seedData, DEMO_IMAGES, COMPANY } from '../lib/seed';
import { t } from '../lib/i18n';

const LS_KEY = 'ag-ikkatsu-v1';
const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

const normalize = d => { const o = { ...(d || {}) }; for (const k of KEYS) if (o[k] == null) o[k] = k === 'settings' ? {} : [];
  o.products = o.products.map(p => (p.image === undefined && DEMO_IMAGES[p.id] ? { ...p, image: DEMO_IMAGES[p.id] } : p));
  // 旧デモの会社情報（A&G企画株式会社）を、正しい社名・住所などに置き換える
  const c = o.settings && o.settings.company;
  if (c && c.name === 'A&G企画株式会社') o.settings = { ...o.settings, company: { ...c, ...COMPANY } };
  return o;
};
function writeLocal(d) { try { localStorage.setItem(LS_KEY, JSON.stringify(d)); return true; } catch { return false; } }
function readLocal() {
  try { const s = localStorage.getItem(LS_KEY); if (s) return normalize(JSON.parse(s)); } catch {}
  const d = seedData(); writeLocal(d); return d;
}
async function fetchRemote() {
  if (typeof window !== 'undefined' && window.__AG_PREVIEW__) return null;
  const r = await fetch('/api/db', { cache: 'no-store' });
  if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null;
  return r.json();
}
async function postOps(ops) {
  const r = await fetch('/api/db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops }) });
  if (!r.ok) throw new Error('save failed');
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(null);
  const [mode, setMode] = useState('loading');
  const [saving, setSaving] = useState(0);
  const [toasts, setToasts] = useState([]);
  const dataRef = useRef(null), modeRef = useRef('loading'), savingRef = useRef(0);
  const put = d => { dataRef.current = d; setData(d); };

  const toast = useCallback((msg, tone = 'ok') => {
    const id = Math.random();
    setToasts(t => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), tone === 'danger' ? 5200 : 3000);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      let j = null;
      try { j = await fetchRemote(); } catch {}
      if (!alive) return;
      if (j && j.mode === 'redis') {
        let d = normalize(j.data);
        if (!j.data || !j.data.settings || !j.data.settings.company) {
          d = seedData();
          try { await postOps(KEYS.map(k => ({ op: 'set', key: k, value: d[k] }))); } catch {}
        }
        modeRef.current = 'redis'; setMode('redis'); put(d);
      } else {
        modeRef.current = 'local'; setMode('local'); put(readLocal());
      }
    })();
    return () => { alive = false; };
  }, []);

  // Upstash 利用時は、代理店フォームからの新しい注文を拾うため定期的に読み直す
  useEffect(() => {
    if (mode !== 'redis') return;
    const refresh = async () => {
      if (document.hidden || savingRef.current > 0) return;
      try { const j = await fetchRemote(); if (j && j.mode === 'redis' && j.data && savingRef.current === 0) put(normalize(j.data)); } catch {}
    };
    const iv = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(iv); window.removeEventListener('focus', refresh); };
  }, [mode]);

  const commit = useCallback(async ops => {
    const next = applyOps(dataRef.current, ops);
    put(next);
    if (modeRef.current !== 'redis') {
      if (!writeLocal(next)) { toast(t('ブラウザの保存容量を超えました。画像を減らすか、Upstash に接続してください'), 'danger'); return false; }
      return true;
    }
    savingRef.current++; setSaving(s => s + 1);
    try { await postOps(ops); return true; }
    catch { toast(t('保存できませんでした。通信状態を確認して、もう一度お試しください'), 'danger'); return false; }
    finally { savingRef.current--; setSaving(s => s - 1); }
  }, [toast]);

  const resetDemo = useCallback(async () => {
    const d = seedData();
    await commit(KEYS.map(k => ({ op: 'set', key: k, value: d[k] })));
  }, [commit]);

  const value = useMemo(() => ({ data, mode, saving, commit, toast, resetDemo }), [data, mode, saving, commit, toast, resetDemo]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts no-print" role="status" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={'toast toast-' + t.tone}>{t.msg}</div>)}
      </div>
    </Ctx.Provider>
  );
}
