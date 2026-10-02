'use client';
import { useState } from 'react';
import { useStore } from '../store';
import { Btn, Field, Modal, Chip, Empty, PageHead, Tabs, ProductThumb } from '../ui';
import LineEditor from '../LineEditor';
import { go } from '../nav';
import { uid, todayStr, addDays, nextNo, byId, fmtDate, rmb, yen, num, caseSum, lineSum, buildLots } from '../../lib/biz';
import { t } from '../../lib/i18n';

const ST = { draft: [t('下書き'), 'plain'], sent: [t('発注済・入荷待ち'), 'blue'], received: [t('入荷済'), 'ok'] };

export default function PurchaseOrders() {
  const { data, commit, toast } = useStore();
  const [tab, setTab] = useState('all');
  const [edit, setEdit] = useState(null);
  const [recv, setRecv] = useState(null);
  const count = s => data.purchaseOrders.filter(p => p.status === s).length;
  const list = [...data.purchaseOrders].sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no)).filter(p => tab === 'all' || p.status === tab);
  const del = async po => {
    if (!window.confirm(t`${po.no} を削除しますか？`)) return;
    await commit([{ op: 'remove', key: 'purchaseOrders', id: po.id }]);
    toast(t('発注を削除しました'));
  };
  return (
    <>
      <PageHead title={t("中国への発注")} desc={t("商品・ケース数・納品場所を選ぶと発注書（中国語・日本語併記）を作り、仕入先へメールで送れます。入荷したら為替と付帯費用を入れて原価を確定し、在庫に入れます。")}
        actions={<Btn icon="plus" onClick={() => setEdit({})}>{t("新しい発注")}</Btn>} />
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'all', label: t('すべて'), count: data.purchaseOrders.length },
        { value: 'draft', label: t('下書き'), count: count('draft') },
        { value: 'sent', label: t('入荷待ち'), count: count('sent') },
        { value: 'received', label: t('入荷済'), count: count('received') },
      ]} />
      {list.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>{t("発注No")}</th><th>{t("発注日")}</th><th>{t("仕入先")}</th><th>{t("納品場所")}</th><th className="r">{t("数量")}</th><th className="r">{t("発注額")}</th><th>{t("状態")}</th><th></th></tr></thead>
            <tbody>
              {list.map(po => (
                <tr key={po.id}>
                  <td className="lead"><b className="num">{po.no}</b></td>
                  <td data-label={t("発注日")}>{fmtDate(po.date)}</td>
                  <td data-label={t("仕入先")}>{byId(data.suppliers, po.supplierId)?.name || '—'}</td>
                  <td data-label={t("納品場所")}>{byId(data.warehouses, po.warehouseId)?.name || '—'}<div className="muted small">{t("納期")}{' '}{fmtDate(po.deliveryDate)}</div></td>
                  <td data-label={t("数量")} className="r num">{num(caseSum(po.lines))}{' '}{t("ケース")}</td>
                  <td data-label={t("発注額")} className="r num">{rmb(lineSum(po.lines, 'unitCny'))}</td>
                  <td data-label={t("状態")}><Chip tone={ST[po.status][1]}>{ST[po.status][0]}</Chip></td>
                  <td className="actions">
                    {po.status === 'draft' && <>
                      <Btn kind="ghost" size="sm" onClick={() => setEdit(po)}>{t("編集")}</Btn>
                      <Btn kind="ghost" size="sm" onClick={() => del(po)}>{t("削除")}</Btn>
                      <Btn size="sm" icon="mail" onClick={() => go('print/po/' + po.id)}>{t("発注書・送信")}</Btn>
                    </>}
                    {po.status === 'sent' && <>
                      <Btn kind="ghost" size="sm" onClick={() => go('print/po/' + po.id)}>{t("発注書")}</Btn>
                      <Btn size="sm" icon="box" onClick={() => setRecv(po)}>{t("入荷処理")}</Btn>
                    </>}
                    {po.status === 'received' && <Btn kind="ghost" size="sm" onClick={() => go('print/po/' + po.id)}>{t("発注書")}</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t("この条件の発注はありません")} action={<Btn icon="plus" onClick={() => setEdit({})}>{t("新しい発注")}</Btn>}>{t("「新しい発注」から商品と数量を選んで発注書を作れます。")}</Empty>}
      {edit && <POEditor po={edit.id ? edit : null} onClose={() => setEdit(null)} />}
      {recv && <ReceiveModal po={recv} onClose={() => setRecv(null)} />}
    </>
  );
}

function POEditor({ po, onClose }) {
  const { data, commit, toast } = useStore();
  const products = data.products.filter(p => p.active !== false);
  const [f, setF] = useState(() => po ? { ...po, lines: po.lines.map(l => ({ ...l })) } : {
    supplierId: data.suppliers[0]?.id || '', warehouseId: data.warehouses[0]?.id || '',
    date: todayStr(), deliveryDate: addDays(todayStr(), 30), note: '',
    lines: products[0] ? [{ productId: products[0].id, cases: 10, unitCny: products[0].stdCostCny }] : [],
  });
  const [err, setErr] = useState('');
  const up = patch => setF(s => ({ ...s, ...patch }));
  const wh = byId(data.warehouses, f.warehouseId);
  const total = lineSum(f.lines, 'unitCny');
  const save = async next => {
    const lines = f.lines.map(l => ({ productId: l.productId, cases: Number(l.cases) || 0, unitCny: Number(l.unitCny) || 0 })).filter(l => l.cases > 0);
    if (!f.supplierId) return setErr(t('仕入先を選んでください（マスタ設定で登録できます）'));
    if (!f.warehouseId) return setErr(t('納品場所を選んでください'));
    if (!lines.length) return setErr(t('1ケース以上の商品を入れてください'));
    const item = po ? { ...f, lines } : { ...f, lines, id: uid(), no: nextNo('PO', data.purchaseOrders, f.date), status: 'draft', createdAt: new Date().toISOString() };
    const ok = await commit([{ op: 'upsert', key: 'purchaseOrders', item }]);
    if (!ok) return;
    toast(po ? t('発注を更新しました') : t('発注を下書き保存しました'));
    onClose();
    if (next) go('print/po/' + item.id);
  };
  return (
    <Modal title={po ? t`${po.no} を編集` : t('新しい発注')} onClose={onClose} size="lg"
      footer={<>{err && <span className="form-err">{err}</span>}<Btn kind="ghost" onClick={onClose}>{t("キャンセル")}</Btn><Btn kind="sub" onClick={() => save(false)}>{t("下書き保存")}</Btn><Btn onClick={() => save(true)}>{t("発注書を作成")}</Btn></>}>
      <div className="grid2">
        <Field label={t("仕入先（中国）")}>
          <select value={f.supplierId} onChange={e => up({ supplierId: e.target.value })}>
            {data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label={t("発注日")}><input type="date" value={f.date} onChange={e => up({ date: e.target.value })} /></Field>
        <Field label={t("納品場所")} hint={wh ? wh.address : ''}>
          <select value={f.warehouseId} onChange={e => up({ warehouseId: e.target.value })}>
            {data.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label={t("希望納期")}><input type="date" value={f.deliveryDate} onChange={e => up({ deliveryDate: e.target.value })} /></Field>
      </div>
      <h3 className="sub-h">{t("商品とケース数")}</h3>
      <LineEditor lines={f.lines} onChange={lines => up({ lines })} products={products}
        priceKey="unitCny" priceLabel={t("単価（元/ケース）")} defaultPrice={p => p.stdCostCny} formatAmount={rmb} />
      <div className="sum-bar">
        <span>{t("合計")}{' '}<b className="num">{num(caseSum(f.lines))}</b>{' '}{t("ケース")}</span>
        <span>{t("発注額")}{' '}<b className="num">{rmb(total)}</b></span>
        <span className="muted">{t("円換算の目安")}{' '}{yen(total * data.settings.cnyRate)}{t("（1元＝")}{data.settings.cnyRate}{t("円）")}</span>
      </div>
      <Field label={t("備考（発注書に載ります）")} wide>
        <textarea rows={3} value={f.note} onChange={e => up({ note: e.target.value })} placeholder={t("例：外箱に破損がないよう梱包をお願いします")} />
      </Field>
    </Modal>
  );
}

function ReceiveModal({ po, onClose }) {
  const { data, commit, toast } = useStore();
  const [date, setDate] = useState(todayStr());
  const [rate, setRate] = useState(data.settings.cnyRate);
  const [extra, setExtra] = useState('');
  const [wid, setWid] = useState(po.warehouseId);
  const [lines, setLines] = useState(po.lines.map(l => ({ ...l })));
  const cases = caseSum(lines);
  const per = cases ? (Number(extra) || 0) / cases : 0;
  const unitJpy = l => Math.round((Number(l.unitCny) || 0) * (Number(rate) || 0) + per);
  const totalJpy = lines.reduce((s, l) => s + unitJpy(l) * (Number(l.cases) || 0), 0);
  const setL = (i, patch) => setLines(ls => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const done = async () => {
    const L = lines.map(l => ({ productId: l.productId, cases: Number(l.cases) || 0, unitCny: Number(l.unitCny) || 0 }));
    if (!caseSum(L)) return;
    const lots = buildLots(po, { date, rate: Number(rate), extraTotal: Number(extra) || 0, lines: L, warehouseId: wid });
    const ok = await commit([
      ...lots.map(l => ({ op: 'upsert', key: 'lots', item: l })),
      { op: 'upsert', key: 'purchaseOrders', item: { id: po.id, status: 'received', receivedAt: date, receivedLines: L, receiveRate: Number(rate), receiveExtra: Number(extra) || 0, warehouseId: wid } },
    ]);
    if (ok) { toast(t`${po.no} を入荷しました（${num(caseSum(L))}ケース）`); onClose(); }
  };
  return (
    <Modal title={t`入荷処理　${po.no}`} onClose={onClose} size="lg"
      footer={<><Btn kind="ghost" onClick={onClose}>{t("キャンセル")}</Btn><Btn icon="check" onClick={done}>{t("入荷を確定して在庫に入れる")}</Btn></>}>
      <div className="grid4">
        <Field label={t("入荷日")}><input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label={t("入荷倉庫")}>
          <select value={wid} onChange={e => setWid(e.target.value)}>{data.warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        </Field>
        <Field label={t("為替（1元＝円）")}><input type="number" step="0.01" inputMode="decimal" value={rate} onChange={e => setRate(e.target.value)} /></Field>
        <Field label={t("付帯費用の合計（円）")}><input type="number" inputMode="numeric" value={extra} onChange={e => setExtra(e.target.value)} placeholder="0" /></Field>
      </div>
      <p className="muted small">{t("付帯費用：関税・酒税・海上運賃・通関費など、商品の原価に含める費用。ケース数で均等に割り振ります（ここに入れた費用は経費には入れないでください）。")}</p>
      <div className="tbl-wrap">
        <table className="tbl tbl-tight">
          <thead><tr><th>{t("商品")}</th><th className="r">{t("発注")}</th><th className="r">{t("実際の入荷ケース")}</th><th className="r">{t("実単価（元）")}</th><th className="r">{t("1ケース原価")}</th></tr></thead>
          <tbody>
            {lines.map((l, i) => {
              const p = byId(data.products, l.productId);
              const orig = po.lines[i];
              return (
                <tr key={i}>
                  <td className="lead"><span className="cell-prod"><ProductThumb product={p} size={32} />{p?.name}</span></td>
                  <td data-label={t("発注")} className="r num">{num(orig.cases)}</td>
                  <td data-label={t("入荷ケース")} className="r"><input className="in-sm" type="number" inputMode="numeric" value={l.cases} onChange={e => setL(i, { cases: e.target.value })} /></td>
                  <td data-label={t("実単価（元）")} className="r"><input className="in-sm" type="number" step="any" inputMode="decimal" value={l.unitCny} onChange={e => setL(i, { unitCny: e.target.value })} /></td>
                  <td data-label={t("1ケース原価")} className="r num"><b>{yen(unitJpy(l))}</b><div className="muted small">{t("1本")}{' '}{yen(unitJpy(l) / (p?.perCase || 1))}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sum-bar">
        <span>{t("入荷")}{' '}<b className="num">{num(cases)}</b>{' '}{t("ケース")}</span>
        <span>{t("付帯費用")}{' '}<b className="num">{yen(per)}</b>{t("／ケース")}</span>
        <span>{t("入荷原価の合計")}{' '}<b className="num">{yen(totalJpy)}</b></span>
      </div>
      <p className="muted small">{t("入荷ごとに「ロット」として原価を分けて記録します。出荷時は古いロットから順に引き当て、そのロットの原価で粗利を計算します。")}</p>
    </Modal>
  );
}
