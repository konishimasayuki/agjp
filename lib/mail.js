// メール本文（発注書・請求書）。メールソフトでも崩れないようにインラインスタイルで組む
import { byId, fmtDate, num, yen, cnyF, caseSum, lineSum } from './biz';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const th = 'padding:8px 10px;border-bottom:2px solid #1B3F8B;text-align:left;font-size:12px;color:#1B3F8B;white-space:nowrap';
const td = 'padding:8px 10px;border-bottom:1px solid #DCE3EE;font-size:13px';
const wrap = inner => `<div style="font-family:'Hiragino Sans','Noto Sans JP','Microsoft YaHei',sans-serif;color:#14213D;line-height:1.7;max-width:680px">${inner}</div>`;

export function poMail(po, data) {
  const c = data.settings.company || {};
  const sup = byId(data.suppliers, po.supplierId) || {};
  const wh = byId(data.warehouses, po.warehouseId) || {};
  const rows = po.lines.map((l, i) => {
    const p = byId(data.products, l.productId) || {};
    return { i: i + 1, cn: p.nameCn || p.name, ja: p.name, spec: `${p.volumeMl}ml × ${p.perCase}`, cases: l.cases, unit: l.unitCny, amt: l.cases * l.unitCny };
  });
  const total = lineSum(po.lines, 'unitCny'), cases = caseSum(po.lines);
  const subject = `【采购订单 / 発注書】${po.no}  ${c.name}`;
  const text = [
    `${sup.contact || ''} 您好 / ${sup.contact || ''} 様`, '',
    `这里是${c.name}。请按以下内容安排发货。`, `${c.name}です。下記の通り発注いたします。`, '',
    `订单号 / 発注番号：${po.no}`,
    `订单日期 / 発注日：${fmtDate(po.date)}`,
    `交货地点 / 納品場所：${wh.name || ''}`,
    `　${wh.address || ''}${wh.tel ? '  TEL ' + wh.tel : ''}`,
    `希望交货期 / 希望納期：${fmtDate(po.deliveryDate)}`, '',
    ...rows.map(r => `${r.i}. ${r.cn}（${r.ja}） ${r.spec}  ${r.cases}箱 × CNY ${cnyF(r.unit)} = CNY ${cnyF(r.amt)}`), '',
    `合计 / 合計：${cases}箱　CNY ${cnyF(total)}`,
    po.note ? `\n备注 / 備考：${po.note}` : '', '',
    '请确认后回复，谢谢。', 'ご確認のうえ、ご返信をお願いいたします。', '',
    c.name, c.address, `TEL ${c.tel || ''}  ${c.email || ''}`,
  ].join('\n');
  const html = wrap(`
    <p>${esc(sup.contact)} 您好 / ${esc(sup.contact)} 様</p>
    <p>这里是${esc(c.name)}。请按以下内容安排发货。<br>${esc(c.name)}です。下記の通り発注いたします。</p>
    <table style="border-collapse:collapse;margin:12px 0;font-size:13px">
      <tr><td style="padding:3px 16px 3px 0;color:#5B6782">订单号 / 発注番号</td><td><b>${esc(po.no)}</b></td></tr>
      <tr><td style="padding:3px 16px 3px 0;color:#5B6782">订单日期 / 発注日</td><td>${fmtDate(po.date)}</td></tr>
      <tr><td style="padding:3px 16px 3px 0;color:#5B6782">交货地点 / 納品場所</td><td>${esc(wh.name)}<br>${esc(wh.address)}${wh.tel ? ' TEL ' + esc(wh.tel) : ''}</td></tr>
      <tr><td style="padding:3px 16px 3px 0;color:#5B6782">希望交货期 / 希望納期</td><td>${fmtDate(po.deliveryDate)}</td></tr>
    </table>
    <table style="border-collapse:collapse;width:100%">
      <tr><th style="${th}">No</th><th style="${th}">品名 / 商品名</th><th style="${th}">规格 / 規格</th><th style="${th};text-align:right">箱数</th><th style="${th};text-align:right">单价 CNY</th><th style="${th};text-align:right">金额 CNY</th></tr>
      ${rows.map(r => `<tr><td style="${td}">${r.i}</td><td style="${td}">${esc(r.cn)}<br><span style="color:#5B6782;font-size:12px">${esc(r.ja)}</span></td><td style="${td}">${esc(r.spec)}</td><td style="${td};text-align:right">${num(r.cases)}</td><td style="${td};text-align:right">${cnyF(r.unit)}</td><td style="${td};text-align:right">${cnyF(r.amt)}</td></tr>`).join('')}
      <tr><td colspan="3" style="padding:10px;text-align:right;font-weight:bold">合计 / 合計</td><td style="padding:10px;text-align:right;font-weight:bold">${num(cases)}</td><td></td><td style="padding:10px;text-align:right;font-weight:bold;color:#1B3F8B">CNY ${cnyF(total)}</td></tr>
    </table>
    ${po.note ? `<p style="background:#EEF3FB;padding:10px 12px;border-radius:6px"><b>备注 / 備考</b><br>${esc(po.note).replace(/\n/g, '<br>')}</p>` : ''}
    <p>请确认后回复，谢谢。<br>ご確認のうえ、ご返信をお願いいたします。</p>
    <p style="border-top:1px solid #DCE3EE;padding-top:10px;font-size:12px;color:#5B6782">${esc(c.name)}<br>${esc(c.zip)} ${esc(c.address)}<br>TEL ${esc(c.tel)}　${esc(c.email)}</p>`);
  return { to: sup.email || '', subject, text, html };
}

