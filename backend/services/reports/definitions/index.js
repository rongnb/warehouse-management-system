/**
 * 报表定义注册表。
 * 每个报表定义包含：
 *   - id: 报表标识（URL path 用）
 *   - name: 中文报表名（写入 Excel sheet name 与导出文件名）
 *   - columns: 列定义数组 [{ key, header, width? }]
 *   - buildCursor(filters): 返回一个 mongoose Query/Aggregate 的 cursor，
 *       cursor 必须实现 async-iterable 协议（mongoose cursor() 默认支持 .on('data')，
 *       这里要求使用 .cursor() 然后 await 迭代，或返回一个 async iterator）。
 *   - mapRow(doc): 将一行数据转成与 columns 对齐的扁平对象。
 *
 * 流式导出关键点：
 *   - buildCursor 必须返回 cursor 而不是 .find().lean() 数组，否则大数据量会内存爆。
 *   - mapRow 必须是纯同步函数，不能在里面再发数据库查询；如需 join 信息，
 *     在 buildCursor 里用 .populate() 或 aggregate $lookup。
 */
const Inventory = require('../../../models/Inventory');
const Transaction = require('../../../models/Transaction');
const Stocktake = require('../../../models/Stocktake');
const Product = require('../../../models/Product');
const SystemConfig = require('../../../models/SystemConfig');
const { buildDateRange } = require('../filters');

