const {
  Inventory,
  Transaction,
  Stocktake,
  StocktakeItem,
  Product,
  Warehouse,
  Supplier,
  User,
  SystemConfig,
  Sequelize,
} = require('../../../models');
const { buildDateRange } = require('../filters');

const { Op, fn, col, literal } = Sequelize;

function formatDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const sec = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

function safe(v, fallback = '') {
  return (v === null || v === undefined) ? fallback : v;
}

const inventoryReport = {
  id: 'inventory',
  name: '库存报表',
  columns: [
    { key: 'sku', header: 'SKU', width: 15 },
    { key: 'productName', header: '产品名称', width: 25 },
    { key: 'spec', header: '规格', width: 20 },
    { key: 'unit', header: '单位', width: 10 },
    { key: 'warehouseName', header: '仓库名称', width: 20 },
    { key: 'quantity', header: '数量', width: 10 },
    { key: 'location', header: '位置', width: 15 },
    { key: 'batchNumber', header: '批次号', width: 15 },
    { key: 'lastUpdated', header: '最后更新', width: 20 },
  ],
  fetchRows: async function* (filters) {
    const PAGE_SIZE = 500;
    let offset = 0;
    let hasMore = true;

    const where = {};
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;

    const productInclude = {
      model: Product,
      as: 'product',
      required: false,
    };

    if (filters.categoryId) {
      productInclude.where = { categoryId: filters.categoryId };
      productInclude.required = true;
    }

    while (hasMore) {
      const rows = await Inventory.findAll({
        where,
        include: [
          productInclude,
          { model: Warehouse, as: 'warehouse', required: false },
        ],
        limit: PAGE_SIZE,
        offset,
        raw: false,
      });

      if (rows.length === 0) {
        hasMore = false;
      } else {
        for (const row of rows) {
          yield row;
        }
        offset += PAGE_SIZE;
      }
    }
  },
  mapRow(row) {
    const rowObj = row.toJSON ? row.toJSON() : row;
    return {
      sku: safe(rowObj.product?.sku),
      productName: safe(rowObj.product?.name),
      spec: safe(rowObj.product?.specification),
      unit: safe(rowObj.product?.unit),
      warehouseName: safe(rowObj.warehouse?.name),
      quantity: safe(rowObj.quantity, 0),
      location: safe(rowObj.location),
      batchNumber: safe(rowObj.batchNumber),
      lastUpdated: formatDate(rowObj.lastUpdated),
    };
  },
};

const transactionsReport = {
  id: 'transactions',
  name: '出入库流水',
  columns: [
    { key: 'transactionNo', header: '单据号', width: 20 },
    { key: 'type', header: '类型', width: 12 },
    { key: 'sku', header: 'SKU', width: 15 },
    { key: 'productName', header: '产品名称', width: 25 },
    { key: 'warehouseName', header: '仓库名称', width: 20 },
    { key: 'quantity', header: '数量', width: 10 },
    { key: 'price', header: '单价', width: 12 },
    { key: 'totalAmount', header: '金额', width: 12 },
    { key: 'supplierName', header: '供应商', width: 20 },
    { key: 'customer', header: '客户', width: 20 },
    { key: 'operatorName', header: '操作人', width: 15 },
    { key: 'createdAt', header: '创建时间', width: 20 },
    { key: 'remark', header: '备注', width: 30 },
  ],
  fetchRows: async function* (filters) {
    const PAGE_SIZE = 500;
    let offset = 0;
    let hasMore = true;

    const where = { ...buildDateRange('createdAt', filters) };
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.supplierId) where.supplierId = filters.supplierId;

    const productInclude = {
      model: Product,
      as: 'product',
      required: false,
    };

    if (filters.categoryId) {
      productInclude.where = { categoryId: filters.categoryId };
      productInclude.required = true;
    }

    while (hasMore) {
      const rows = await Transaction.findAll({
        where,
        include: [
          productInclude,
          { model: Warehouse, as: 'warehouse', required: false },
          { model: Supplier, as: 'supplier', required: false },
          { model: User, as: 'operatorUser', required: false },
        ],
        order: [['createdAt', 'DESC']],
        limit: PAGE_SIZE,
        offset,
        raw: false,
      });

      if (rows.length === 0) {
        hasMore = false;
      } else {
        for (const row of rows) {
          yield row;
        }
        offset += PAGE_SIZE;
      }
    }
  },
  mapRow(row) {
    const rowObj = row.toJSON ? row.toJSON() : row;
    const typeMap = {
      in: '入库',
      out: '出库',
      stocktake_profit: '盘盈',
      stocktake_loss: '盘亏',
    };
    return {
      transactionNo: safe(rowObj.transactionNo),
      type: typeMap[rowObj.type] || safe(rowObj.type),
      sku: safe(rowObj.product?.sku),
      productName: safe(rowObj.product?.name),
      warehouseName: safe(rowObj.warehouse?.name),
      quantity: safe(rowObj.quantity, 0),
      price: safe(rowObj.price, 0),
      totalAmount: (rowObj.price || 0) * (rowObj.quantity || 0),
      supplierName: safe(rowObj.supplier?.name),
      customer: safe(rowObj.customer),
      operatorName: safe(rowObj.operatorUser?.realName),
      createdAt: formatDate(rowObj.createdAt),
      remark: safe(rowObj.remark),
    };
  },
};