export function invoiceMail(inv, data) {
  const c = data.settings.company || {};
  const ag = byId(data.agents, inv.agentId) || {};
  const subject = `【請求書】${inv.no}　${c.name}`;
  const text = [
    `${ag.name || ''}`, `${ag.contact ? ag.contact + ' 様' : 'ご担当者様'}`, '',
    `いつもお世話になっております。${c.name}です。`,
    `ご注文（${inv.orderNo}）の請求書をお送りいたします。`, '',
    `請求番号：${inv.no}`, `請求日：${fmtDate(inv.issueDate)}`,
    `ご請求金額：${yen(inv.total)}（税込）`, `お支払期限：${fmtDate(inv.dueDate)}`, '',
    ...inv.lines.map(l => `・${l.name}（${l.volumeMl}ml×${l.perCase}本） ${l.cases}ケース × ${yen(l.unitPrice)} = ${yen(l.cases * l.unitPrice)}`), '',
    `小計 ${yen(inv.subtotal)} ／ 消費税(${inv.taxRate}%) ${yen(inv.tax)}`, '',
    `お振込先：${c.bank || ''}`, '', `登録番号：${c.regNo || ''}`, '',
    c.name, c.address, `TEL ${c.tel || ''}  ${c.email || ''}`,
  ].join('\n');
  const html = wrap(`
    <p>${esc(ag.name)}<br>${ag.contact ? esc(ag.contact) + ' 様' : 'ご担当者様'}</p>
    <p>いつもお世話になっております。${esc(c.name)}です。<br>ご注文（${esc(inv.orderNo)}）の請求書をお送りいたします。</p>
    <table style="border-collapse:collapse;margin:12px 0;font-size:13px">
      <tr><td style="padding:3px 16px 3px 0;color:#5B6782">請求番号</td><td><b>${esc(inv.no)}</b></td></tr>
      <tr><td style="padding:3px 16px 3px 0;color:#5B6782">ご請求金額</td><td><b style="font-size:18px;color:#1B3F8B">${yen(inv.total)}</b>（税込）</td></tr>
      <tr><td style="padding:3px 16px 3px 0;color:#5B6782">お支払期限</td><td>${fmtDate(inv.dueDate)}</td></tr>
    </table>
    <table style="border-collapse:collapse;width:100%">
      <tr><th style="${th}">品名</th><th style="${th};text-align:right">数量</th><th style="${th};text-align:right">単価</th><th style="${th};text-align:right">金額</th></tr>
      ${inv.lines.map(l => `<tr><td style="${td}">${esc(l.name)}<br><span style="color:#5B6782;font-size:12px">${l.volumeMl}ml×${l.perCase}本</span></td><td style="${td};text-align:right">${num(l.cases)}ケース</td><td style="${td};text-align:right">${yen(l.unitPrice)}</td><td style="${td};text-align:right">${yen(l.cases * l.unitPrice)}</td></tr>`).join('')}
      <tr><td colspan="3" style="padding:6px 10px;text-align:right">小計（${inv.taxRate}%対象）</td><td style="padding:6px 10px;text-align:right">${yen(inv.subtotal)}</td></tr>
      <tr><td colspan="3" style="padding:6px 10px;text-align:right">消費税（${inv.taxRate}%）</td><td style="padding:6px 10px;text-align:right">${yen(inv.tax)}</td></tr>
      <tr><td colspan="3" style="padding:8px 10px;text-align:right;font-weight:bold">合計</td><td style="padding:8px 10px;text-align:right;font-weight:bold;color:#1B3F8B">${yen(inv.total)}</td></tr>
    </table>
    <p><b>お振込先</b><br>${esc(c.bank)}</p>
    <p style="border-top:1px solid #DCE3EE;padding-top:10px;font-size:12px;color:#5B6782">${esc(c.name)}　登録番号 ${esc(c.regNo)}<br>${esc(c.zip)} ${esc(c.address)}<br>TEL ${esc(c.tel)}　${esc(c.email)}</p>`);
  return { to: ag.email || '', subject, text, html };
}
