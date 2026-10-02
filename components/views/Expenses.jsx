'use client';
import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Btn, Field, Modal, Empty, PageHead, Stat } from '../ui';
import { Icon } from '../icons';
import { uid, todayStr, ym, addMonths, fmtMonth, fmtDate, yen, EXPENSE_CATS, PAY_METHODS, toCSV, downloadText, compressImage, monthPL } from '../../lib/biz';
import { t } from '../../lib/i18n';

export default function Expenses() {
  const { data, commit, toast } = useStore();
  const [m, setM] = useState(ym(todayStr()));
  const [edit, setEdit] = useState(null);
  const list = data.expenses.filter(e => ym(e.date) === m).sort((a, b) => b.date.localeCompare(a.date));
  const sum = list.reduce((s, e) => s + Number(e.amount || 0), 0);
  const prev = data.expenses.filter(e => ym(e.date) === addMonths(m, -1)).reduce((s, e) => s + Number(e.amount || 0), 0);
  const byCat = EXPENSE_CATS.map(c => ({ c, v: list.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount || 0), 0) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  const maxCat = Math.max(1, ...byCat.map(x => x.v));
  const months = Array.from({ length: 6 }, (_, i) => addMonths(m, i - 5));
  const trend = months.map(mm => ({ m: mm, v: data.expenses.filter(e => ym(e.date) === mm).reduce((s, e) => s + Number(e.amount || 0), 0) }));
  const maxT = Math.max(1, ...trend.map(x => x.v));
  const pl = monthPL(data, m);
  const del = async e => { if (!window.confirm(t('この経費を削除しますか？'))) return; await commit([{ op: 'remove', key: 'expenses', id: e.id }]); toast(t('経費を削除しました')); };
  const exportCSV = () => {
    const out = [[t('日付'), t('勘定科目'), t('支払先・内容'), t('支払方法'), t('金額'), t('メモ')]];
    list.forEach(e => out.push([e.date, t(e.category), e.vendor, t(e.method), e.amount, e.note]));
    downloadText(t`経費_${m}.csv`, toCSV(out));
  };
  return (
    <>
      <PageHead title={t("経費")} desc={t("倉庫代・家賃・配送費など、商品原価以外の費用を記録します。関税や海上運賃は「入荷処理」の付帯費用に入れると商品原価に含まれます。")}
        actions={<><Btn kind="sub" icon="download" onClick={exportCSV}>CSV</Btn><Btn icon="plus" onClick={() => setEdit({})}>{t("経費を追加")}</Btn></>} />
      <div className="month-nav">
        <button type="button" className="icon-btn" onClick={() => setM(addMonths(m, -1))} aria-label={t("前の月")}>‹</button>
        <b>{fmtMonth(m)}</b>
        <button type="button" className="icon-btn" onClick={() => setM(addMonths(m, 1))} aria-label={t("次の月")}>›</button>
      </div>
      <div className="stats">
        <Stat label={t("今月の経費")} value={yen(sum)} sub={t`前月 ${yen(prev)}（${sum - prev >= 0 ? '+' : ''}${yen(sum - prev)}）`} />
        <Stat label={t("粗利")} value={yen(pl.gross)} sub={t("出荷分の売上 − 原価")} />
        <Stat label={t("営業利益")} value={yen(pl.op)} tone={pl.op < 0 ? 'danger' : ''} sub={t("粗利 − 経費")} />
      </div>
      <div className="dash-cols">
        <section className="panel">
          <div className="panel-head"><h2>{t("科目別")}</h2></div>
          {byCat.length ? (
            <ul className="hbars">
              {byCat.map(x => (
                <li key={x.c}><span className="hb-label">{t(x.c)}</span><span className="hb-track"><span className="hb-fill" style={{ width: `${x.v / maxCat * 100}%` }} /></span><span className="hb-val num">{yen(x.v)}</span></li>
              ))}
            </ul>
          ) : <p className="muted small">{t("この月の経費はまだありません。")}</p>}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>{t("6か月の推移")}</h2></div>
          <div className="mchart mchart-sm">
            {trend.map(x => (
              <button type="button" className={'mchart-col' + (x.m === m ? ' on' : '')} key={x.m} onClick={() => setM(x.m)} aria-label={`${fmtMonth(x.m)} ${yen(x.v)}`}>
                <div className="mchart-bars"><span className="mbar mbar-exp" style={{ height: `${x.v / maxT * 100}%` }} /></div>
                <span className="mchart-label">{Number(x.m.slice(5))}{t("月")}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      {list.length ? (
        <div className="tbl-wrap mt">
          <table className="tbl">
            <thead><tr><th>{t("日付")}</th><th>{t("科目")}</th><th>{t("支払先・内容")}</th><th>{t("支払方法")}</th><th className="r">{t("金額")}</th><th></th></tr></thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id}>
                  <td className="lead"><b>{e.vendor || t(e.category)}</b><span className="muted small block">{fmtDate(e.date)}{e.note ? '・' + e.note : ''}</span></td>
                  <td data-label={t("科目")}>{t(e.category)}</td>
                  <td data-label={t("支払先・内容")}>{e.vendor}{e.receipt && <span className="muted small">{' '}{t("📎領収書")}</span>}</td>
                  <td data-label={t("支払方法")}>{t(e.method)}</td>
                  <td data-label={t("金額")} className="r num"><b>{yen(e.amount)}</b></td>
                  <td className="actions"><Btn kind="ghost" size="sm" onClick={() => del(e)}>{t("削除")}</Btn><Btn kind="sub" size="sm" onClick={() => setEdit(e)}>{t("編集")}</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <Empty title={t`${fmtMonth(m)}の経費はまだありません`} action={<Btn icon="plus" onClick={() => setEdit({ date: m === ym(todayStr()) ? todayStr() : m + '-01' })}>{t("経費を追加")}</Btn>} />}
      {edit && <ExpenseModal exp={edit.id ? edit : null} initDate={edit.date} onClose={() => setEdit(null)} />}
    </>
  );
}

function ExpenseModal({ exp, initDate, onClose }) {
  const { commit, toast } = useStore();
  const [f, setF] = useState(() => exp ? { ...exp } : { date: initDate || todayStr(), category: EXPENSE_CATS[0], amount: '', vendor: '', method: PAY_METHODS[0], note: '', receipt: '' });
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const up = p => setF(s => ({ ...s, ...p }));
  const save = async () => {
    if (!(Number(f.amount) > 0)) return setErr(t('金額を入れてください'));
    const item = { ...f, id: exp ? exp.id : uid(), amount: Number(f.amount) };
    if (await commit([{ op: 'upsert', key: 'expenses', item }])) { toast(exp ? t('経費を更新しました') : t('経費を追加しました')); onClose(); }
  };
  return (
    <Modal title={exp ? t('経費を編集') : t('経費を追加')} onClose={onClose}
      footer={<>{err && <span className="form-err">{err}</span>}<Btn kind="ghost" onClick={onClose}>{t("キャンセル")}</Btn><Btn onClick={save}>{t("保存")}</Btn></>}>
      <div className="grid2">
        <Field label={t("日付")}><input type="date" value={f.date} onChange={e => up({ date: e.target.value })} /></Field>
        <Field label={t("金額（円・税込）")}><input type="number" inputMode="numeric" value={f.amount} onChange={e => up({ amount: e.target.value })} /></Field>
        <Field label={t("勘定科目")}><select value={f.category} onChange={e => up({ category: e.target.value })}>{EXPENSE_CATS.map(c => <option key={c} value={c}>{t(c)}</option>)}</select></Field>
        <Field label={t("支払方法")}><select value={f.method} onChange={e => up({ method: e.target.value })}>{PAY_METHODS.map(c => <option key={c} value={c}>{t(c)}</option>)}</select></Field>
      </div>
      <Field label={t("支払先・内容")} wide><input type="text" value={f.vendor} onChange={e => up({ vendor: e.target.value })} placeholder={t("例：博多港倉庫 10月分")} /></Field>
      <Field label={t("メモ")} wide><input type="text" value={f.note} onChange={e => up({ note: e.target.value })} /></Field>
      <div className="receipt">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async e => { const file = e.target.files && e.target.files[0]; if (file) { try { up({ receipt: await compressImage(file, 900, 0.7) }); } catch (er) { setErr(er.message); } } e.target.value = ''; }} />
        {f.receipt ? <><img src={f.receipt} alt={t("領収書")} /><Btn kind="ghost" size="sm" onClick={() => up({ receipt: '' })}>{t("領収書を外す")}</Btn></>
          : <Btn kind="sub" size="sm" onClick={() => fileRef.current && fileRef.current.click()}><Icon name="plus" size={16} />{t("領収書の写真を添付")}</Btn>}
      </div>
    </Modal>
  );
}
