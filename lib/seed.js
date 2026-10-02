// デモ用の初期データ（実在しない架空の会社・商品です）
import { applyOps } from './ops';
import { addDays, addMonths, ym, todayStr, nextNo, buildLots, createOrderOps, shipOps, byId } from './biz';

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

  let data = { settings, products, suppliers, warehouses, agents, purchaseOrders: [], lots: [], salesOrders: [], invoices: [], expenses: [], adjustments: [] };

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

  return data;
}
