'use client';
import { useState } from 'react';
import { useStore } from '../store';
import { Btn, Chip, Empty, PageHead, Tabs, Stat } from '../ui';
import { go } from '../nav';
import { todayStr, byId, fmtDate, yen, toCSV, downloadText } from '../../lib/biz';
import { t } from '../../lib/i18n';

export default function Invoices() {
  const { data, commit, toast } = useStore();
  const today = todayStr();
  const [tab, setTab] = useState('unpaid');
  const status = i => (i.status === 'paid' ? 'paid' : i.dueDate < today ? 'overdue' : 'unpaid');
  const list = [...data.invoices].filter(i => tab === 'all' || status(i) === tab || (tab === 'unpaid' && status(i) === 'overdue'))
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.no.localeCompare(a.no));
  const unpaid = data.invoices.filter(i => i.status !== 'paid');
  const overdue = unpaid.filter(i => i.dueDate < today);
  const togglePaid = async inv => {
    const paid = inv.status !== 'paid';
    const order = byId(data.salesOrders, inv.orderId);
    await commit([
      { op: 'upsert', key: 'invoices', item: { id: inv.id, status: paid ? 'paid' : 'unpaid', paidAt: paid ? today : null } },
      ...(order && order.status !== 'received' ? [{ op: 'upsert', key: 'salesOrders', item: { id: order.id, status: paid ? 'paid' : 'shipped', paidAt: paid ? today : null } }] : []),
    ]);
    toast(paid ? t`${inv.no} を入金済にしました` : t`${inv.no} を未入金に戻しました`);
  };
  const exportCSV = () => {
    const out = [[t('請求書No'), t('請求日'), t('代理店'), t('注文No'), t('小計'), t('消費税'), t('合計'), t('支払期限'), t('状態'), t('入金日')]];
    list.forEach(i => out.push([i.no, i.issueDate, byId(data.agents, i.agentId)?.name, i.orderNo, i.subtotal, i.tax, i.total, i.dueDate, { paid: t('入金済'), overdue: t('期限超過'), unpaid: t('未入金') }[status(i)], i.paidAt || '']));
    downloadText(t`請求書一覧_${today}.csv`, toCSV(out));
  };
  const LBL = { paid: [t('入金済'), 'ok'], overdue: [t('期限超過'), 'danger'], unpaid: [t('未入金'), 'blue'] };
  return (
    <>
      <PageHead title={t("請求書")} desc={t("受注が入ると自動で作られます（適格請求書の記載事項に対応）。印刷・PDF保存、代理店へのメール送信ができます。")}
        actions={<Btn kind="sub" icon="download" onClick={exportCSV}>CSV</Btn>} />
      <div className="stats">
        <Stat label={t("未入金の合計")} value={yen(unpaid.reduce((s, i) => s + i.total, 0))} sub={t`${unpaid.length}件`} />
        <Stat label={t("期限超過")} value={yen(overdue.reduce((s, i) => s + i.total, 0))} sub={t`${overdue.length}件`} tone={overdue.length ? 'danger' : ''} />
      </div>
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'unpaid', label: t('未入金'), count: unpaid.length },
        { value: 'overdue', label: t('期限超過'), count: overdue.length },
        { value: 'paid', label: t('入金済'), count: data.invoices.length - unpaid.length },
        { value: 'all', label: t('すべて'), count: data.invoices.length },
      ]} />
      {list.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>{t("請求書No")}</th><th>{t("代理店")}</th><th className="r">{t("合計（税込）")}</th><th>{t("支払期限")}</th><th>{t("状態")}</th><th></th></tr></thead>
            <tbody>
              {list.map(i => {
                const s = status(i);
                return (
                  <tr key={i.id}>
                    <td className="lead"><b className="num">{i.no}</b><span className="muted small block">{fmtDate(i.issueDate)}{t("・注文")}{' '}{i.orderNo}</span></td>
                    <td data-label={t("代理店")}>{byId(data.agents, i.agentId)?.name || '—'}</td>
                    <td data-label={t("合計（税込）")} className="r num"><b>{yen(i.total)}</b></td>
                    <td data-label={t("支払期限")}>{fmtDate(i.dueDate)}</td>
                    <td data-label={t("状態")}><Chip tone={LBL[s][1]}>{LBL[s][0]}</Chip>{i.sentAt && <span className="muted small block">{t("メール送信済")}</span>}</td>
                    <td className="actions">
                      <Btn kind="ghost" size="sm" onClick={() => togglePaid(i)}>{i.status === 'paid' ? t('未入金に戻す') : t('入金済にする')}</Btn>
                      <Btn size="sm" icon="doc" onClick={() => go('print/invoice/' + i.id)}>{t("表示・送信")}</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t("この条件の請求書はありません")} />}
    </>
  );
}
