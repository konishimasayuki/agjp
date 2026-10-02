'use client';
import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { Btn, Field, Modal, Chip, Empty, PageHead, Stat, ProductThumb } from '../ui';
import { Icon } from '../icons';
import { todayStr, fmtDate, yen, num, byId, uid, totals, downloadText, toCSV } from '../../lib/biz';
import { STAGES, STAGE_BY, FLOW, ACT_TYPES, ACT_LABEL, RANKS, AREAS, agentStats, sortRows, agoLabel, needsFollow } from '../../lib/sales';
import { salesDemoOps } from '../../lib/seed';

const fmtShort = d => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : '');
const SORTS = [['follow', '要フォロー順'], ['sales', '売上が大きい順'], ['order', '最近注文した順'], ['name', '名前順']];

function Progress({ stage }) {
  const idx = FLOW.indexOf(stage);
  return (
    <span className={'pstep s-' + stage} role="img" aria-label={STAGE_BY[stage].label}>
      {FLOW.map((f, i) => <i key={f} className={stage !== 'dormant' && i <= idx ? 'on' : ''} />)}
    </span>
  );
}

const Rank = ({ rank }) => (rank ? <span className={'rank rank-' + rank} title={`ランク${rank}`}>{rank}</span> : null);

function NextChip({ r }) {
  if (!r.nextDate) return null;
  if (r.overdue) return <Chip tone="danger">{fmtShort(r.nextDate)} 期限切れ</Chip>;
  if (r.dueToday) return <Chip tone="warn">今日</Chip>;
  return <Chip tone={r.soon ? 'blue' : 'plain'}>{fmtShort(r.nextDate)}</Chip>;
}

function Spark({ series }) {
  const max = Math.max(1, ...series.map(s => s.sales));
  return (
    <span className="spark" aria-hidden="true">
      {series.map(s => <i key={s.m} style={{ height: Math.max(2, Math.round((s.sales / max) * 22)) + 'px' }} className={s.sales ? 'on' : ''} />)}
    </span>
  );
}

