// デモ用の初期データ（実在しない架空の会社・商品です）
import { applyOps } from './ops';
import { uid, addDays, addMonths, ym, todayStr, nextNo, buildLots, createOrderOps, shipOps, byId } from './biz';

export const DEMO_IMAGES = {
  'p-shaoxing5': '/products/shaoxing5.jpg',
  'p-baijiu52': '/products/baijiu52.jpg',
  'p-guihua': '/products/guihua.jpg',
  'p-gaoliang': '/products/gaoliang.jpg',
  'p-lizhi': '/products/lizhi.jpg',
  'p-qingmei': '/products/qingmei.jpg',
};
export const DEMO_IMAGE_CREDITS = {
  'p-shaoxing5': "Bernt Rostad / CC BY 2.0 / Wikimedia Commons",
  'p-baijiu52': "Badagnani / CC BY 3.0 / Wikimedia Commons",
  'p-guihua': "Mx. Granger / CC0 / Wikimedia Commons",
  'p-gaoliang': "tomscoffin / CC BY 2.0 / Wikimedia Commons",
  'p-lizhi': "FotoosVanRobin / CC BY-SA 2.0 / Wikimedia Commons",
  'p-qingmei': "SKopp / CC BY 4.0 / Wikimedia Commons",
};

export function seedData() {
  const t = todayStr();
  const ago = n => addDays(t, -n);

  const settings = {
    company: {
      name: 'A&G企画株式会社',
      zip: '〒812-0011',
      address: '福岡県福岡市博多区博多駅前（デモ住所）',
      tel: '092-000-0000',
      email: 'info@ag-kikaku.example.jp',
      regNo: 'T0000000000000',
      person: '営業部',
      bank: '○○銀行 博多支店 普通 1234567 エーアンドジーキカク（カ）',
      invoiceNote: 'お振込手数料は貴社にてご負担をお願いいたします。',
    },
    cnyRate: 21.3,
    taxRate: 10,
    paymentTermsDays: 30,
    orderFormNote: 'ご注文は毎日17時締めです。翌営業日以降、倉庫から順次出荷します。',
  };

  const products = [
    { id: 'p-shaoxing5', code: 'SX-05', name: '紹興酒 花彫 5年', nameCn: '绍兴花雕酒 五年陈', perCase: 12, volumeMl: 600, abv: 14, salePrice: 14400, stdCostCny: 300, reorderPoint: 20, color: '#8A4B1F', note: '常温保管。中華料理店向けの定番。', active: true },
    { id: 'p-baijiu52', code: 'BJ-52', name: '清香型白酒 52度', nameCn: '清香型白酒 52度', perCase: 6, volumeMl: 500, abv: 52, salePrice: 18000, stdCostCny: 420, reorderPoint: 10, color: '#1B3F8B', note: '化粧箱入り。', active: true },
    { id: 'p-guihua', code: 'GH-15', name: '桂花陳酒', nameCn: '桂花陈酒', perCase: 12, volumeMl: 500, abv: 15, salePrice: 15600, stdCostCny: 330, reorderPoint: 15, color: '#C99A2E', note: '', active: true },
    { id: 'p-gaoliang', code: 'GL-38', name: '高粱酒 38度', nameCn: '高粱酒 38度', perCase: 12, volumeMl: 500, abv: 38, salePrice: 19200, stdCostCny: 480, reorderPoint: 15, color: '#5B6782', note: '', active: true },
    { id: 'p-lizhi', code: 'LZ-12', name: '茘枝酒', nameCn: '荔枝酒', perCase: 12, volumeMl: 500, abv: 12, salePrice: 13200, stdCostCny: 270, reorderPoint: 12, color: '#C2416B', note: 'スーパー向けに好評。', active: true },
    { id: 'p-qingmei', code: 'QM-12', name: '青梅酒', nameCn: '青梅酒', perCase: 6, volumeMl: 720, abv: 12, salePrice: 9000, stdCostCny: 180, reorderPoint: 10, color: '#3E8E5A', note: '', active: true },
  ];

  products.forEach(p => { p.image = DEMO_IMAGES[p.id]; });

  const suppliers = [
    { id: 's-yuezhou', name: '浙江越州酒業有限公司', contact: '王 明', email: 'sales@yuezhou-liquor.example.cn', tel: '+86-575-0000-0000', address: '中国浙江省紹興市（デモ）' },
    { id: 's-qingyuan', name: '山西清源醸造有限公司', contact: '李 華', email: 'order@qingyuan-brew.example.cn', tel: '+86-358-0000-0000', address: '中国山西省（デモ）' },
  ];

  const warehouses = [
    { id: 'w-hakata', name: '博多港倉庫', address: '福岡県福岡市東区箱崎ふ頭（デモ）', tel: '092-000-1111', contact: '倉庫担当' },
    { id: 'w-osaka', name: '大阪南港倉庫', address: '大阪府大阪市住之江区南港（デモ）', tel: '06-0000-2222', contact: '倉庫担当' },
  ];

  const agents = [
    { id: 'a-kyushu', code: 'K01', name: '九州酒販株式会社', contact: '田中', email: 'order@kyushu-shuhan.example.jp', tel: '092-111-0000', address: '福岡県福岡市中央区（デモ）' },
    { id: 'a-kansai', code: 'K02', name: '関西リカー流通株式会社', contact: '山本', email: 'buy@kansai-liquor.example.jp', tel: '06-111-0000', address: '大阪府大阪市北区（デモ）' },
    { id: 'a-higashi', code: 'K03', name: '東日本酒類卸株式会社', contact: '佐藤', email: 'shiire@higashi-shurui.example.jp', tel: '03-111-0000', address: '東京都中央区（デモ）' },
  ];

  let data = { settings, products, suppliers, warehouses, agents, purchaseOrders: [], lots: [], salesOrders: [], invoices: [], expenses: [], adjustments: [], activities: [] };

  const addPO = (date, supplierId, warehouseId, lines, status, recv) => {
    const po = {
      id: 'po-' + date + '-' + supplierId.slice(2, 6), no: nextNo('PO', data.purchaseOrders, date), date,
      supplierId, warehouseId, deliveryDate: addDays(date, 28),
      lines: lines.map(([productId, cases, unitCny]) => ({ productId, cases, unitCny })),
      note: '', status, sentAt: status !== 'draft' ? date : null, receivedAt: recv ? recv.date : null,
    };
    if (recv) { po.receiveRate = recv.rate; po.receiveExtra = recv.extraTotal; }
    data.purchaseOrders.push(po);
    if (recv) data.lots.push(...buildLots(po, { ...recv, lines: po.lines, warehouseId }));
  };

  // 仕入（紹興酒は2回目で単価が上がっている＝ロットで原価が分かれる例）
  addPO(ago(140), 's-yuezhou', 'w-hakata', [['p-shaoxing5', 70, 300], ['p-guihua', 40, 330]], 'received', { date: ago(130), rate: 20.5, extraTotal: 46000 });
  addPO(ago(62), 's-yuezhou', 'w-hakata', [['p-shaoxing5', 100, 300], ['p-guihua', 60, 330], ['p-lizhi', 50, 270]], 'received', { date: ago(55), rate: 20.8, extraTotal: 79800 });
  addPO(ago(42), 's-qingyuan', 'w-osaka', [['p-baijiu52', 40, 420], ['p-gaoliang', 50, 480]], 'received', { date: ago(35), rate: 21.0, extraTotal: 46800 });
  addPO(ago(16), 's-yuezhou', 'w-hakata', [['p-shaoxing5', 80, 315], ['p-qingmei', 60, 180]], 'received', { date: ago(7), rate: 21.4, extraTotal: 56000 });
  addPO(ago(5), 's-qingyuan', 'w-osaka', [['p-baijiu52', 30, 430]], 'sent');
  addPO(t, 's-yuezhou', 'w-hakata', [['p-lizhi', 40, 270], ['p-guihua', 30, 330]], 'draft');

  const addSO = (date, agentId, lines, source, shipDate, paid) => {
    const ag = byId(agents, agentId);
    const { order, inv, ops } = createOrderOps(data, {
      agentId, date, source, deliveryTo: ag.address, desiredDate: addDays(date, 4), note: '',
      lines: lines.map(([pid, cases]) => ({ productId: pid, cases, unitPrice: byId(products, pid).salePrice })),
    });
    data = applyOps(data, ops);
    if (shipDate) {
      const r = shipOps(data, order, '', shipDate);
      data = applyOps(data, r.ops);
    }
    if (paid) {
      data = applyOps(data, [
        { op: 'upsert', key: 'salesOrders', item: { id: order.id, status: 'paid', paidAt: addDays(shipDate, 20) } },
        { op: 'upsert', key: 'invoices', item: { id: inv.id, status: 'paid', paidAt: addDays(shipDate, 20) } },
      ]);
    }
  };

  addSO(ago(115), 'a-kyushu', [['p-shaoxing5', 25], ['p-guihua', 10]], 'form', ago(113), true);
  addSO(ago(88), 'a-kansai', [['p-shaoxing5', 30], ['p-guihua', 15]], 'manual', ago(86), true);
  addSO(ago(70), 'a-higashi', [['p-shaoxing5', 12], ['p-guihua', 10]], 'form', ago(68), true);
  addSO(ago(50), 'a-kyushu', [['p-shaoxing5', 20], ['p-guihua', 20]], 'form', ago(48), true);
  addSO(ago(40), 'a-kansai', [['p-shaoxing5', 30], ['p-lizhi', 15]], 'manual', ago(38), true);
  addSO(ago(20), 'a-higashi', [['p-baijiu52', 15], ['p-gaoliang', 20]], 'form', ago(18), false);
  addSO(ago(10), 'a-kyushu', [['p-shaoxing5', 15], ['p-lizhi', 10]], 'form', ago(9), false);
  addSO(ago(3), 'a-kansai', [['p-shaoxing5', 20], ['p-qingmei', 12]], 'form', t, false);
  addSO(ago(1), 'a-kyushu', [['p-qingmei', 10], ['p-guihua', 10]], 'form', null, false);
  addSO(t, 'a-higashi', [['p-baijiu52', 10], ['p-lizhi', 8]], 'manual', null, false);

  const ex = (d0, category, amount, vendor, method, note = '') => { const d = d0 > t ? t : d0; data.expenses.push({ id: 'e-' + d + '-' + data.expenses.length, date: d, category, amount, vendor, method, note }); };
  const m0 = t.slice(0, 8), m1 = addDays(t.slice(0, 8) + '01', -1).slice(0, 8), m2 = addDays(addDays(t.slice(0, 8) + '01', -1).slice(0, 8) + '01', -1).slice(0, 8);
  for (const m of [4, 3, 2, 1].map(i => addMonths(ym(t), -i) + '-')) {
    ex(m + '05', '倉庫保管料', 88000, '博多港倉庫', '振込');
    ex(m + '05', '倉庫保管料', 64000, '大阪南港倉庫', '振込');
    ex(m + '10', '地代家賃', 120000, '事務所家賃', '口座振替');
    ex(m + '18', '運送費', 46200, '国内配送（路線便）', '振込');
    ex(m + '25', '通信費', 8800, '電話・ネット', 'カード');
  }
  ex(m2 + '12', '旅費交通費', 186000, '中国出張（紹興）', 'カード', '仕入先訪問・試飲');
  ex(m1 + '14', '広告宣伝費', 33000, '試飲会ブース', '振込');
  ex(m1 + '20', '交際費', 24800, '代理店との会食', 'カード');
  ex(m0 + '01', '地代家賃', 120000, '事務所家賃', '口座振替');
  ex(m0 + '02', '支払手数料', 1650, '海外送金手数料', '振込');

  data = applyOps(data, salesDemoOps(data));

  return data;
}

