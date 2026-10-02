'use client';
import { useState } from 'react';
import { useStore } from '../store';
import { Brand } from '../Logo';
import { Btn, Field, Stepper, ProductThumb } from '../ui';
import { Icon } from '../icons';
import { todayStr, addDays, byId, yen, num, totals, stockOf, reservedOf, spec, createOrderOps, fmtDate } from '../../lib/biz';

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
  const t = totals(lines, data.settings.taxRate);
  const cases = lines.reduce((s, l) => s + l.cases, 0);

  const submit = async () => {
    setErr('');
    if (!agentId) { setErr('ご注文の代理店を選んでください'); document.getElementById('of-agent')?.focus(); return; }
    if (!lines.length) { setErr('商品のケース数を入れてください'); return; }
    if (!deliveryTo.trim()) { setErr('お届け先を入れてください'); return; }
    setSending(true);
    const { order, inv, ops } = createOrderOps(data, { agentId, date: todayStr(), lines, deliveryTo, desiredDate, note, source: 'form' });
    const ok = await commit(ops);
    setSending(false);
    if (ok) { setDone({ order, inv, t, cases }); window.scrollTo(0, 0); }
    else setErr('送信できませんでした。通信状態を確認して、もう一度お試しください');
  };

  if (done) {
    return (
      <div className="of">
        <header className="of-head"><Brand compact /></header>
        <main className="of-main">
          <section className="of-done">
            <span className="of-done-mark"><Icon name="check" size={30} /></span>
            <h1>ご注文を受け付けました</h1>
            <p>{byId(data.agents, agentId)?.name} 様、ありがとうございます。出荷準備ができ次第ご連絡します。</p>
            <dl className="of-done-dl">
              <dt>注文番号</dt><dd className="num">{done.order.no}</dd>
              <dt>数量</dt><dd className="num">{num(done.cases)} ケース</dd>
              <dt>ご請求予定額</dt><dd className="num">{yen(done.t.total)}（税込）</dd>
              <dt>請求書番号</dt><dd className="num">{done.inv.no}</dd>
              <dt>希望納品日</dt><dd>{fmtDate(done.order.desiredDate)}</dd>
            </dl>
            <Btn onClick={() => { setDone(null); setQty({}); setNote(''); }}>続けて注文する</Btn>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="of">
      <header className="of-head"><Brand compact /><span className="of-head-label">ご注文フォーム</span></header>
      <main className="of-main">
        <h1 className="of-title">ご注文フォーム</h1>
        {data.settings.orderFormNote && <p className="of-note">{data.settings.orderFormNote}</p>}

        <section className="of-step">
          <h2><span className="of-n">1</span>ご注文の代理店</h2>
          <select id="of-agent" value={agentId} onChange={e => { setAgentId(e.target.value); setDeliveryTo(byId(data.agents, e.target.value)?.address || ''); }}>
            <option value="">選んでください</option>
            {data.agents.map(a => <option key={a.id} value={a.id}>{a.code}　{a.name}</option>)}
          </select>
        </section>

        <section className="of-step">
          <h2><span className="of-n">2</span>商品とケース数</h2>
          <ul className="of-products">
            {products.map(p => {
              const av = stockOf(data.lots, p.id) - reservedOf(data.salesOrders, p.id);
              const stock = av > 20 ? ['在庫あり', 'ok'] : av > 0 ? ['残りわずか', 'warn'] : ['入荷待ち', 'muted'];
              return (
                <li key={p.id} className={qty[p.id] > 0 ? 'on' : ''}>
                  <span className="of-img">{p.image ? <img src={p.image} alt="" /> : <ProductThumb product={p} size={72} />}</span>
                  <div className="of-info">
                    <b>{p.name}</b>
                    <span className="muted small">{spec(p)}・{p.abv}度</span>
                    <span className="of-price num">{yen(p.salePrice)}<span className="muted small"> / ケース（税抜）</span></span>
                    <span className={'of-stock of-' + stock[1]}>{stock[0]}</span>
                  </div>
                  <Stepper value={qty[p.id] || 0} onChange={v => setQty(q => ({ ...q, [p.id]: v }))} label={p.name + 'のケース数'} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="of-step">
          <h2><span className="of-n">3</span>お届け先と希望日</h2>
          <Field label="お届け先" wide><input type="text" value={deliveryTo} onChange={e => setDeliveryTo(e.target.value)} placeholder="代理店を選ぶと自動で入ります" /></Field>
          <div className="grid2">
            <Field label="希望納品日"><input type="date" value={desiredDate} min={todayStr()} onChange={e => setDesired(e.target.value)} /></Field>
          </div>
          <Field label="ご連絡事項（任意）" wide><textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="例：午前中着でお願いします" /></Field>
        </section>
        {typeof window !== 'undefined' && window.__AG_PREVIEW__ && <p className="center small"><a href="#/">デモ：管理画面に戻る</a></p>}
      </main>
      <div className="of-cart">
        <div className="of-cart-inner">
          <div className="of-cart-sum">
            <span className="muted small">{lines.length}品目・{num(cases)}ケース</span>
            <span className="of-cart-total num">{yen(t.total)}<span className="muted small"> 税込</span></span>
          </div>
          {err && <span className="form-err">{err}</span>}
          <Btn onClick={submit} disabled={sending}>{sending ? '送信中…' : '注文を確定する'}</Btn>
        </div>
      </div>
    </div>
  );
}
