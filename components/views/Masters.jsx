'use client';
import { useState } from 'react';
import { useStore } from '../store';
import { Btn, Field, Modal, PageHead, Tabs, Empty } from '../ui';
import { uid, todayStr, downloadText } from '../../lib/biz';
import { t } from '../../lib/i18n';

const CONF = {
  suppliers: {
    title: t('仕入先（中国）'), add: t('仕入先を追加'), refKey: 'purchaseOrders', refField: 'supplierId',
    fields: [['name', t('会社名'), 'text', true], ['contact', t('担当者')], ['email', t('メールアドレス（発注書の送り先）'), 'email'], ['tel', t('電話')], ['address', t('住所'), 'text', true]],
    sub: x => [x.contact, x.email].filter(Boolean).join('・'),
  },
  warehouses: {
    title: t('倉庫・納品場所'), add: t('納品場所を追加'), refKey: 'lots', refField: 'warehouseId',
    fields: [['name', t('名称'), 'text', true], ['address', t('住所（発注書に載ります）'), 'text', true], ['tel', t('電話')], ['contact', t('担当')]],
    sub: x => x.address,
  },
  agents: {
    title: t('代理店'), add: t('代理店を追加'), refKey: 'salesOrders', refField: 'agentId',
    fields: [['code', t('代理店コード')], ['name', t('会社名')], ['contact', t('担当者')], ['email', t('メールアドレス（請求書の送り先）'), 'email'], ['tel', t('電話')], ['address', t('住所・標準の納品先'), 'text', true]],
    sub: x => [x.code, x.contact, x.email].filter(Boolean).join('・'),
  },
};

export default function Masters() {
  const [tab, setTab] = useState('company');
  return (
    <>
      <PageHead title={t("マスタ・設定")} desc={t("会社情報、仕入先、納品場所、代理店、為替・税率などを設定します。")} />
      <Tabs value={tab} onChange={setTab} items={[
        { value: 'company', label: t('会社情報') }, { value: 'suppliers', label: t('仕入先') },
        { value: 'warehouses', label: t('納品場所') }, { value: 'agents', label: t('代理店') }, { value: 'system', label: t('システム') },
      ]} />
      {tab === 'company' && <Company />}
      {CONF[tab] && <CrudList key={tab} k={tab} />}
      {tab === 'system' && <System />}
    </>
  );
}

function Company() {
  const { data, commit, toast } = useStore();
  const [f, setF] = useState({ ...data.settings.company });
  const up = p => setF(s => ({ ...s, ...p }));
  const save = async () => { if (await commit([{ op: 'set', key: 'settings', value: { ...data.settings, company: f } }])) toast(t('会社情報を保存しました')); };
  const F = (k, label, wide, hint) => <Field label={label} wide={wide} hint={hint}><input type="text" value={f[k] || ''} onChange={e => up({ [k]: e.target.value })} /></Field>;
  return (
    <section className="panel">
      <p className="muted small">{t("発注書・請求書に載る情報です。")}</p>
      <div className="grid2">
        {F('name', t('会社名'))}
        {F('regNo', t('適格請求書の登録番号'), false, t('T＋13桁'))}
        {F('zip', t('郵便番号'))}
        {F('tel', t('電話'))}
        {F('address', t('住所'), true)}
        {F('email', t('メールアドレス'))}
        {F('representative', t('代表者'))}
        {F('person', t('担当部署・担当者'))}
        {F('bank', t('振込先（請求書に載ります）'), true)}
        {F('invoiceNote', t('請求書の備考'), true)}
      </div>
      <div className="form-actions"><Btn onClick={save}>{t("保存")}</Btn></div>
    </section>
  );
}

