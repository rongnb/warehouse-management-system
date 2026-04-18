const { sequelize, Sequelize } = require('../db');

// Import model definitions
const UserModel = require('./User');
const CategoryModel = require('./Category');
const SupplierModel = require('./Supplier');
const WarehouseModel = require('./Warehouse');
const ProductModel = require('./Product');
const InventoryModel = require('./Inventory');
const TransactionModel = require('./Transaction');
const StocktakeModel = require('./Stocktake');
const StocktakeItemModel = require('./StocktakeItem');
const SystemConfigModel = require('./SystemConfig');

// Initialize models
const User = UserModel(sequelize);
const Category = CategoryModel(sequelize);
const Supplier = SupplierModel(sequelize);
const Warehouse = WarehouseModel(sequelize);
const Product = ProductModel(sequelize);
const Inventory = InventoryModel(sequelize);
const Transaction = TransactionModel(sequelize);
const Stocktake = StocktakeModel(sequelize);
const StocktakeItem = StocktakeItemModel(sequelize);
const SystemConfig = SystemConfigModel(sequelize);

// Define associations

// Category self-referential relationship
Category.hasMany(Category, {
  as: 'children',
  foreignKey: 'parentId',
});
Category.belongsTo(Category, {
  as: 'parent',
  foreignKey: 'parentId',
});

// Product associations
Product.belongsTo(Category, {
  foreignKey: 'categoryId',
  as: 'category',
});
Product.belongsTo(Supplier, {
  foreignKey: 'supplierId',
  as: 'supplier',
});
Product.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'createdByUser',
});
Product.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updatedByUser',
});

// Inventory associations
Inventory.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});
Inventory.belongsTo(Warehouse, {
  foreignKey: 'warehouseId',
  as: 'warehouse',
});
Inventory.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updatedByUser',
});

// Transaction associations
Transaction.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});
Transaction.belongsTo(Warehouse, {
  foreignKey: 'warehouseId',
  as: 'warehouse',
});
Transaction.belongsTo(Supplier, {
  foreignKey: 'supplierId',
  as: 'supplier',
});
Transaction.belongsTo(User, {
  foreignKey: 'operator',
  as: 'operatorUser',
});
Transaction.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});
Transaction.belongsTo(User, {
  foreignKey: 'auditBy',
  as: 'auditor',
});

// Warehouse associations
Warehouse.belongsTo(User, {
  foreignKey: 'manager',
  as: 'managerUser',
});
Warehouse.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'createdByUser',
});

// Category associations
Category.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'createdByUser',
});

// Supplier associations
Supplier.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'createdByUser',
});

// Stocktake associations
Stocktake.belongsTo(Warehouse, {
  foreignKey: 'warehouseId',
  as: 'warehouse',
});
Stocktake.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});
Stocktake.belongsTo(User, {
  foreignKey: 'firstConfirmedBy',
  as: 'firstConfirmer',
});
Stocktake.belongsTo(User, {
  foreignKey: 'secondConfirmedBy',
  as: 'secondConfirmer',
});
Stocktake.belongsTo(User, {
  foreignKey: 'completedBy',
  as: 'completer',
});
Stocktake.belongsTo(User, {
  foreignKey: 'cancelledBy',
  as: 'canceller',
});
Stocktake.hasMany(StocktakeItem, {
  foreignKey: 'stocktakeId',
  as: 'items',
  onDelete: 'CASCADE',
});

// StocktakeItem associations
StocktakeItem.belongsTo(Stocktake, {
  foreignKey: 'stocktakeId',
  as: 'stocktake',
});
StocktakeItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product',
});

// SystemConfig associations
SystemConfig.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updatedByUser',
});

module.exports = {
  sequelize,
  Sequelize,
  User,
  Category,
  Supplier,
  Warehouse,
  Product,
  Inventory,
  Transaction,
  Stocktake,
  StocktakeItem,
  SystemConfig,
};
