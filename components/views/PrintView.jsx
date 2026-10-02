'use client';
import { useState } from 'react';
import { useStore } from '../store';
import { LogoMark } from '../Logo';
import { Btn, Modal, Field, Empty } from '../ui';
import { go } from '../nav';
import { byId, fmtDate, num, yen, cnyF, caseSum, lineSum, todayStr } from '../../lib/biz';
import { poMail, invoiceMail } from '../../lib/mail';

function PODoc({ po, data }) {
  const c = data.settings.company || {};
  const sup = byId(data.suppliers, po.supplierId) || {};
  const wh = byId(data.warehouses, po.warehouseId) || {};
  const total = lineSum(po.lines, 'unitCny');
  return (
    <article className="doc">
      <header className="doc-top">
        <div className="doc-from">
          <LogoMark size={46} />
          <div>
            <div className="doc-co">{c.name}</div>
            <div className="doc-small">{c.zip} {c.address}<br />TEL {c.tel}　{c.email}</div>
          </div>
        </div>
        <div className="doc-title-box">
          <h1 className="doc-title">采购订单</h1>
          <div className="doc-title-sub">発注書　Purchase Order</div>
          <dl className="doc-meta">
            <dt>订单号 / No.</dt><dd className="num">{po.no}</dd>
            <dt>日期 / 発注日</dt><dd>{fmtDate(po.date)}</dd>
          </dl>
        </div>
      </header>
      <section className="doc-to">
        <div className="doc-to-name">{sup.name}</div>
        <div className="doc-small">{sup.contact && <>{sup.contact} 先生/女士　</>}{sup.address}<br />{sup.email}</div>
      </section>
      <div className="doc-two">
        <div className="doc-box">
          <div className="doc-box-h">交货地点 / 納品場所</div>
          <div><b>{wh.name}</b></div>
          <div className="doc-small">{wh.address}<br />{wh.tel && <>TEL {wh.tel}　</>}{wh.contact}</div>
        </div>
        <div className="doc-box">
          <div className="doc-box-h">希望交货期 / 希望納期</div>
          <div className="doc-big num">{fmtDate(po.deliveryDate)}</div>
        </div>
      </div>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead><tr><th>No</th><th>品名 / 商品名</th><th>规格 / 規格</th><th className="r">箱数</th><th className="r">单价 CNY</th><th className="r">金额 CNY</th></tr></thead>
          <tbody>
            {po.lines.map((l, i) => {
              const p = byId(data.products, l.productId) || {};
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{p.nameCn || p.name}<div className="doc-small">{p.name}</div></td>
                  <td>{p.volumeMl}ml × {p.perCase}</td>
                  <td className="r num">{num(l.cases)}</td>
                  <td className="r num">{cnyF(l.unitCny)}</td>
                  <td className="r num">{cnyF(l.cases * l.unitCny)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><td colSpan={3} className="r">合计 / 合計</td><td className="r num">{num(caseSum(po.lines))}</td><td></td><td className="r num doc-total">CNY {cnyF(total)}</td></tr></tfoot>
        </table>
      </div>
      {po.note && <section className="doc-note"><div className="doc-box-h">备注 / 備考</div><p>{po.note}</p></section>}
      <p className="doc-foot">请确认后回复，谢谢。　ご確認のうえ、ご返信をお願いいたします。</p>
    </article>
  );
}

function InvoiceDoc({ inv, data }) {
  const c = data.settings.company || {};
  const ag = byId(data.agents, inv.agentId) || {};
  return (
    <article className="doc">
      <header className="doc-top">
        <div>
          <h1 className="doc-title">請求書</h1>
          <div className="doc-to-name inv-to">{ag.name}　御中</div>
          <div className="doc-small">{ag.address}</div>
        </div>
        <div className="doc-title-box">
          <dl className="doc-meta">
            <dt>請求日</dt><dd>{fmtDate(inv.issueDate)}</dd>
            <dt>請求番号</dt><dd className="num">{inv.no}</dd>
            <dt>注文番号</dt><dd className="num">{inv.orderNo}</dd>
          </dl>
          <div className="doc-from inv-from">
            <LogoMark size={42} />
            <div>
              <div className="doc-co">{c.name}</div>
              <div className="doc-small">{c.zip} {c.address}<br />TEL {c.tel}<br />登録番号 {c.regNo}</div>
            </div>
          </div>
        </div>
      </header>
      <p className="doc-lead">下記の通りご請求申し上げます。</p>
      <div className="doc-two">
        <div className="doc-box doc-box-strong">
          <div className="doc-box-h">ご請求金額（税込）</div>
          <div className="doc-amount num">{yen(inv.total)}</div>
        </div>
        <div className="doc-box">
          <div className="doc-box-h">お支払期限</div>
          <div className="doc-big num">{fmtDate(inv.dueDate)}</div>
        </div>
      </div>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead><tr><th>品名</th><th>規格</th><th className="r">数量</th><th className="r">単価</th><th className="r">金額</th></tr></thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.name}</td>
                <td>{l.volumeMl}ml × {l.perCase}本</td>
                <td className="r num">{num(l.cases)}ケース</td>
                <td className="r num">{yen(l.unitPrice)}</td>
                <td className="r num">{yen(l.cases * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <table className="doc-sum">
        <tbody>
          <tr><th>小計（{inv.taxRate}%対象）</th><td className="num">{yen(inv.subtotal)}</td></tr>
          <tr><th>消費税（{inv.taxRate}%）</th><td className="num">{yen(inv.tax)}</td></tr>
          <tr className="doc-sum-total"><th>合計</th><td className="num">{yen(inv.total)}</td></tr>
        </tbody>
      </table>
      <section className="doc-note">
        <div className="doc-box-h">お振込先</div>
        <p>{c.bank}</p>
        {c.invoiceNote && <p className="doc-small">{c.invoiceNote}</p>}
        <p className="doc-small">酒類は軽減税率の対象外のため、標準税率（{inv.taxRate}%）を適用しています。</p>
      </section>
    </article>
  );
}

function MailModal({ mail, onClose, onSent }) {
  const { toast } = useStore();
  const [to, setTo] = useState(mail.to);
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(mail.subject);
  const [text, setText] = useState(mail.text);
  const [state, setState] = useState('idle'); // idle | sending | fallback
  const [reason, setReason] = useState('');
  const send = async () => {
    if (!to) { setReason('宛先メールアドレスを入れてください'); return; }
    setState('sending'); setReason('');
    try {
      if (window.__AG_PREVIEW__) throw new Error('preview');
      const r = await fetch('/api/send-mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, cc, subject, html: mail.html, text }) });
      const j = await r.json().catch(() => ({}));
      if (j.ok) { toast('メールを送信しました'); onSent(); onClose(); return; }
      setReason(j.reason === 'not_configured' ? 'メール送信（Resend）の設定がまだのため、システムから直接送れません。' : '送信に失敗しました：' + (j.reason || '不明なエラー'));
    } catch {
      setReason('このデモ環境ではシステムから直接送れません。');
    }
    setState('fallback');
  };
  const mailto = `mailto:${encodeURIComponent(to)}?${cc ? 'cc=' + encodeURIComponent(cc) + '&' : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  return (
    <Modal title="メールで送信" onClose={onClose} size="lg"
      footer={state === 'fallback'
        ? <><Btn kind="ghost" onClick={onClose}>閉じる</Btn><a className="btn btn-sub" href={mailto}>メールアプリで開く</a><Btn icon="check" onClick={() => { onSent(); toast('送信済みにしました'); onClose(); }}>送信済みにする</Btn></>
        : <><Btn kind="ghost" onClick={onClose}>キャンセル</Btn><Btn icon="mail" onClick={send} disabled={state === 'sending'}>{state === 'sending' ? '送信中…' : 'この内容で送信'}</Btn></>}>
      {reason && <div className="notice notice-warn">{reason}{state === 'fallback' && <> 「メールアプリで開く」で同じ内容のメールを作れます。PDFを添付する場合は、先に画面上部の「印刷・PDF保存」で保存してください。送った後に「送信済みにする」を押すと状態が更新されます。</>}</div>}
      <div className="grid2">
        <Field label="宛先"><input type="email" value={to} onChange={e => setTo(e.target.value)} /></Field>
        <Field label="CC（任意）"><input type="email" value={cc} onChange={e => setCc(e.target.value)} /></Field>
      </div>
      <Field label="件名" wide><input type="text" value={subject} onChange={e => setSubject(e.target.value)} /></Field>
      <Field label="本文（テキスト版）" hint="システムから送る場合は、表組みされたHTML版の発注書・請求書が本文に入ります。" wide>
        <textarea rows={12} value={text} onChange={e => setText(e.target.value)} className="mono-ish" />
      </Field>
    </Modal>
  );
}

export default function PrintView({ kind, id }) {
  const { data, commit } = useStore();
  const [mail, setMail] = useState(null);
  const isPO = kind === 'po';
  const doc = isPO ? byId(data.purchaseOrders, id) : byId(data.invoices, id);
  const backTo = isPO ? 'purchase' : 'invoices';
  if (!doc) return <div className="print-wrap"><Empty title="書類が見つかりません" action={<Btn onClick={() => go(backTo)}>一覧に戻る</Btn>}>削除されたか、URLが間違っている可能性があります。</Empty></div>;

  const openMail = () => setMail(isPO ? poMail(doc, data) : invoiceMail(doc, data));
  const onSent = () => {
    if (isPO) commit([{ op: 'upsert', key: 'purchaseOrders', item: { id: doc.id, status: doc.status === 'draft' ? 'sent' : doc.status, sentAt: todayStr() } }]);
    else commit([{ op: 'upsert', key: 'invoices', item: { id: doc.id, sentAt: todayStr() } }]);
  };
  const sentLabel = isPO
    ? (doc.status === 'draft' ? '未送信（下書き）' : `送信済み ${fmtDate(doc.sentAt)}`)
    : (doc.sentAt ? `メール送信済み ${fmtDate(doc.sentAt)}` : '');

  return (
    <div className="print-wrap">
      <div className="print-bar no-print">
        <Btn kind="ghost" icon="back" onClick={() => go(backTo)}>{isPO ? '発注一覧' : '請求書一覧'}</Btn>
        <div className="print-bar-mid">{doc.no}{sentLabel && <span className="muted">　{sentLabel}</span>}</div>
        <div className="print-bar-actions">
          <Btn kind="sub" icon="print" onClick={() => window.print()}>印刷・PDF保存</Btn>
          <Btn icon="mail" onClick={openMail}>{isPO ? (doc.status === 'draft' ? '仕入先へメールで発注' : 'メールを再送') : '代理店へメール'}</Btn>
        </div>
      </div>
      {isPO ? <PODoc po={doc} data={data} /> : <InvoiceDoc inv={doc} data={data} />}
      {mail && <MailModal mail={mail} onClose={() => setMail(null)} onSent={onSent} />}
    </div>
  );
}
