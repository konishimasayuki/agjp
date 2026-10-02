'use client';
import { useState } from 'react';
import { useStore } from '../store';
import { Btn, Chip, Empty, PageHead, Tabs, Stat } from '../ui';
import { go } from '../nav';
import { todayStr, byId, fmtDate, yen, toCSV, downloadText } from '../../lib/biz';

export default function Invoices() {
  const { data, commit, toast } = useStore();
  const t = todayStr();
  const [tab, setTab] = useState('unpaid');
  const status = i => (i.status === 'paid' ? 'paid' : i.dueDate < t ? 'overdue' : 'unpaid');
  const list = [...data.invoices].filter(i => tab === 'all' || status(i) === tab || (tab === 'unpaid' && status(i) === 'overdue'))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.no.localeCompare(a.no));
  const unpaid = data.invoices.filter(i => i.status !== 'paid');
  const overdue = unpaid.filter(i => i.dueDate < t);
  const togglePaid = async inv => {
    const paid = inv.status !== 'paid';
    const order = byId(data.salesOrders, inv.orderId);
    await commit([
      { op: 'upsert', key: 'invoices', item: { id: inv.id, status: paid ? 'paid' : 'unpaid', paidAt: paid ? t : null } },
      ...(order && order.status !== 'received' ? [{ op: 'upsert', key: 'salesOrders', item: { id: order.id, status: paid ? 'paid' : 'shipped', paidAt: paid ? t : null } }] : []),
    ]);
    toast(paid ? `${inv.no} を入金済にしました` : `${inv.no} を未入金に戻しました`);
  };
  const exportCSV = () => {
    const out = [['請求書No', '請求日', '代理店', '注文No', '小計', '消費税', '合計', '支払期限', '状態', '入金日']];
    list.forEach(i => out.push([i.no, i.issueDate, byId(data.agents, i.agentId)?.name, i.orderNo, i.subtotal, i.tax, i.total, i.dueDate, { paid: '入金済', overdue: '期限超過', unpaid: '未入金' }[status(i)], i.paidAt || '']));
    downloadText(`請求書一覧_${t}.csv`, toCSV(out));
  };
  const LBL = { paid: ['入金済', 'ok'], overdue: ['期限超過', 'danger'], unpaid: ['未入金', 'blue'] };
  return (
    <>
      <PageHead title="請求書" desc="受注が入ると自動で作られます（適格請求書の記載事項に対応）。印刷・PDF保存、代理店へのメール送信ができます。"
        actions={<Btn kind="sub" icon="download" onClick={exportCSV}>CSV</Btn>} />
      <div className="stats">
        <Stat label="未入金の合計" value={yen(unpaid.reduce((s, i) => s + i.total, 0))} sub={`${unpaid.length}件`} />
        <Stat label="期限超過" value={yen(overdue.reduce((s, i) => s + i.total, 0))} sub={`${overdue.length}件`} tone={overdue.length ? 'danger' : ''} />
      </div>
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'unpaid', label: '未入金', count: unpaid.length },
        { value: 'overdue', label: '期限超過', count: overdue.length },
        { value: 'paid', label: '入金済', count: data.invoices.length - unpaid.length },
        { value: 'all', label: 'すべて', count: data.invoices.length },
      ]} />
      {list.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>請求書No</th><th>代理店</th><th className="r">合計（税込）</th><th>支払期限</th><th>状態</th><th></th></tr></thead>
            <tbody>
              {list.map(i => {
                const s = status(i);
                return (
                  <tr key={i.id}>
                    <td className="lead"><b className="num">{i.no}</b><span className="muted small block">{fmtDate(i.issueDate)}・注文 {i.orderNo}</span></td>
                    <td data-label="代理店">{byId(data.agents, i.agentId)?.name || '—'}</td>
                    <td data-label="合計（税込）" className="r num"><b>{yen(i.total)}</b></td>
                    <td data-label="支払期限">{fmtDate(i.dueDate)}</td>
                    <td data-label="状態"><Chip tone={LBL[s][1]}>{LBL[s][0]}</Chip>{i.sentAt && <span className="muted small block">メール送信済</span>}</td>
                    <td className="actions">
                      <Btn kind="ghost" size="sm" onClick={() => togglePaid(i)}>{i.status === 'paid' ? '未入金に戻す' : '入金済にする'}</Btn>
                      <Btn size="sm" icon="doc" onClick={() => go('print/invoice/' + i.id)}>表示・送信</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <Empty title="この条件の請求書はありません" />}
    </>
  );
}
