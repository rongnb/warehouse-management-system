-- 盘库功能初始化脚本
-- 此为MongoDB数据库的初始化示例

-- 1. 确保交易类型包含盘盈盘亏
-- 已经在Transaction模型中更新了type枚举值，包含：'in', 'out', 'stocktake_profit', 'stocktake_loss'

-- 2. 索引建议
db.stocktakes.createIndex({ stocktakeNo: 1 }, { unique: true });
db.stocktakes.createIndex({ warehouse: 1, createdAt: -1 });
db.stocktakes.createIndex({ status: 1, createdAt: -1 });
db.stocktakes.createIndex({ createdBy: 1, createdAt: -1 });

-- 3. 示例数据（可选）
db.stocktakes.insertOne({
  stocktakeNo: "PD202401010001",
  title: "2024年1月月度盘点",
  warehouse: ObjectId("替换为实际仓库ID"),
  warehouseName: "一号仓库",
  status: "completed",
  startTime: ISODate("2024-01-31T00:00:00Z"),
  endTime: ISODate("2024-01-31T12:00:00Z"),
  items: [
    {
      product: ObjectId("替换为实际商品ID"),
      sku: "PROD001",
      productName: "示例商品",
      spec: "规格1",
      unit: "个",
      systemQuantity: 100,
      actualQuantity: 105,
      difference: 5,
      differenceType: "profit",
      unitPrice: 10,
      totalAmount: 50,
      remark: "盘盈5个"
    }
  ],
  totalProfitQuantity: 5,
  totalProfitAmount: 50,
  totalLossQuantity: 0,
  totalLossAmount: 0,
  firstConfirmedBy: ObjectId("替换为用户ID"),
  firstConfirmedAt: ISODate("2024-01-31T10:00:00Z"),
  firstConfirmedRemark: "数据无误",
  secondConfirmedBy: ObjectId("替换为管理员ID"),
  secondConfirmedAt: ISODate("2024-01-31T11:00:00Z"),
  secondConfirmedRemark: "同意",
  completedBy: ObjectId("替换为管理员ID"),
  completedAt: ISODate("2024-01-31T11:00:00Z"),
  createdBy: ObjectId("替换为创建人ID"),
  createdAt: ISODate("2024-01-31T09:00:00Z"),
  updatedAt: ISODate("2024-01-31T11:00:00Z")
});