const formatDate = (d) => {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const safe = (v, fallback = '') => (v === undefined || v === null ? fallback : v);

// ===================== 1. 库存报表 =====================
const inventoryReport = {
  id: 'inventory',
  name: '库存报表',
  columns: [
    { key: 'sku', header: '商品编码', width: 18 },
    { key: 'productName', header: '商品名称', width: 28 },
    { key: 'spec', header: '规格', width: 16 },
    { key: 'unit', header: '单位', width: 8 },
    { key: 'warehouseName', header: '仓库', width: 16 },
    { key: 'quantity', header: '库存数量', width: 12 },
    { key: 'location', header: '货位', width: 14 },
    { key: 'batchNumber', header: '批次号', width: 16 },
    { key: 'lastUpdated', header: '最后更新', width: 20 },
  ],
  buildCursor(filters) {
    const q = {};
    if (filters.warehouse) q.warehouse = filters.warehouse;
    return Inventory.find(q)
      .populate({ path: 'product', select: 'name sku specification unit category', populate: { path: 'category', select: '_id' } })
      .populate({ path: 'warehouse', select: 'name' })
      .lean()
      .cursor();
  },
  rowFilter(doc, filters) {
    // 在游标内做二次过滤（按 category），避免对 Inventory 加额外索引。
    if (filters.category) {
      const cat = doc.product && doc.product.category;
      const catId = cat && (cat._id || cat);
      if (!catId || String(catId) !== String(filters.category)) return false;
    }
    return true;
  },
  mapRow(doc) {
    return {
      sku: safe(doc.product && doc.product.sku),
      productName: safe(doc.product && doc.product.name),
      spec: safe(doc.product && doc.product.specification),
      unit: safe(doc.product && doc.product.unit),
      warehouseName: safe(doc.warehouse && doc.warehouse.name),
      quantity: safe(doc.quantity, 0),
      location: safe(doc.location),
      batchNumber: safe(doc.batchNumber),
      lastUpdated: formatDate(doc.lastUpdated || doc.updatedAt),
    };
  },
};

// ===================== 2. 出入库流水 =====================
const transactionsReport = {
  id: 'transactions',
  name: '出入库流水',
  columns: [
    { key: 'transactionNo', header: '单号', width: 22 },
    { key: 'type', header: '类型', width: 10 },
    { key: 'sku', header: '商品编码', width: 18 },
    { key: 'productName', header: '商品名称', width: 28 },
    { key: 'warehouseName', header: '仓库', width: 16 },
    { key: 'quantity', header: '数量', width: 10 },
    { key: 'price', header: '单价', width: 12 },
    { key: 'totalAmount', header: '金额', width: 14 },
    { key: 'supplierName', header: '供应商', width: 20 },
    { key: 'customer', header: '客户', width: 20 },
    { key: 'operatorName', header: '操作人', width: 14 },
    { key: 'createdAt', header: '时间', width: 20 },
    { key: 'remark', header: '备注', width: 24 },
  ],
  buildCursor(filters) {
    const q = { ...buildDateRange('createdAt', filters) };
    if (filters.warehouse) q.warehouse = filters.warehouse;
    if (filters.supplier) q.supplier = filters.supplier;
    return Transaction.find(q)
      .populate({ path: 'product', select: 'name sku category' })
      .populate({ path: 'warehouse', select: 'name' })
      .populate({ path: 'supplier', select: 'name' })
      .populate({ path: 'operator', select: 'realName username' })
      .sort({ createdAt: -1 })
      .lean()
      .cursor();
  },
  rowFilter(doc, filters) {
    if (filters.category) {
      const cat = doc.product && doc.product.category;
      if (!cat || String(cat) !== String(filters.category)) return false;
    }
    return true;
  },
  mapRow(doc) {
    const typeMap = { in: '入库', out: '出库', stocktake_profit: '盘盈', stocktake_loss: '盘亏' };
    return {
      transactionNo: safe(doc.transactionNo),
      type: typeMap[doc.type] || doc.type || '',
      sku: safe(doc.product && doc.product.sku),
      productName: safe(doc.product && doc.product.name),
      warehouseName: safe(doc.warehouse && doc.warehouse.name),
      quantity: safe(doc.quantity, 0),
      price: safe(doc.price || doc.unitPrice, 0),
      totalAmount: safe(doc.totalAmount, 0),
      supplierName: safe(doc.supplier && doc.supplier.name),
      customer: safe(doc.customer),
      operatorName: safe(doc.operator && (doc.operator.realName || doc.operator.username)),
      createdAt: formatDate(doc.createdAt),
      remark: safe(doc.remark),
    };
  },
};

// ===================== 3. 盘点报表 =====================
const stocktakeReport = {
  id: 'stocktake',
  name: '盘点报表',
  columns: [
    { key: 'stocktakeNo', header: '盘点单号', width: 22 },
    { key: 'title', header: '标题', width: 24 },
    { key: 'warehouseName', header: '仓库', width: 16 },
    { key: 'sku', header: '商品编码', width: 18 },
    { key: 'productName', header: '商品名称', width: 24 },
    { key: 'systemQuantity', header: '账面数', width: 10 },
    { key: 'actualQuantity', header: '实盘数', width: 10 },
    { key: 'difference', header: '差异', width: 10 },
    { key: 'differenceType', header: '差异类型', width: 12 },
    { key: 'totalAmount', header: '差异金额', width: 14 },
    { key: 'status', header: '状态', width: 10 },
    { key: 'startTime', header: '开始时间', width: 20 },
    { key: 'endTime', header: '结束时间', width: 20 },
  ],
  buildCursor(filters) {
    const q = { ...buildDateRange('createdAt', filters) };
    if (filters.warehouse) q.warehouse = filters.warehouse;
    return Stocktake.find(q).sort({ createdAt: -1 }).lean().cursor();
  },
  // 一个 stocktake 文档展开成多行（一行一个 item）
  expand(doc) {
    const diffMap = { profit: '盘盈', loss: '盘亏', none: '无差异' };
    const statusMap = { draft: '草稿', confirming: '确认中', completed: '已完成', cancelled: '已取消' };
    const items = Array.isArray(doc.items) && doc.items.length ? doc.items : [{}];
    return items.map((item) => ({
      stocktakeNo: safe(doc.stocktakeNo),
      title: safe(doc.title),
      warehouseName: safe(doc.warehouseName),
      sku: safe(item.sku),
      productName: safe(item.productName),
      systemQuantity: safe(item.systemQuantity, 0),
      actualQuantity: safe(item.actualQuantity, 0),
      difference: safe(item.difference, 0),
      differenceType: diffMap[item.differenceType] || '',
      totalAmount: safe(item.totalAmount, 0),
      status: statusMap[doc.status] || doc.status || '',
      startTime: formatDate(doc.startTime),
      endTime: formatDate(doc.endTime),
    }));
  },
};

// ===================== 4. 供应商供货统计 =====================
const supplierReport = {
  id: 'supplier',
  name: '供应商供货统计',
  columns: [
    { key: 'supplierName', header: '供应商', width: 22 },
    { key: 'transactionCount', header: '入库次数', width: 12 },
    { key: 'totalQuantity', header: '总入库数量', width: 14 },
    { key: 'totalAmount', header: '总入库金额', width: 16 },
    { key: 'firstDate', header: '首次入库时间', width: 20 },
    { key: 'lastDate', header: '最近入库时间', width: 20 },
  ],
  // 该报表用聚合，结果集相对小，可一次查出。
  // 仍走 cursor() 接口以便保持调用一致。
  buildCursor(filters) {
    const match = { type: 'in', supplier: { $ne: null }, ...buildDateRange('createdAt', filters) };
    if (filters.supplier) match.supplier = filters.supplier;
    if (filters.warehouse) match.warehouse = filters.warehouse;

    return Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$supplier',
          transactionCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalAmount: { $sum: '$totalAmount' },
          firstDate: { $min: '$createdAt' },
          lastDate: { $max: '$createdAt' },
        },
      },
      { $lookup: { from: 'suppliers', localField: '_id', foreignField: '_id', as: 'supplier' } },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      { $sort: { totalAmount: -1 } },
    ]).cursor();
  },
  mapRow(doc) {
    return {
      supplierName: safe(doc.supplier && doc.supplier.name, '(未关联供应商)'),
      transactionCount: safe(doc.transactionCount, 0),
      totalQuantity: safe(doc.totalQuantity, 0),
      totalAmount: safe(doc.totalAmount, 0),
      firstDate: formatDate(doc.firstDate),
      lastDate: formatDate(doc.lastDate),
    };
  },
};