const stocktakeReport = {
  id: 'stocktake',
  name: '盘点报表',
  columns: [
    { key: 'stocktakeNo', header: '盘点单号', width: 20 },
    { key: 'title', header: '盘点标题', width: 25 },
    { key: 'warehouseName', header: '仓库名称', width: 20 },
    { key: 'sku', header: 'SKU', width: 15 },
    { key: 'productName', header: '产品名称', width: 25 },
    { key: 'systemQuantity', header: '账面数量', width: 12 },
    { key: 'actualQuantity', header: '实际数量', width: 12 },
    { key: 'difference', header: '差异', width: 10 },
    { key: 'differenceType', header: '差异类型', width: 12 },
    { key: 'totalAmount', header: '差异金额', width: 12 },
    { key: 'status', header: '状态', width: 12 },
    { key: 'startTime', header: '开始时间', width: 20 },
    { key: 'endTime', header: '结束时间', width: 20 },
  ],
  fetchRows: async function* (filters) {
    const PAGE_SIZE = 500;
    let offset = 0;
    let hasMore = true;

    const where = { ...buildDateRange('createdAt', filters) };
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;

    while (hasMore) {
      const rows = await Stocktake.findAll({
        where,
        include: [
          { model: Warehouse, as: 'warehouse', required: false },
          { model: StocktakeItem, as: 'items', required: false },
        ],
        limit: PAGE_SIZE,
        offset,
        raw: false,
      });

      if (rows.length === 0) {
        hasMore = false;
      } else {
        for (const row of rows) {
          yield row;
        }
        offset += PAGE_SIZE;
      }
    }
  },
  expand(row) {
    const rowObj = row.toJSON ? row.toJSON() : row;
    const statusMap = {
      draft: '草稿',
      confirming: '核实中',
      completed: '已完成',
      cancelled: '已取消',
    };
    const diffTypeMap = {
      profit: '盘盈',
      loss: '盘亏',
      none: '无差异',
    };

    const items = rowObj.items || [];
    if (items.length === 0) {
      return [
        {
          stocktakeNo: safe(rowObj.stocktakeNo),
          title: safe(rowObj.title),
          warehouseName: safe(rowObj.warehouse?.name),
          sku: '',
          productName: '',
          systemQuantity: '',
          actualQuantity: '',
          difference: '',
          differenceType: '',
          totalAmount: '',
          status: statusMap[rowObj.status] || safe(rowObj.status),
          startTime: formatDate(rowObj.startTime),
          endTime: formatDate(rowObj.endTime),
        },
      ];
    }

    return items.map((item) => ({
      stocktakeNo: safe(rowObj.stocktakeNo),
      title: safe(rowObj.title),
      warehouseName: safe(rowObj.warehouse?.name),
      sku: safe(item.sku),
      productName: safe(item.productName),
      systemQuantity: safe(item.systemQuantity, 0),
      actualQuantity: safe(item.actualQuantity, 0),
      difference: safe(item.difference, 0),
      differenceType: diffTypeMap[item.differenceType] || safe(item.differenceType),
      totalAmount: safe(item.totalAmount, 0),
      status: statusMap[rowObj.status] || safe(rowObj.status),
      startTime: formatDate(rowObj.startTime),
      endTime: formatDate(rowObj.endTime),
    }));
  },
};

const supplierReport = {
  id: 'supplier',
  name: '供应商供货统计',
  columns: [
    { key: 'supplierName', header: '供应商名称', width: 25 },
    { key: 'transactionCount', header: '交易次数', width: 12 },
    { key: 'totalQuantity', header: '总数量', width: 12 },
    { key: 'totalAmount', header: '总金额', width: 15 },
    { key: 'firstDate', header: '首次供货', width: 20 },
    { key: 'lastDate', header: '最近供货', width: 20 },
  ],
  fetchRows: async function* (filters) {
    const where = {
      type: 'in',
      supplierId: { [Op.ne]: null },
      ...buildDateRange('createdAt', filters),
    };
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;
    if (filters.supplierId) where.supplierId = filters.supplierId;

    const rows = await Transaction.findAll({
      attributes: [
        ['supplierId', 'supplierId'],
        [fn('COUNT', col('id')), 'transactionCount'],
        [fn('SUM', col('quantity')), 'totalQuantity'],
        [fn('SUM', col('totalAmount')), 'totalAmount'],
        [fn('MIN', col('createdAt')), 'firstDate'],
        [fn('MAX', col('createdAt')), 'lastDate'],
      ],
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['name'],
          required: false,
        },
      ],
      where,
      group: ['supplierId', 'supplier.id'],
      raw: false,
    });

    for (const row of rows) {
      yield row;
    }
  },
  mapRow(row) {
    const rowObj = row.toJSON ? row.toJSON() : row;
    return {
      supplierName: rowObj.supplier?.name || '(未关联供应商)',
      transactionCount: safe(rowObj.transactionCount, 0),
      totalQuantity: safe(rowObj.totalQuantity, 0),
      totalAmount: safe(rowObj.totalAmount, 0),
      firstDate: formatDate(rowObj.firstDate),
      lastDate: formatDate(rowObj.lastDate),
    };
  },
};