// 営業支援のサンプル（代理店14社・進捗・活動履歴）。既に営業データがある場合は何もしません。
export function salesDemoOps(data) {
  if ((data.agents || []).some(a => a.stage) || (data.activities || []).length) return [];
  const t = todayStr();
  const ago = n => addDays(t, -n);
  const fwd = n => addDays(t, n);
  let d = data;
  const ops = [];
  const push = o => { d = applyOps(d, o); ops.push(...o); };
  const has = id => !!byId(d.agents, id);

  // 既存3社に営業情報を付ける
  const patch = {
    'a-kyushu': { area: '九州・沖縄', owner: '村上', rank: 'A', stage: 'active', potentialMonthly: 500000, nextAction: '年末商戦の提案（紹興酒の増量）', nextDate: fwd(3), note: '福岡の中華料理店・スーパーに強い。月2回ペースで発注。' },
    'a-kansai': { area: '関西', owner: '青木', rank: 'A', stage: 'active', potentialMonthly: 450000, nextAction: '桂花陳酒の取扱いを打診', nextDate: fwd(6), note: '量販店向けが中心。価格にシビア。' },
    'a-higashi': { area: '関東', owner: '村上', rank: 'B', stage: 'active', potentialMonthly: 350000, nextAction: '入金確認の連絡', nextDate: ago(2), note: '白酒・高粱酒がよく出る。入金がやや遅め。' },
  };
  for (const [id, p] of Object.entries(patch)) if (has(id)) push([{ op: 'upsert', key: 'agents', item: { id, ...p } }]);

  const A = (id, code, name, area, owner, contact, tel, stage, rank, potentialMonthly, nextAction, nextDate, address, note = '') => ({
    id, code, name, area, owner, contact, tel, email: `info@${id.slice(2)}.example.jp`, address: address + '（デモ）', stage, rank, potentialMonthly, nextAction, nextDate, note,
  });
  const extra = [
    A('a-chubu', 'K04', '中部酒類販売株式会社', '中部', '青木', '鈴木', '052-111-0000', 'active', 'B', 250000, '次回の発注量を確認', fwd(8), '愛知県名古屋市中区'),
    A('a-chugoku', 'K05', '瀬戸内ドリンクサービス株式会社', '中国・四国', '村上', '高橋', '082-111-0000', 'active', 'B', 200000, '注文が止まっている理由を伺う', ago(1), '広島県広島市中区', '最近注文が減っている。競合の動きに注意。'),
    A('a-hokkaido', 'K06', '北洋酒販株式会社', '北海道', '青木', '', '011-111-0000', 'lead', 'C', 150000, '初回アポの電話', fwd(2), '北海道札幌市中央区'),
    A('a-tohoku', 'K07', 'みちのく酒類株式会社', '東北', '村上', '佐々木', '022-111-0000', 'talk', 'B', 250000, '試飲サンプルを発送', t, '宮城県仙台市青葉区'),
    A('a-kantomart', 'K08', '首都圏フーズ卸株式会社', '関東', '青木', '伊藤', '03-222-0000', 'proposal', 'A', 600000, '見積の回答を確認', fwd(1), '東京都江東区', '年末ギフト企画での採用を狙う。決まれば大口。'),
    A('a-nagoya', 'K09', '東海マルシェ流通株式会社', '中部', '村上', '山口', '052-222-0000', 'talk', 'A', 400000, '工場見学の日程調整', fwd(9), '愛知県名古屋市中村区'),
    A('a-kobe', 'K10', '神戸ワインセラー商会', '関西', '青木', '松本', '078-111-0000', 'lead', 'B', 200000, '', '', '兵庫県神戸市中央区', '紹介者経由。まだ次の一手が決まっていない。'),
    A('a-okinawa', 'K11', '南国ビバレッジ株式会社', '九州・沖縄', '村上', '比嘉', '098-111-0000', 'proposal', 'B', 300000, '価格表を再送', fwd(4), '沖縄県那覇市'),
    A('a-hiroshima', 'K12', '広島食品卸センター', '中国・四国', '青木', '', '082-222-0000', 'dormant', 'C', 0, '近況伺いの電話', fwd(14), '広島県広島市南区', '以前取引あり。担当者交代で連絡が途絶えた。'),
    A('a-sendai', 'K13', '杜の都リカー株式会社', '東北', '村上', '', '022-222-0000', 'lead', 'C', 100000, 'DMを送付', fwd(5), '宮城県仙台市宮城野区'),
    A('a-kitakanto', 'K14', '北関東酒販株式会社', '関東', '青木', '渡辺', '027-111-0000', 'talk', 'C', 180000, '価格表への返事を待つ', fwd(7), '群馬県高崎市'),
  ];
  for (const a of extra) if (!has(a.id)) push([{ op: 'upsert', key: 'agents', item: a }]);

  // 取引中の2社には過去の注文を入れる
  const addSO = (agentId, date, lines, shipDate, paid) => {
    const ag = byId(d.agents, agentId);
    if (!ag) return;
    const { order, inv, ops: o1 } = createOrderOps(d, {
      agentId, date, source: 'manual', deliveryTo: ag.address, desiredDate: addDays(date, 4), note: '',
      lines: lines.map(([pid, cases]) => ({ productId: pid, cases, unitPrice: byId(d.products, pid).salePrice })),
    });
    push(o1);
    if (!shipDate) return;
    const r = shipOps(d, order, '', shipDate);
    if (r.error) return;
    push(r.ops);
    if (paid) {
      push([
        { op: 'upsert', key: 'salesOrders', item: { id: order.id, status: 'paid', paidAt: addDays(shipDate, 20) } },
        { op: 'upsert', key: 'invoices', item: { id: inv.id, status: 'paid', paidAt: addDays(shipDate, 20) } },
      ]);
    }
  };
  addSO('a-chubu', ago(34), [['p-guihua', 6], ['p-lizhi', 5]], ago(32), true);
  addSO('a-chubu', ago(12), [['p-guihua', 5]], ago(10), false);
  addSO('a-chugoku', ago(75), [['p-lizhi', 6], ['p-qingmei', 4]], ago(73), true);
  addSO('a-chugoku', ago(52), [['p-lizhi', 5]], ago(50), true);

  // 活動履歴
  const acts = [
    ['a-kyushu', 3, 'visit', '年末の紹興酒需要について打合せ。前年比120%の発注を検討との回答'],
    ['a-kyushu', 14, 'tasting', '福岡の中華料理店向け試飲会に同行。花彫5年が好評'],
    ['a-kyushu', 28, 'call', '納期の確認。博多倉庫から翌営業日出荷でOKと案内'],
    ['a-kyushu', 45, 'mail', '仕入価格の改定について説明。販売価格は据え置きで了承'],
    ['a-kansai', 5, 'call', '桂花陳酒の取扱いを打診。サンプル希望あり'],
    ['a-kansai', 19, 'visit', '本社訪問。仕入担当と四半期の計画を共有'],
    ['a-kansai', 41, 'quote', '荔枝酒・青梅酒の見積を提出（スーパー向け）'],
    ['a-higashi', 2, 'mail', '請求書を送付済み。入金予定日の確認を依頼'],
    ['a-higashi', 16, 'call', '白酒52度の追加発注を相談。来月検討とのこと'],
    ['a-higashi', 33, 'visit', '卸売市場を訪問。ギフト需要の話を聞く'],
    ['a-chubu', 9, 'call', '桂花陳酒が好調。次回は10ケース希望'],
    ['a-chubu', 30, 'visit', '初回納品後のフォロー訪問'],
    ['a-chugoku', 40, 'call', '動きが鈍いため状況伺い。年末まで様子見とのこと'],
    ['a-chugoku', 68, 'visit', '店頭の陳列を確認。荔枝酒の棚が広がっていた'],
    ['a-hokkaido', 6, 'mail', '会社紹介と商品カタログを送付'],
    ['a-tohoku', 4, 'call', '青梅酒・荔枝酒に関心あり。サンプル送付を約束'],
    ['a-tohoku', 11, 'mail', '問い合わせフォームから連絡あり。初回ヒアリング'],
    ['a-kantomart', 1, 'quote', '見積を提出（紹興酒30ケース／桂花陳酒20ケース）'],
    ['a-kantomart', 8, 'visit', 'バイヤーと商談。年末のギフト企画に採用したい意向'],
    ['a-kantomart', 20, 'tasting', '展示会で名刺交換。試飲していただく'],
    ['a-nagoya', 7, 'call', '工場見学を希望。日程を調整中'],
    ['a-nagoya', 18, 'visit', '名古屋で初回商談。高粱酒に強い関心'],
    ['a-kobe', 22, 'mail', '紹介者経由でメールをいただき、カタログを送付'],
    ['a-okinawa', 10, 'call', '泡盛と並べて売る提案を相談された'],
    ['a-okinawa', 24, 'quote', '見積を提出（青梅酒が中心）'],
    ['a-hiroshima', 60, 'call', '担当者が交代して連絡が取れず。要再アプローチ'],
    ['a-sendai', 13, 'mail', '展示会での名刺交換のお礼メールを送付'],
    ['a-kitakanto', 15, 'call', '資料請求あり。価格表を送付'],
  ];
  const items = acts.filter(([id]) => has(id)).map(([agentId, n, type, memo]) => ({ op: 'upsert', key: 'activities', item: { id: uid(), agentId, date: ago(n), type, memo } }));
  push(items);
  return ops;
}