// ===================== 5. 库存预警报表 =====================
const lowStockReport = {
  id: 'low-stock',
  name: '库存预警报表',
  columns: [
    { key: 'sku', header: '商品编码', width: 18 },
    { key: 'productName', header: '商品名称', width: 28 },
    { key: 'unit', header: '单位', width: 8 },
    { key: 'warehouseName', header: '仓库', width: 16 },
    { key: 'quantity', header: '当前库存', width: 12 },
    { key: 'minStock', header: '最低库存', width: 12 },
    { key: 'shortage', header: '差额', width: 10 },
  ],
  buildCursor(filters) {
    const q = {};
    if (filters.warehouse) q.warehouse = filters.warehouse;
    return Inventory.find(q)
      .populate({ path: 'product', select: 'name sku unit category minStock' })
      .populate({ path: 'warehouse', select: 'name' })
      .lean()
      .cursor();
  },
  rowFilter(doc, filters) {
    if (!doc.product) return false;
    const minStock = Number(doc.product.minStock || 0);
    if (minStock <= 0) return false; // 没设阈值的不进预警
    if (Number(doc.quantity || 0) > minStock) return false;
    if (filters.category) {
      const cat = doc.product.category;
      if (!cat || String(cat) !== String(filters.category)) return false;
    }
    return true;
  },
  mapRow(doc) {
    const min = Number(doc.product.minStock || 0);
    const qty = Number(doc.quantity || 0);
    return {
      sku: safe(doc.product.sku),
      productName: safe(doc.product.name),
      unit: safe(doc.product.unit),
      warehouseName: safe(doc.warehouse && doc.warehouse.name),
      quantity: qty,
      minStock: min,
      shortage: Math.max(min - qty, 0),
    };
  },
};

// ===================== 6. 操作日志报表 =====================
// 操作日志当前以 SystemConfig 集合的 type=operation_log 存储（兼容现有 routes/logs.js）。
// 若未来抽出独立模型，只需改这里的 buildCursor。
const operationLogReport = {
  id: 'operation-log',
  name: '操作日志报表',
  columns: [
    { key: 'timestamp', header: '时间', width: 20 },
    { key: 'username', header: '用户名', width: 14 },
    { key: 'action', header: '操作', width: 14 },
    { key: 'module', header: '模块', width: 14 },
    { key: 'target', header: '对象', width: 24 },
    { key: 'ip', header: 'IP', width: 18 },
    { key: 'detail', header: '详情', width: 40 },
  ],
  buildCursor(filters) {
    const q = { type: 'operation_log', ...buildDateRange('createdAt', filters) };
    return SystemConfig.find(q).sort({ createdAt: -1 }).lean().cursor();
  },
  mapRow(doc) {
    const v = doc.value || {};
    return {
      timestamp: formatDate(doc.createdAt),
      username: safe(v.username),
      action: safe(v.action),
      module: safe(v.module),
      target: safe(v.target),
      ip: safe(v.ip),
      detail: typeof v.detail === 'object' ? JSON.stringify(v.detail) : safe(v.detail),
    };
  },
};

const ALL = [
  inventoryReport,
  transactionsReport,
  stocktakeReport,
  supplierReport,
  lowStockReport,
  operationLogReport,
];

const BY_ID = ALL.reduce((m, r) => Object.assign(m, { [r.id]: r }), {});

module.exports = {
  ALL,
  BY_ID,
  // 仅供测试导出
  _internal: { formatDate, safe },
};
// 兼容直接 require Product 的早期实现（避免摇树）
void Product;
