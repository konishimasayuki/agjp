'use client';
import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Btn, Field, Modal, Chip, Empty, PageHead, ProductThumb } from '../ui';
import { DEMO_IMAGES, DEMO_IMAGE_CREDITS } from '../../lib/seed';
import { Icon } from '../icons';
import { uid, yen, num, rmb, stockOf, spec, compressImage } from '../../lib/biz';

export default function Products() {
  const { data } = useStore();
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const list = data.products.filter(p => !q || [p.name, p.nameCn, p.code, p.note].join(' ').toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHead title="商品登録" desc="写真・商品名・ケースの入数などを登録します。登録した商品は発注・注文フォーム・請求書で使われます。"
        actions={<Btn icon="plus" onClick={() => setEdit({})}>商品を追加</Btn>} />
      <div className="toolbar">
        <label className="search"><Icon name="search" size={18} /><input type="search" placeholder="商品名・中国語名・コードで探す" value={q} onChange={e => setQ(e.target.value)} aria-label="商品を検索" /></label>
        <span className="muted small">{list.length}件</span>
      </div>
      {list.length ? (
        <div className="pgrid">
          {list.map(p => {
            const st = stockOf(data.lots, p.id);
            return (
              <button type="button" className="pcard" key={p.id} onClick={() => setEdit(p)}>
                <span className="pcard-img">{p.image ? <img src={p.image} alt="" /> : <ProductThumb product={p} size={120} />}</span>
                <span className="pcard-body">
                  <span className="pcard-code num">{p.code}{p.active === false && <Chip tone="plain">フォーム非掲載</Chip>}</span>
                  <span className="pcard-name">{p.name}</span>
                  <span className="pcard-cn">{p.nameCn}</span>
                  <span className="pcard-spec">{spec(p)}・{p.abv}度</span>
                  <span className="pcard-foot"><span className="num"><b>{yen(p.salePrice)}</b><span className="muted small">/ケース</span></span><span className={'num small ' + (st <= (p.reorderPoint || 0) ? 'neg' : 'muted')}>在庫 {num(st)}</span></span>
                </span>
              </button>
            );
          })}
        </div>
      ) : <Empty title={q ? '見つかりませんでした' : '商品がまだありません'} action={!q && <Btn icon="plus" onClick={() => setEdit({})}>商品を追加</Btn>} />}
      {data.products.some(p => DEMO_IMAGE_CREDITS[p.id] && p.image === DEMO_IMAGES[p.id]) && (
        <details className="credits">
          <summary>サンプル写真のクレジット</summary>
          <p className="muted small">デモ用に Wikimedia Commons の写真を使っています。実際の商品写真に差し替えてください。</p>
          <ul>{data.products.filter(p => DEMO_IMAGE_CREDITS[p.id] && p.image === DEMO_IMAGES[p.id]).map(p => <li key={p.id}>{p.name}：{DEMO_IMAGE_CREDITS[p.id]}</li>)}</ul>
        </details>
      )}
      {edit && <ProductModal product={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </>
  );
}

const COLORS = ['#1B3F8B', '#8A4B1F', '#C99A2E', '#C2416B', '#3E8E5A', '#5B6782'];

function ProductModal({ product, onClose }) {
  const { data, commit, toast } = useStore();
  const [f, setF] = useState(() => product ? { ...product } : { code: '', name: '', nameCn: '', perCase: 12, volumeMl: 500, abv: 15, salePrice: '', stdCostCny: '', reorderPoint: 10, note: '', image: '', color: COLORS[data.products.length % COLORS.length], active: true });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const up = patch => setF(s => ({ ...s, ...patch }));
  const onFile = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setBusy(true);
    try { up({ image: await compressImage(file) }); } catch (er) { setErr(er.message); }
    setBusy(false); e.target.value = '';
  };
  const used = product && (data.lots.some(l => l.productId === product.id) || data.salesOrders.some(o => o.lines.some(l => l.productId === product.id)) || data.purchaseOrders.some(o => o.lines.some(l => l.productId === product.id)));
  const save = async () => {
    if (!f.name.trim()) return setErr('商品名を入れてください');
    if (!(Number(f.perCase) > 0)) return setErr('ケースの入数を入れてください');
    const item = { ...f, id: product ? product.id : uid(), perCase: Number(f.perCase), volumeMl: Number(f.volumeMl) || 0, abv: Number(f.abv) || 0, salePrice: Number(f.salePrice) || 0, stdCostCny: Number(f.stdCostCny) || 0, reorderPoint: Number(f.reorderPoint) || 0 };
    if (await commit([{ op: 'upsert', key: 'products', item }])) { toast(product ? '商品を更新しました' : '商品を追加しました'); onClose(); }
  };
  const del = async () => {
    if (used) { up({ active: false }); setErr('取引履歴がある商品は削除できないため「注文フォームに載せない」にしました。保存してください。'); return; }
    if (!window.confirm(`${product.name} を削除しますか？`)) return;
    if (await commit([{ op: 'remove', key: 'products', id: product.id }])) { toast('商品を削除しました'); onClose(); }
  };
  const perBottle = f.salePrice && f.perCase ? Math.round(f.salePrice / f.perCase) : 0;
  const estCost = (Number(f.stdCostCny) || 0) * data.settings.cnyRate;
  return (
    <Modal title={product ? '商品を編集' : '商品を追加'} onClose={onClose} size="lg"
      footer={<>{product && <Btn kind="ghost" className="mr-auto danger-text" onClick={del}>削除</Btn>}{err && <span className="form-err">{err}</span>}<Btn kind="ghost" onClick={onClose}>キャンセル</Btn><Btn onClick={save} disabled={busy}>保存</Btn></>}>
      <div className="prod-form">
        <div className="prod-photo">
          <div className="prod-photo-box">{f.image ? <img src={f.image} alt="商品写真" /> : <ProductThumb product={f} size={180} />}</div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} hidden />
          <div className="row-gap">
            <Btn kind="sub" size="sm" onClick={() => fileRef.current && fileRef.current.click()} disabled={busy}>{busy ? '読み込み中…' : f.image ? '写真を変える' : '写真を選ぶ'}</Btn>
            {f.image && <Btn kind="ghost" size="sm" onClick={() => up({ image: '' })}>写真を外す</Btn>}
          </div>
          {!f.image && <div className="swatches" aria-label="写真がないときの色">{COLORS.map(c => <button type="button" key={c} style={{ background: c }} className={f.color === c ? 'on' : ''} onClick={() => up({ color: c })} aria-label={'色 ' + c} />)}</div>}
          <p className="muted small">写真は自動で縮小して保存します。</p>
        </div>
        <div className="grid2 grow">
          <Field label="商品名"><input type="text" value={f.name} onChange={e => up({ name: e.target.value })} placeholder="例：紹興酒 花彫 5年" /></Field>
          <Field label="中国語名（発注書に載ります）"><input type="text" value={f.nameCn} onChange={e => up({ nameCn: e.target.value })} placeholder="例：绍兴花雕酒 五年陈" /></Field>
          <Field label="商品コード"><input type="text" value={f.code} onChange={e => up({ code: e.target.value })} /></Field>
          <Field label="ケースの入数（本）"><input type="number" inputMode="numeric" value={f.perCase} onChange={e => up({ perCase: e.target.value })} /></Field>
          <Field label="容量（ml）"><input type="number" inputMode="numeric" value={f.volumeMl} onChange={e => up({ volumeMl: e.target.value })} /></Field>
          <Field label="アルコール度数（%）"><input type="number" step="0.1" inputMode="decimal" value={f.abv} onChange={e => up({ abv: e.target.value })} /></Field>
          <Field label="代理店への販売単価（円/ケース・税抜）" hint={perBottle ? `1本あたり ${yen(perBottle)}` : ''}><input type="number" inputMode="numeric" value={f.salePrice} onChange={e => up({ salePrice: e.target.value })} /></Field>
          <Field label="標準の仕入単価（元/ケース）" hint={estCost ? `円換算 約${yen(estCost)}（発注時の初期値）` : '発注時の初期値になります'}><input type="number" step="any" inputMode="decimal" value={f.stdCostCny} onChange={e => up({ stdCostCny: e.target.value })} /></Field>
          <Field label="発注点（ケース）" hint="出荷できる数がこれ以下になると知らせます"><input type="number" inputMode="numeric" value={f.reorderPoint} onChange={e => up({ reorderPoint: e.target.value })} /></Field>
          <Field label="注文フォーム">
            <label className="check"><input type="checkbox" checked={f.active !== false} onChange={e => up({ active: e.target.checked })} />代理店の注文フォームに載せる</label>
          </Field>
          <Field label="備考" wide><textarea rows={3} value={f.note} onChange={e => up({ note: e.target.value })} placeholder="保管方法、販売上の注意など" /></Field>
        </div>
      </div>
    </Modal>
  );
}