export default function SalesSupport() {
  const { data, commit, toast } = useStore();
  const today = todayStr();
  const [view, setView] = useState('list');
  const [stage, setStage] = useState('all');
  const [q, setQ] = useState('');
  const [area, setArea] = useState('');
  const [sort, setSort] = useState('follow');
  const [selId, setSelId] = useState(null);
  const [edit, setEdit] = useState(null);

  const rows = useMemo(() => data.agents.map(a => agentStats(data, a, today)), [data, today]);
  const inStage = id => rows.filter(r => r.stage === id);
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return sortRows(rows.filter(r => (stage === 'all' || r.stage === stage) && (!area || r.agent.area === area)
      && (!k || [r.agent.name, r.agent.code, r.agent.contact, r.agent.area, r.agent.owner].join(' ').toLowerCase().includes(k))), sort);
  }, [rows, stage, area, q, sort]);

  const active = inStage('active');
  const pipe = rows.filter(r => ['lead', 'talk', 'proposal'].includes(r.stage));
  const follow = rows.filter(needsFollow);
  const overdueN = rows.filter(r => r.overdue).length;
  const risk = rows.filter(r => r.risk);
  const sum = (arr, f) => arr.reduce((s, r) => s + f(r), 0);
  const needDemo = !data.agents.some(a => a.stage) && !(data.activities || []).length;
  const urgent = sortRows(rows.filter(r => needsFollow(r) || r.risk), 'follow').slice(0, 4);

  const moveStage = async (r, dir) => {
    const i = STAGES.findIndex(s => s.id === r.stage) + dir;
    if (i < 0 || i >= STAGES.length) return;
    if (await commit([{ op: 'upsert', key: 'agents', item: { id: r.agent.id, stage: STAGES[i].id } }])) toast(`${r.agent.name}を「${STAGES[i].label}」にしました`);
  };
  const loadDemo = async () => { if (await commit(salesDemoOps(data))) toast('営業のサンプルを追加しました'); };
  const exportCsv = () => {
    const head = ['会社名', 'コード', 'エリア', '自社担当', '先方担当', '進捗', 'ランク', '最終接触', '次のアクション', '次回日', '直近3か月売上(税抜)', '累計売上(税抜)', '注文回数', '最終注文'];
    const body = shown.map(r => [r.agent.name, r.agent.code, r.agent.area, r.agent.owner, r.agent.contact, STAGE_BY[r.stage].label, r.agent.rank, r.lastContact, r.agent.nextAction, r.nextDate, r.sales3m, r.salesTotal, r.orderCount, r.lastOrder]);
    downloadText(`AG営業一覧_${today}.csv`, '\ufeff' + toCSV([head, ...body]));
  };
  const subOf = id => {
    if (id === 'active') return `3か月 ${yen(sum(active, r => r.sales3m))}`;
    if (id === 'dormant') return inStage(id).length ? '掘り起こし対象' : '—';
    const v = sum(inStage(id), r => Number(r.agent.potentialMonthly) || 0);
    return v ? `見込み月商 ${yen(v)}` : '—';
  };

  return (
    <>
      <PageHead title="営業支援" desc="代理店ごとの進捗・最終接触・次の一手・売上をひと目で。商談の記録も、ここから残せます。"
        actions={<><Btn kind="sub" icon="download" onClick={exportCsv}>CSV</Btn><Btn icon="plus" onClick={() => setEdit({ stage: 'lead', rank: 'B' })}>代理店を追加</Btn></>} />

      {needDemo && (
        <section className="panel demo-banner">
          <div><b>営業のサンプルデータがありません</b><p className="muted small">代理店を14社に増やし、進捗・活動履歴の入った状態を追加します（今のデータは消えません）。</p></div>
          <Btn onClick={loadDemo}>サンプルを追加</Btn>
        </section>
      )}

      <div className="stats">
        <Stat label="取引中の代理店" value={`${active.length}社`} sub={`直近3か月の売上 ${yen(sum(active, r => r.sales3m))}`} />
        <Stat label="商談パイプライン" value={`${pipe.length}社`} sub={`見込み月商 ${yen(sum(pipe, r => Number(r.agent.potentialMonthly) || 0))}`} />
        <Stat label="今日までにフォロー" value={`${follow.length}件`} tone={follow.length ? 'warn' : ''} sub={overdueN ? `うち期限切れ ${overdueN}件` : '期限切れはありません'} />
        <Stat label="注文が途絶えている" value={`${risk.length}社`} tone={risk.length ? 'danger' : ''} sub="取引中で45日以上注文なし" />
      </div>

      {urgent.length > 0 && (
        <section className="urgent">
          <h2>今すぐ動く代理店</h2>
          <div className="urgent-grid">
            {urgent.map(r => (
              <button type="button" key={r.agent.id} className="urgent-card" onClick={() => setSelId(r.agent.id)}>
                <span className="urgent-top"><b>{r.agent.name}</b><NextChip r={r} />{r.risk && !r.nextDate && <Chip tone="danger">{r.daysSinceOrder}日注文なし</Chip>}</span>
                <span className="urgent-act">{r.agent.nextAction || (r.risk ? '注文が途絶えています。連絡を' : '次のアクションを決めましょう')}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="funnel" role="group" aria-label="進捗で絞り込み">
        <button type="button" className={'fn' + (stage === 'all' ? ' on' : '')} onClick={() => setStage('all')}>
          <span className="fn-label">すべて</span><span className="fn-n num">{rows.length}</span><span className="fn-sub">社</span>
        </button>
        {STAGES.map(s => (
          <button type="button" key={s.id} className={'fn fn-' + s.id + (stage === s.id ? ' on' : '')} onClick={() => setStage(stage === s.id ? 'all' : s.id)}>
            <span className="fn-label">{s.label}</span><span className="fn-n num">{inStage(s.id).length}</span><span className="fn-sub">{subOf(s.id)}</span>
          </button>
        ))}
      </div>

      <div className="toolbar sales-tools">
        <label className="search"><Icon name="search" size={18} /><input type="search" placeholder="会社名・担当・エリアで検索" value={q} onChange={e => setQ(e.target.value)} aria-label="検索" /></label>
        <div className="row-gap">
          <select value={area} onChange={e => setArea(e.target.value)} aria-label="エリア"><option value="">全エリア</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select>
          <select value={sort} onChange={e => setSort(e.target.value)} aria-label="並び順">{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <div className="seg" role="group" aria-label="表示切替">
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>リスト</button>
            <button type="button" className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>ボード</button>
          </div>
        </div>
      </div>

      {!shown.length ? <Empty title="該当する代理店がありません">条件を変えるか、「代理店を追加」から登録してください。</Empty> : view === 'list' ? (
        <div className="tbl-wrap">
          <table className="tbl sales-tbl">
            <thead><tr><th>代理店</th><th>進捗</th><th>最終接触</th><th>次のアクション</th><th className="r">直近3か月の売上</th><th>最終注文</th></tr></thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.agent.id} className="clickrow" tabIndex={0} onClick={() => setSelId(r.agent.id)} onKeyDown={e => { if (e.key === 'Enter') setSelId(r.agent.id); }}>
                  <td className="lead">
                    <b>{r.agent.name}</b> <Rank rank={r.agent.rank} />
                    <span className="muted small block">{[r.agent.area, r.agent.contact && `${r.agent.contact}様`, r.agent.owner && `担当 ${r.agent.owner}`].filter(Boolean).join('・')}</span>
                  </td>
                  <td data-label="進捗"><span className="prog"><Progress stage={r.stage} /><Chip tone={STAGE_BY[r.stage].tone}>{STAGE_BY[r.stage].label}</Chip></span></td>
                  <td data-label="最終接触"><span className="cell-in">{agoLabel(r.daysSinceContact)}{r.acts[0] && <span className="muted small block">{ACT_LABEL[r.acts[0].type] || 'その他'}</span>}</span></td>
                  <td data-label="次のアクション" className="nx"><span className="nx-in">
                    {r.agent.nextAction || r.nextDate ? <><span>{r.agent.nextAction}</span> <NextChip r={r} /></> : r.noPlan ? <Chip tone="warn">未設定</Chip> : <span className="muted">—</span>}
                    {r.risk && <Chip tone="danger">{r.daysSinceOrder}日注文なし</Chip>}
                    {r.watch && <Chip tone="warn">{r.daysSinceOrder}日注文なし</Chip>}</span></td>
                  <td data-label="直近3か月の売上" className="r num"><span className="sales-cell">{r.sales3m ? yen(r.sales3m) : <span className="muted">—</span>}<Spark series={r.series} /></span></td>
                  <td data-label="最終注文">{fmtDate(r.lastOrder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="board">
          {STAGES.map(s => {
            const col = shown.filter(r => r.stage === s.id);
            return (
              <section className="bcol" key={s.id}>
                <header><Chip tone={s.tone}>{s.label}</Chip><span className="muted small">{col.length}社</span></header>
                {col.map(r => (
                  <article key={r.agent.id} className="bcard" onClick={() => setSelId(r.agent.id)}>
                    <div className="bcard-top"><b>{r.agent.name}</b><Rank rank={r.agent.rank} /></div>
                    <div className="muted small">{[r.agent.area, r.agent.owner && `担当 ${r.agent.owner}`].filter(Boolean).join('・')}</div>
                    {(r.agent.nextAction || r.nextDate) && <div className="bcard-next small">{r.agent.nextAction} <NextChip r={r} /></div>}
                    <div className="bcard-foot">
                      <span className="small num">{r.sales3m ? yen(r.sales3m) : agoLabel(r.daysSinceContact) + '接触'}</span>
                      <span className="bmove" onClick={e => e.stopPropagation()}>
                        <button type="button" disabled={s.id === STAGES[0].id} onClick={() => moveStage(r, -1)} aria-label="ひとつ前の段階へ">‹</button>
                        <button type="button" disabled={s.id === STAGES[STAGES.length - 1].id} onClick={() => moveStage(r, 1)} aria-label="ひとつ先の段階へ">›</button>
                      </span>
                    </div>
                  </article>
                ))}
                {!col.length && <p className="muted small bempty">なし</p>}
              </section>
            );
          })}
        </div>
      )}

      {selId && <Detail id={selId} onClose={() => setSelId(null)} onEdit={() => { const a = byId(data.agents, selId); setSelId(null); setEdit(a); }} />}
      {edit && <AgentForm init={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function Detail({ id, onClose, onEdit }) {
  const { data, commit, toast } = useStore();
  const today = todayStr();
  const agent = byId(data.agents, id);
  const s = useMemo(() => (agent ? agentStats(data, agent, today) : null), [data, agent, today]);
  const [na, setNa] = useState({ text: agent?.nextAction || '', date: agent?.nextDate || '' });
  const [act, setAct] = useState({ type: 'visit', date: today, memo: '' });
  if (!agent || !s) return null;

  const setStage = async st => { if (st !== s.stage && await commit([{ op: 'upsert', key: 'agents', item: { id, stage: st } }])) toast(`進捗を「${STAGE_BY[st].label}」にしました`); };
  const saveNext = async () => { if (await commit([{ op: 'upsert', key: 'agents', item: { id, nextAction: na.text.trim(), nextDate: na.date } }])) toast('次のアクションを保存しました'); };
  const addAct = async () => {
    if (!act.memo.trim()) { toast('内容を入力してください', 'danger'); return; }
    if (await commit([{ op: 'upsert', key: 'activities', item: { id: uid(), agentId: id, date: act.date || today, type: act.type, memo: act.memo.trim() } }])) { setAct(a => ({ ...a, memo: '' })); toast('活動を記録しました'); }
  };
  const delAct = async a => { if (window.confirm('この活動記録を削除しますか？')) await commit([{ op: 'remove', key: 'activities', id: a.id }]); };

  const tl = [
    ...s.acts.map(a => ({ k: 'act', id: a.id, a, date: a.date, label: ACT_LABEL[a.type] || 'その他', memo: a.memo })),
    ...s.orders.map(o => ({ k: 'order', id: o.id, date: o.date, label: '受注', memo: `${o.no}　${o.lines.map(l => `${l.name} ${l.cases}ケース`).join('、')}　${yen(totals(o.lines).subtotal)}（税抜）` })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  const maxS = Math.max(1, ...s.series.map(x => x.sales));

  return (
    <Modal title={agent.name} size="lg" onClose={onClose} footer={<><Btn kind="sub" onClick={onEdit}>基本情報を編集</Btn><Btn onClick={onClose}>閉じる</Btn></>}>
      <div className="sd-grid">
        <div className="sd-col">
          <section className="sd-sec">
            <h3>進捗 <Rank rank={agent.rank} /></h3>
            <div className="stage-pick" role="group" aria-label="進捗を変更">
              {STAGES.map(st => <button type="button" key={st.id} className={(s.stage === st.id ? 'on ' : '') + 'sp-' + st.id} onClick={() => setStage(st.id)}>{st.label}</button>)}
            </div>
            <Progress stage={s.stage} />
          </section>

          <section className="sd-sec">
            <h3>次のアクション</h3>
            <Field label="やること"><input type="text" value={na.text} placeholder="例：新商品の試飲サンプルを持って訪問" onChange={e => setNa(x => ({ ...x, text: e.target.value }))} /></Field>
            <div className="sd-inline">
              <Field label="期日"><input type="date" value={na.date} onChange={e => setNa(x => ({ ...x, date: e.target.value }))} /></Field>
              <Btn onClick={saveNext}>保存</Btn>
              <Btn kind="ghost" onClick={() => setNa({ text: '', date: '' })}>クリア</Btn>
            </div>
          </section>

          <section className="sd-sec">
            <h3>連絡先</h3>
            <dl className="kv">
              <dt>エリア</dt><dd>{agent.area || '—'}</dd>
              <dt>先方担当</dt><dd>{agent.contact ? `${agent.contact}様` : '—'}</dd>
              <dt>自社担当</dt><dd>{agent.owner || '—'}</dd>
              <dt>電話</dt><dd>{agent.tel ? <a href={'tel:' + agent.tel}>{agent.tel}</a> : '—'}</dd>
              <dt>メール</dt><dd>{agent.email ? <a href={'mailto:' + agent.email}>{agent.email}</a> : '—'}</dd>
              <dt>住所</dt><dd>{agent.address || '—'}</dd>
              {agent.note && <><dt>メモ</dt><dd>{agent.note}</dd></>}
            </dl>
          </section>

          <section className="sd-sec">
            <h3>売上</h3>
            {s.orderCount ? (
              <>
                <div className="sd-nums">
                  <div><span className="muted small">累計（税抜）</span><b className="num">{yen(s.salesTotal)}</b></div>
                  <div><span className="muted small">注文</span><b className="num">{s.orderCount}回 / {num(s.cases)}ケース</b></div>
                  <div><span className="muted small">最終注文</span><b>{fmtDate(s.lastOrder)}</b></div>
                </div>
                <div className="sd-bars" aria-label="直近6か月の売上">
                  {s.series.map(x => (
                    <div key={x.m} className="sd-bar"><i style={{ height: Math.max(3, Math.round((x.sales / maxS) * 56)) + 'px' }} className={x.sales ? 'on' : ''} /><span>{Number(x.m.slice(5))}月</span></div>
                  ))}
                </div>
                <ul className="sd-prods">
                  {s.products.slice(0, 4).map(p => { const pr = byId(data.products, p.productId); return <li key={p.productId}><ProductThumb product={pr} size={32} /><span>{pr ? pr.name : '商品'}</span><b className="num">{num(p.cases)}ケース</b></li>; })}
                </ul>
              </>
            ) : <p className="muted small">まだ注文はありません。注文が入ると、自動で「取引中」になります。</p>}
          </section>
        </div>

        <div className="sd-col">
          <section className="sd-sec">
            <h3>活動を記録</h3>
            <div className="sd-act-form">
              <select value={act.type} onChange={e => setAct(a => ({ ...a, type: e.target.value }))} aria-label="種類">{ACT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
              <input type="date" value={act.date} onChange={e => setAct(a => ({ ...a, date: e.target.value }))} aria-label="日付" />
              <textarea rows={2} placeholder="話した内容・反応・宿題など" value={act.memo} onChange={e => setAct(a => ({ ...a, memo: e.target.value }))} />
              <Btn icon="plus" onClick={addAct}>記録する</Btn>
            </div>
          </section>
          <section className="sd-sec">
            <h3>履歴 <span className="muted small">{tl.length}件</span></h3>
            {tl.length ? (
              <ol className="timeline">
                {tl.map(t => (
                  <li key={t.k + t.id} className={'tl-' + t.k}>
                    <span className="tl-date">{fmtDate(t.date)}</span>
                    <span className="tl-body"><Chip tone={t.k === 'order' ? 'ok' : 'blue'}>{t.label}</Chip> {t.memo}</span>
                    {t.k === 'act' && <button type="button" className="tl-del" onClick={() => delAct(t.a)} aria-label="削除">×</button>}
                  </li>
                ))}
              </ol>
            ) : <p className="muted small">まだ記録がありません。訪問や電話のあとに、ひとこと残しましょう。</p>}
          </section>
        </div>
      </div>
    </Modal>
  );
}

function AgentForm({ init, onClose }) {
  const { data, commit, toast } = useStore();
  const [f, setF] = useState({ ...init });
  const up = p => setF(x => ({ ...x, ...p }));
  const isNew = !init.id;
  const T = (k, label, wide, type = 'text', ph) => <Field label={label} wide={wide}><input type={type} value={f[k] ?? ''} placeholder={ph} onChange={e => up({ [k]: e.target.value })} /></Field>;

  const save = async () => {
    if (!(f.name || '').trim()) { toast('会社名を入れてください', 'danger'); return; }
    const item = { ...f, id: f.id || uid(), name: f.name.trim(), potentialMonthly: Number(f.potentialMonthly) || 0 };
    if (!item.code) item.code = 'K' + String(data.agents.length + 1).padStart(2, '0');
    if (await commit([{ op: 'upsert', key: 'agents', item }])) { toast('保存しました'); onClose(); }
  };
  const remove = async () => {
    if (data.salesOrders.some(o => o.agentId === f.id)) { toast('注文履歴があるため削除できません', 'danger'); return; }
    if (!window.confirm(`${f.name} を削除しますか？ 活動記録も消えます。`)) return;
    const acts = (data.activities || []).filter(a => a.agentId === f.id).map(a => ({ op: 'remove', key: 'activities', id: a.id }));
    await commit([...acts, { op: 'remove', key: 'agents', id: f.id }]); toast('削除しました'); onClose();
  };

  return (
    <Modal title={isNew ? '代理店を追加' : '代理店の基本情報'} onClose={onClose}
      footer={<>{!isNew && <Btn kind="ghost" onClick={remove}>削除</Btn>}<span className="grow" /><Btn kind="ghost" onClick={onClose}>キャンセル</Btn><Btn onClick={save}>保存</Btn></>}>
      <div className="grid2">
        {T('name', '会社名', true)}
        {T('code', '代理店コード', false, 'text', '空欄なら自動')}
        <Field label="エリア"><select value={f.area || ''} onChange={e => up({ area: e.target.value })}><option value="">未設定</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select></Field>
        <Field label="進捗"><select value={f.stage || 'lead'} onChange={e => up({ stage: e.target.value })}>{STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
        <Field label="ランク（重要度）"><select value={f.rank || ''} onChange={e => up({ rank: e.target.value })}><option value="">なし</option>{RANKS.map(r => <option key={r}>{r}</option>)}</select></Field>
        {T('contact', '先方の担当者')}
        {T('owner', '自社の担当')}
        {T('tel', '電話')}
        {T('email', 'メールアドレス（請求書の送り先）', false, 'email')}
        {T('potentialMonthly', '見込み月商（円・税抜）', false, 'number', '例：300000')}
        {T('address', '住所・標準の納品先', true)}
        <Field label="メモ" wide><textarea rows={3} value={f.note || ''} onChange={e => up({ note: e.target.value })} placeholder="取引条件、販売先のスーパー、好みなど" /></Field>
      </div>
    </Modal>
  );
}