function CrudList({ k }) {
  const { data, commit, toast } = useStore();
  const c = CONF[k];
  const [edit, setEdit] = useState(null);
  const del = async x => {
    if (data[c.refKey].some(r => r[c.refField] === x.id)) { toast(t('取引履歴があるため削除できません'), 'danger'); return; }
    if (!window.confirm(t`${x.name} を削除しますか？`)) return;
    await commit([{ op: 'remove', key: k, id: x.id }]); toast(t('削除しました'));
  };
  return (
    <>
      <div className="toolbar"><span className="muted small">{data[k].length}{t("件")}</span><Btn icon="plus" onClick={() => setEdit({})}>{c.add}</Btn></div>
      {data[k].length ? (
        <ul className="mlist">
          {data[k].map(x => (
            <li key={x.id}>
              <div><b>{x.name}</b><div className="muted small">{c.sub(x)}</div></div>
              <div className="row-gap"><Btn kind="ghost" size="sm" onClick={() => del(x)}>{t("削除")}</Btn><Btn kind="sub" size="sm" onClick={() => setEdit(x)}>{t("編集")}</Btn></div>
            </li>
          ))}
        </ul>
      ) : <Empty title={t`${c.title}がまだありません`} />}
      {edit && (
        <Modal title={edit.id ? t`${c.title}を編集` : c.add} onClose={() => setEdit(null)}
          footer={<><Btn kind="ghost" onClick={() => setEdit(null)}>{t("キャンセル")}</Btn><Btn onClick={async () => {
            if (!(edit.name || '').trim()) { toast(t('名称を入れてください'), 'danger'); return; }
            const item = { ...edit, id: edit.id || uid() };
            if (await commit([{ op: 'upsert', key: k, item }])) { toast(t('保存しました')); setEdit(null); }
          }}>{t("保存")}</Btn></>}>
          <div className="grid2">
            {c.fields.map(([key, label, type = 'text', wide]) => (
              <Field key={key} label={label} wide={wide}><input type={type} value={edit[key] || ''} onChange={e => setEdit(s => ({ ...s, [key]: e.target.value }))} /></Field>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

function System() {
  const { data, commit, toast, mode, resetDemo } = useStore();
  const s = data.settings;
  const [f, setF] = useState({ cnyRate: s.cnyRate, taxRate: s.taxRate, paymentTermsDays: s.paymentTermsDays, orderFormNote: s.orderFormNote || '' });
  const up = p => setF(x => ({ ...x, ...p }));
  const save = async () => {
    const v = { ...s, cnyRate: Number(f.cnyRate) || 0, taxRate: Number(f.taxRate) || 0, paymentTermsDays: Number(f.paymentTermsDays) || 30, orderFormNote: f.orderFormNote };
    if (await commit([{ op: 'set', key: 'settings', value: v }])) toast(t('設定を保存しました'));
  };
  const exportAll = () => { const { ...all } = data; downloadText(t`AG一括管理_バックアップ_${todayStr()}.json`, JSON.stringify(all, null, 2), 'application/json'); };
  return (
    <>
      <section className="panel">
        <div className="grid3">
          <Field label={t("為替レート（1元＝円）")} hint={t("発注時の円換算と、入荷処理の初期値")}><input type="number" step="0.01" inputMode="decimal" value={f.cnyRate} onChange={e => up({ cnyRate: e.target.value })} /></Field>
          <Field label={t("消費税率（%）")} hint={t("酒類は標準税率10%")}><input type="number" inputMode="numeric" value={f.taxRate} onChange={e => up({ taxRate: e.target.value })} /></Field>
          <Field label={t("支払期限（請求日から何日）")}><input type="number" inputMode="numeric" value={f.paymentTermsDays} onChange={e => up({ paymentTermsDays: e.target.value })} /></Field>
        </div>
        <Field label={t("注文フォームの案内文")} wide><textarea rows={2} value={f.orderFormNote} onChange={e => up({ orderFormNote: e.target.value })} /></Field>
        <div className="form-actions"><Btn onClick={save}>{t("保存")}</Btn></div>
      </section>
      <section className="panel mt">
        <div className="panel-head"><h2>{t("データ")}</h2></div>
        <p>{t("保存先：")}<b>{mode === 'redis' ? t('Upstash Redis（全員で共有）') : t('このブラウザ（デモ用・この端末だけ）')}</b></p>
        {mode !== 'redis' && <p className="muted small">{t("Vercel に Upstash の環境変数を設定すると、自動で Upstash に保存されるようになります（README 参照）。")}</p>}
        <div className="row-gap">
          <Btn kind="sub" icon="download" onClick={exportAll}>{t("全データをバックアップ（JSON）")}</Btn>
          <Btn kind="ghost" className="danger-text" onClick={async () => { if (window.confirm(t('すべてのデータを消して、デモデータに戻しますか？'))) { await resetDemo(); toast(t('デモデータに戻しました')); } }}>{t("デモデータに戻す")}</Btn>
        </div>
      </section>
    </>
  );
}
