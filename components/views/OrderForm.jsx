'use client';
import { useState } from 'react';
import { useStore } from '../store';
import { Brand } from '../Logo';
import { Btn, Field, Stepper, ProductThumb } from '../ui';
import { Icon } from '../icons';
import { todayStr, addDays, byId, yen, num, totals, stockOf, reservedOf, spec, createOrderOps, fmtDate } from '../../lib/biz';
import { t } from '../../lib/i18n';
import LangSwitch from '../LangSwitch';

// 代理店向けの注文フォーム（ログイン不要のデモ）
export default function OrderForm() {
  const { data, commit } = useStore();
  const products = data.products.filter(p => p.active !== false);
  const [agentId, setAgentId] = useState('');
  const [qty, setQty] = useState({});
  const [deliveryTo, setDeliveryTo] = useState('');
  const [desiredDate, setDesired] = useState(addDays(todayStr(), 3));
  const [note, setNote] = useState('');
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const lines = products.filter(p => qty[p.id] > 0).map(p => ({ productId: p.id, cases: qty[p.id], unitPrice: p.salePrice }));
  const tot = totals(lines, data.settings.taxRate);
  const cases = lines.reduce((s, l) => s + l.cases, 0);

  const submit = async () => {
    setErr('');
    if (!agentId) { setErr(t('ご注文の代理店を選んでください')); document.getElementById('of-agent')?.focus(); return; }
    if (!lines.length) { setErr(t('商品のケース数を入れてください')); return; }
    if (!deliveryTo.trim()) { setErr(t('お届け先を入れてください')); return; }
    setSending(true);
    const { order, inv, ops } = createOrderOps(data, { agentId, date: todayStr(), lines, deliveryTo, desiredDate, note, source: 'form' });
    const ok = await commit(ops);
    setSending(false);
    if (ok) { setDone({ order, inv, tot, cases }); window.scrollTo(0, 0); }
    else setErr(t('送信できませんでした。通信状態を確認して、もう一度お試しください'));
  };

  if (done) {
    return (
      <div className="of">
        <header className="of-head"><Brand compact /><LangSwitch /></header>
        <main className="of-main">
          <section className="of-done">
            <span className="of-done-mark"><Icon name="check" size={30} /></span>
            <h1>{t("ご注文を受け付けました")}</h1>
            <p>{byId(data.agents, agentId)?.name}{' '}{t("様、ありがとうございます。出荷準備ができ次第ご連絡します。")}</p>
            <dl className="of-done-dl">
              <dt>{t("注文番号")}</dt><dd className="num">{done.order.no}</dd>
              <dt>{t("数量")}</dt><dd className="num">{num(done.cases)}{' '}{t("ケース")}</dd>
              <dt>{t("ご請求予定額")}</dt><dd className="num">{yen(done.tot.total)}{t("（税込）")}</dd>
              <dt>{t("請求書番号")}</dt><dd className="num">{done.inv.no}</dd>
              <dt>{t("希望納品日")}</dt><dd>{fmtDate(done.order.desiredDate)}</dd>
            </dl>
            <Btn onClick={() => { setDone(null); setQty({}); setNote(''); }}>{t("続けて注文する")}</Btn>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="of">
      <header className="of-head"><Brand compact /><span className="of-head-right"><span className="of-head-label">{t("ご注文フォーム")}</span><LangSwitch /></span></header>
      <main className="of-main">
        <h1 className="of-title">{t("ご注文フォーム")}</h1>
        {data.settings.orderFormNote && <p className="of-note">{data.settings.orderFormNote}</p>}

        <section className="of-step">
          <h2><span className="of-n">1</span>{t("ご注文の代理店")}</h2>
          <select id="of-agent" value={agentId} onChange={e => { setAgentId(e.target.value); setDeliveryTo(byId(data.agents, e.target.value)?.address || ''); }}>
            <option value="">{t("選んでください")}</option>
            {data.agents.filter(a => !a.stage || a.stage === 'active' || a.stage === 'dormant').map(a => <option key={a.id} value={a.id}>{a.code}　{a.name}</option>)}
          </select>
        </section>

        <section className="of-step">
          <h2><span className="of-n">2</span>{t("商品とケース数")}</h2>
          <ul className="of-products">
            {products.map(p => {
              const av = stockOf(data.lots, p.id) - reservedOf(data.salesOrders, p.id);
              const stock = av > 20 ? [t('在庫あり'), 'ok'] : av > 0 ? [t('残りわずか'), 'warn'] : [t('入荷待ち'), 'muted'];
              return (
                <li key={p.id} className={qty[p.id] > 0 ? 'on' : ''}>
                  <span className="of-img">{p.image ? <img src={p.image} alt="" /> : <ProductThumb product={p} size={72} />}</span>
                  <div className="of-info">
                    <b>{p.name}</b>
                    <span className="muted small">{spec(p)}・{p.abv}{t("度")}</span>
                    <span className="of-price num">{yen(p.salePrice)}<span className="muted small">{' '}{t("/ ケース（税抜）")}</span></span>
                    <span className={'of-stock of-' + stock[1]}>{stock[0]}</span>
                  </div>
                  <Stepper value={qty[p.id] || 0} onChange={v => setQty(q => ({ ...q, [p.id]: v }))} label={p.name + t('のケース数')} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="of-step">
          <h2><span className="of-n">3</span>{t("お届け先と希望日")}</h2>
          <Field label={t("お届け先")} wide><input type="text" value={deliveryTo} onChange={e => setDeliveryTo(e.target.value)} placeholder={t("代理店を選ぶと自動で入ります")} /></Field>
          <div className="grid2">
            <Field label={t("希望納品日")}><input type="date" value={desiredDate} min={todayStr()} onChange={e => setDesired(e.target.value)} /></Field>
          </div>
          <Field label={t("ご連絡事項（任意）")} wide><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder={t("例：午前中着でお願いします")} /></Field>
        </section>
        {typeof window !== 'undefined' && window.__AG_PREVIEW__ && <p className="center small"><a href="#/">{t("デモ：管理画面に戻る")}</a></p>}
      </main>
      <div className="of-cart">
        <div className="of-cart-inner">
          <div className="of-cart-sum">
            <span className="muted small">{lines.length}{t("品目・")}{num(cases)}{t("ケース")}</span>
            <span className="of-cart-total num">{yen(tot.total)}<span className="muted small">{' '}{t("税込")}</span></span>
          </div>
          {err && <span className="form-err">{err}</span>}
          <Btn onClick={submit} disabled={sending}>{sending ? t('送信中…') : t('注文を確定する')}</Btn>
        </div>
      </div>
    </div>
  );
}
