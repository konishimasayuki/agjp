'use client';
import { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { Brand, LogoMark } from './Logo';
import { Icon } from './icons';
import LangSwitch from './LangSwitch';
import { href } from './nav';
import Dashboard from './views/Dashboard';
import SalesSupport from './views/SalesSupport';
import { agentStats, needsFollow } from '../lib/sales';
import PurchaseOrders from './views/PurchaseOrders';
import Inventory from './views/Inventory';
import SalesOrders, { formUrl } from './views/SalesOrders';
import Invoices from './views/Invoices';
import Products from './views/Products';
import Expenses from './views/Expenses';
import Masters from './views/Masters';
import OrderForm from './views/OrderForm';
import PrintView from './views/PrintView';
import { t } from '../lib/i18n';

const NAV = [
  { group: null, items: [{ id: '', label: t('ダッシュボード'), icon: 'home', C: Dashboard }] },
  { group: t('営業'), items: [{ id: 'sales', label: t('営業支援'), icon: 'users', C: SalesSupport, badge: 'follow' }] },
  { group: t('仕入'), items: [{ id: 'purchase', label: t('中国への発注'), icon: 'send', C: PurchaseOrders }, { id: 'inventory', label: t('在庫管理'), icon: 'box', C: Inventory }] },
  { group: t('販売'), items: [{ id: 'orders', label: t('受注管理'), icon: 'inbox', C: SalesOrders, badge: 'received' }, { id: 'invoices', label: t('請求書'), icon: 'doc', C: Invoices }] },
  { group: t('管理'), items: [{ id: 'products', label: t('商品登録'), icon: 'tag', C: Products }, { id: 'expenses', label: t('経費'), icon: 'yen', C: Expenses }, { id: 'masters', label: t('マスタ・設定'), icon: 'gear', C: Masters }] },
];
const ROUTES = Object.fromEntries(NAV.flatMap(g => g.items).map(i => [i.id, i]));

function useHash() {
  const [h, setH] = useState(null);
  useEffect(() => {
    const f = () => setH(window.location.hash.replace(/^#\/?/, ''));
    f(); window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return h;
}

export default function App({ publicForm = false }) {
  return <StoreProvider><Root publicForm={publicForm} /></StoreProvider>;
}

function Root({ publicForm }) {
  const hash = useHash();
  const { data, mode, saving } = useStore();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [hash]);
  useEffect(() => {
    if (!open) return;
    const h = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [open]);

  if (!data || hash === null) return <div className="loading"><LogoMark size={52} /><span suppressHydrationWarning>{t("読み込み中…")}</span></div>;
  const [page, ...rest] = hash.split('/');
  if (publicForm || page === 'order-form') return <OrderForm />;
  if (page === 'print') return <PrintView kind={rest[0]} id={rest[1]} />;
  const route = ROUTES[page] || ROUTES[''];
  const View = route.C;
  const pendingCount = data.salesOrders.filter(o => o.status === 'received').length;
  const followCount = data.agents.filter(a => needsFollow(agentStats(data, a))).length;
  const badges = { received: pendingCount, follow: followCount };

  return (
    <div className="shell">
      <aside className={'side' + (open ? ' open' : '')} aria-label={t("メニュー")}>
        <div className="side-brand"><Brand /></div>
        <nav className="nav">
          {NAV.map((g, gi) => (
            <div key={gi}>
              {g.group && <div className="nav-group">{g.group}</div>}
              {g.items.map(it => (
                <a key={it.id} href={href(it.id)} className={route.id === it.id ? 'active' : ''} aria-current={route.id === it.id ? 'page' : undefined}>
                  <Icon name={it.icon} />{it.label}
                  {it.badge && badges[it.badge] > 0 && <span className="nav-badge num">{badges[it.badge]}</span>}
                </a>
              ))}
            </div>
          ))}
          <div className="nav-group">{t("代理店向け")}</div>
          <a href={formUrl()} target="_blank" rel="noreferrer"><Icon name="link" />{t("注文フォームを開く")}</a>
        </nav>
        <div className="side-lang"><LangSwitch /></div>
        <div className="side-foot">
          <span className={'dot ' + (mode === 'redis' ? 'dot-ok' : 'dot-local') + (saving ? ' dot-busy' : '')} />
          {saving ? t('保存中…') : mode === 'redis' ? t('Upstash に保存') : t('このブラウザに保存（デモ）')}
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <header className="topbar">
        <Brand compact />
        <div className="topbar-right">
        <LangSwitch />
        <button type="button" className={'burger' + (open ? ' on' : '')} onClick={() => setOpen(o => !o)} aria-label={open ? t('メニューを閉じる') : t('メニューを開く')} aria-expanded={open}>
          <span /><span /><span />
          {!open && pendingCount + followCount > 0 && <i className="burger-badge" />}
        </button>
        </div>
      </header>
      <main className="main"><div className="main-inner" key={route.id}><View /></div></main>
    </div>
  );
}