const lowStockReport = {
  id: 'low-stock',
  name: '库存预警报表',
  columns: [
    { key: 'sku', header: 'SKU', width: 15 },
    { key: 'productName', header: '产品名称', width: 25 },
    { key: 'unit', header: '单位', width: 10 },
    { key: 'warehouseName', header: '仓库名称', width: 20 },
    { key: 'quantity', header: '当前库存', width: 12 },
    { key: 'minStock', header: '最低库存', width: 12 },
    { key: 'shortage', header: '缺货量', width: 12 },
  ],
  fetchRows: async function* (filters) {
    const PAGE_SIZE = 500;
    let offset = 0;
    let hasMore = true;

    const where = {};
    if (filters.warehouseId) where.warehouseId = filters.warehouseId;

    const productInclude = {
      model: Product,
      as: 'product',
      required: true,
    };

    if (filters.categoryId) {
      productInclude.where = { categoryId: filters.categoryId };
    }

    while (hasMore) {
      const rows = await Inventory.findAll({
        where: {
          ...where,
          [Op.and]: literal('Inventory.quantity <= product.minStock AND product.minStock > 0'),
        },
        include: [
          productInclude,
          { model: Warehouse, as: 'warehouse', required: false },
        ],
        limit: PAGE_SIZE,
        offset,
        raw: false,
      });

      if (rows.length === 0) {
        hasMore = false;
      } else {
        for (const row of rows) {
          yield row;
        }
        offset += PAGE_SIZE;
      }
    }
  },
  mapRow(row) {
    const rowObj = row.toJSON ? row.toJSON() : row;
    const quantity = rowObj.quantity || 0;
    const minStock = rowObj.product?.minStock || 0;
    const shortage = Math.max(minStock - quantity, 0);

    return {
      sku: safe(rowObj.product?.sku),
      productName: safe(rowObj.product?.name),
      unit: safe(rowObj.product?.unit),
      warehouseName: safe(rowObj.warehouse?.name),
      quantity,
      minStock,
      shortage,
    };
  },
};

const operationLogReport = {
  id: 'operation-log',
  name: '操作日志报表',
  columns: [
    { key: 'timestamp', header: '时间', width: 20 },
    { key: 'username', header: '用户', width: 15 },
    { key: 'action', header: '操作', width: 15 },
    { key: 'module', header: '模块', width: 15 },
    { key: 'target', header: '目标', width: 20 },
    { key: 'ip', header: 'IP地址', width: 15 },
    { key: 'detail', header: '详情', width: 30 },
  ],
  fetchRows: async function* (filters) {
    const PAGE_SIZE = 500;
    let offset = 0;
    let hasMore = true;

    const where = {
      type: 'operation_log',
      ...buildDateRange('createdAt', filters),
    };

    while (hasMore) {
      const rows = await SystemConfig.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: PAGE_SIZE,
        offset,
        raw: false,
      });

      if (rows.length === 0) {
        hasMore = false;
      } else {
        for (const row of rows) {
          yield row;
        }
        offset += PAGE_SIZE;
      }
    }
  },
  mapRow(row) {
    const rowObj = row.toJSON ? row.toJSON() : row;
    let value = {};
    try {
      value = typeof rowObj.value === 'string' ? JSON.parse(rowObj.value) : rowObj.value || {};
    } catch (e) {
      value = {};
    }

    let detail = value.detail || '';
    if (typeof detail === 'object') {
      detail = JSON.stringify(detail);
    }

    return {
      timestamp: formatDate(rowObj.createdAt),
      username: safe(value.username),
      action: safe(value.action),
      module: safe(value.module),
      target: safe(value.target),
      ip: safe(value.ip),
      detail,
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

const BY_ID = {};
ALL.forEach((def) => {
  BY_ID[def.id] = def;
});

module.exports = {
  ALL,
  BY_ID,
  _internal: {
    formatDate,
    safe,
  },
};
