'use client';
import { Fragment, useState } from 'react';
import { useStore } from '../store';
import { Btn, Field, Modal, Chip, PageHead, ProductThumb, Stat, Empty } from '../ui';
import { Icon } from '../icons';
import { uid, todayStr, byId, fmtDate, yen, num, stockOf, stockValue, reservedOf, incomingOf, spec, toCSV, downloadText } from '../../lib/biz';
import { t } from '../../lib/i18n';

export default function Inventory() {
  const { data } = useStore();
  const [wid, setWid] = useState('');
  const [open, setOpen] = useState({});
  const [adj, setAdj] = useState(null);
  const [showEmpty, setShowEmpty] = useState(false);

  const rows = data.products.map(p => {
    const stock = stockOf(data.lots, p.id, wid), value = stockValue(data.lots, p.id, wid);
    const reserved = reservedOf(data.salesOrders, p.id), all = stockOf(data.lots, p.id);
    return { p, stock, value, reserved, avail: all - reserved, incoming: incomingOf(data.purchaseOrders, p.id), avg: stock ? value / stock : 0 };
  });
  const totalCases = rows.reduce((s, r) => s + r.stock, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const lowCount = rows.filter(r => r.p.active !== false && r.avail <= (r.p.reorderPoint || 0)).length;

  const exportCSV = () => {
    const out = [[t('商品コード'), t('商品名'), t('倉庫'), t('入荷日'), t('発注No'), t('仕入単価(元)'), t('為替'), t('付帯費用/ケース'), t('原価/ケース(円)'), t('入荷ケース'), t('残ケース'), t('在庫金額(円)')]];
    data.lots.filter(l => !wid || l.warehouseId === wid).forEach(l => {
      const p = byId(data.products, l.productId) || {};
      out.push([p.code, p.name, byId(data.warehouses, l.warehouseId)?.name, l.receivedDate, l.poNo, l.unitCny, l.rate, l.extraPerCase, l.unitCostJpy, l.cases, l.remaining, l.remaining * l.unitCostJpy]);
    });
    downloadText(t`在庫ロット_${todayStr()}.csv`, toCSV(out));
  };

  return (
    <>
      <PageHead title={t("在庫管理")} desc={t("入荷ごとに仕入単価・為替・付帯費用を記録した「ロット」で在庫を持ちます。単価が変わっても、どの在庫がいくらで仕入れたものか分かります。")}
        actions={<Btn kind="sub" icon="download" onClick={exportCSV}>{t("ロット一覧CSV")}</Btn>} />
      <div className="stats">
        <Stat label={t("在庫ケース数")} value={num(totalCases)} sub={wid ? byId(data.warehouses, wid)?.name : t('全倉庫')} />
        <Stat label={t("在庫評価額（原価）")} value={yen(totalValue)} />
        <Stat label={t("発注点を下回る商品")} value={lowCount} tone={lowCount ? 'warn' : ''} sub={t("出荷できる数で判定")} />
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label={t("倉庫で絞り込み")}>
          <button type="button" className={!wid ? 'on' : ''} onClick={() => setWid('')}>{t("全倉庫")}</button>
          {data.warehouses.map(w => <button type="button" key={w.id} className={wid === w.id ? 'on' : ''} onClick={() => setWid(w.id)}>{w.name}</button>)}
        </div>
        <label className="check"><input type="checkbox" checked={showEmpty} onChange={e => setShowEmpty(e.target.checked)} />{t("出庫済みのロットも表示")}</label>
      </div>
      {rows.length ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>{t("商品")}</th><th className="r">{t("在庫")}</th><th className="r">{t("出荷待ち")}</th><th className="r">{t("出荷できる数")}</th><th className="r">{t("入荷待ち")}</th><th className="r">{t("平均原価/ケース")}</th><th className="r">{t("在庫金額")}</th><th></th></tr></thead>
            <tbody>
              {rows.map(r => {
                const low = r.p.active !== false && r.avail <= (r.p.reorderPoint || 0);
                const lots = data.lots.filter(l => l.productId === r.p.id && (!wid || l.warehouseId === wid) && (showEmpty || l.remaining > 0))
                  .sort((a, b) => b.receivedDate.localeCompare(a.receivedDate));
                const isOpen = !!open[r.p.id];
                return (
                  <Fragment key={r.p.id}>
                    <tr className={isOpen ? 'row-open' : ''}>
                      <td className="lead">
                        <span className="cell-prod"><ProductThumb product={r.p} size={40} />
                          <span><b>{r.p.name}</b><span className="muted small block">{r.p.code}・{spec(r.p)}</span></span>
                        </span>
                      </td>
                      <td data-label={t("在庫")} className="r num">{num(r.stock)}</td>
                      <td data-label={t("出荷待ち")} className="r num">{r.reserved ? num(r.reserved) : '—'}</td>
                      <td data-label={t("出荷できる数")} className="r num"><b>{num(r.avail)}</b>{low && <> <Chip tone="warn">{t("発注点")}{' '}{r.p.reorderPoint}</Chip></>}</td>
                      <td data-label={t("入荷待ち")} className="r num">{r.incoming ? num(r.incoming) : '—'}</td>
                      <td data-label={t("平均原価/ケース")} className="r num">{r.avg ? yen(r.avg) : '—'}</td>
                      <td data-label={t("在庫金額")} className="r num">{yen(r.value)}</td>
                      <td className="actions">
                        <Btn kind="ghost" size="sm" onClick={() => setOpen(o => ({ ...o, [r.p.id]: !o[r.p.id] }))} aria-expanded={isOpen}>{t("ロット")}{' '}{lots.length}{t("件")}{' '}<Icon name="chev" size={14} className={'rot' + (isOpen ? ' on' : '')} />
                        </Btn>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="sub-row"><td colSpan={8}>
                        {lots.length ? (
                          <table className="tbl tbl-sub">
                            <thead><tr><th>{t("入荷日")}</th><th>{t("発注No")}</th><th>{t("倉庫")}</th><th className="r">{t("仕入単価")}</th><th className="r">{t("為替")}</th><th className="r">{t("付帯/ケース")}</th><th className="r">{t("原価/ケース")}</th><th className="r">{t("残 / 入荷")}</th><th></th></tr></thead>
                            <tbody>
                              {lots.map(l => {
                                const prev = data.lots.filter(x => x.productId === l.productId && x.receivedDate < l.receivedDate).sort((a, b) => b.receivedDate.localeCompare(a.receivedDate))[0];
                                const diff = prev ? l.unitCostJpy - prev.unitCostJpy : 0;
                                return (
                                  <tr key={l.id} className={l.remaining ? '' : 'faded'}>
                                    <td data-label={t("入荷日")}>{fmtDate(l.receivedDate)}</td>
                                    <td data-label={t("発注No")} className="num">{l.poNo || t('手動')}</td>
                                    <td data-label={t("倉庫")}>{byId(data.warehouses, l.warehouseId)?.name}</td>
                                    <td data-label={t("仕入単価")} className="r num">{num(l.unitCny)}{' '}{t("元")}</td>
                                    <td data-label={t("為替")} className="r num">{l.rate}</td>
                                    <td data-label={t("付帯/ケース")} className="r num">{yen(l.extraPerCase)}</td>
                                    <td data-label={t("原価/ケース")} className="r num"><b>{yen(l.unitCostJpy)}</b>{diff !== 0 && <span className={'diff ' + (diff > 0 ? 'up' : 'down')}>{diff > 0 ? '▲' : '▼'}{yen(Math.abs(diff))}</span>}</td>
                                    <td data-label={t("残 / 入荷")} className="r num"><b>{num(l.remaining)}</b> / {num(l.cases)}</td>
                                    <td className="actions"><Btn kind="ghost" size="sm" onClick={() => setAdj(l)}>{t("数量調整")}</Btn></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ) : <p className="muted small pad">{t("在庫のあるロットはありません。")}</p>}
                      </td></tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t("商品がまだありません")}>{t("「商品登録」で商品を登録し、発注→入荷処理をすると在庫が入ります。")}</Empty>}
      <History />
      {adj && <AdjustModal lot={adj} onClose={() => setAdj(null)} />}
    </>
  );
}

function History() {
  const { data } = useStore();
  const list = [...data.adjustments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  if (!list.length) return null;
  return (
    <section className="panel mt">
      <div className="panel-head"><h2>{t("数量調整の履歴")}</h2></div>
      <ul className="mini-list">
        {list.map(a => (
          <li key={a.id}>
            <div><b>{byId(data.products, a.productId)?.name}</b><div className="muted small">{fmtDate(a.date)}・{t(a.reason)}{a.note ? '・' + a.note : ''}</div></div>
            <div className={'r num ' + (a.delta < 0 ? 'neg' : '')}>{a.delta > 0 ? '+' : ''}{a.delta}{' '}{t("ケース")}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdjustModal({ lot, onClose }) {
  const { data, commit, toast } = useStore();
  const p = byId(data.products, lot.productId);
  const [delta, setDelta] = useState('-1');
  const [reason, setReason] = useState('破損');
  const [note, setNote] = useState('');
  const d = parseInt(delta, 10) || 0;
  const after = lot.remaining + d;
  const save = async () => {
    if (!d || after < 0) return;
    const ok = await commit([
      { op: 'upsert', key: 'lots', item: { id: lot.id, remaining: after } },
      { op: 'upsert', key: 'adjustments', item: { id: uid(), date: todayStr(), lotId: lot.id, productId: lot.productId, delta: d, reason, note } },
    ]);
    if (ok) { toast(t('在庫数を調整しました')); onClose(); }
  };
  return (
    <Modal title={t("在庫の数量調整")} onClose={onClose}
      footer={<><Btn kind="ghost" onClick={onClose}>{t("キャンセル")}</Btn><Btn onClick={save} disabled={!d || after < 0}>{t("調整を保存")}</Btn></>}>
      <p><b>{p?.name}</b>　<span className="muted">{fmtDate(lot.receivedDate)}{t("入荷・")}{lot.poNo}{t("・原価")}{' '}{yen(lot.unitCostJpy)}{t("/ケース")}</span></p>
      <div className="grid2">
        <Field label={t("増減（ケース）")} hint={t("減らすときはマイナス（例：-2）")}><input type="number" inputMode="numeric" value={delta} onChange={e => setDelta(e.target.value)} /></Field>
        <Field label={t("理由")}>
          <select value={reason} onChange={e => setReason(e.target.value)}>
            {['破損', '棚卸差異', 'サンプル・試飲', '返品受入', 'その他'].map(r => <option key={r} value={r}>{t(r)}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t("メモ")} wide><input type="text" value={note} onChange={e => setNote(e.target.value)} /></Field>
      <div className="sum-bar"><span>{t("現在")}{' '}<b className="num">{lot.remaining}</b></span><span>{t("調整後")}{' '}<b className={'num' + (after < 0 ? ' neg' : '')}>{after}</b>{' '}{t("ケース")}</span>{after < 0 && <span className="neg">{t("在庫がマイナスになります")}</span>}</div>
    </Modal>
  );
}
