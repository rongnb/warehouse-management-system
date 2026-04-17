# Warehouse Management System - SQLite Persistence Layer

## Stack

- **ORM**: Sequelize v6 (CommonJS)
- **Database**: SQLite3 (via `sqlite3` npm package)
- **Node.js**: >= 14
- **DB File**: `process.env.SQLITE_PATH` or `<repo-root>/data/warehouse.db`
- **Test Mode**: Use `:memory:` storage for tests

## Database Connection

```javascript
const { sequelize, connect } = require('./db');

// Connect to database
await connect();

// Direct access to sequelize instance
await sequelize.authenticate();
```

## Models

All models are available via:

```javascript
const {
  sequelize,
  Sequelize,
  User,
  Product,
  Category,
  Supplier,
  Warehouse,
  Inventory,
  Transaction,
  Stocktake,
  StocktakeItem,
  SystemConfig,
} = require('./models');
```

### Model Structure

- **Primary Keys**: Integer auto-increment. Field name on JS side: `id`
- **Virtual `_id`**: All models expose a virtual `_id` getter that returns `this.id` for frontend backward compatibility
- **Timestamps**: All models have `createdAt` and `updatedAt` (camelCase)

## Querying Examples

### Basic Queries

```javascript
// Find all active products
const products = await Product.findAll({
  where: { status: true },
});

// Find by primary key
const product = await Product.findByPk(1);

// Find one with condition
const user = await User.findOne({
  where: { username: 'admin' },
});
```

### Associations (Eager Loading)

```javascript
// Product with category and supplier
const product = await Product.findByPk(productId, {
  include: [
    { model: Category, as: 'category' },
    { model: Supplier, as: 'supplier' },
  ],
});

// Inventory with product and warehouse details
const inventory = await Inventory.findAll({
  include: [
    { model: Product, as: 'product' },
    { model: Warehouse, as: 'warehouse' },
  ],
});

// Transaction with all relations
const transaction = await Transaction.findByPk(id, {
  include: [
    { model: Product, as: 'product' },
    { model: Warehouse, as: 'warehouse' },
    { model: Supplier, as: 'supplier' },
    { model: User, as: 'operatorUser' },
    { model: User, as: 'creator' },
  ],
});

// Stocktake with items
const stocktake = await Stocktake.findByPk(id, {
  include: [{
    model: StocktakeItem,
    as: 'items',
    include: [{ model: Product, as: 'product' }],
  }],
});
```

### Pagination

```javascript
const { Op } = require('sequelize');

const { count, rows } = await Product.findAndCountAll({
  where: { status: true },
  limit: 20,
  offset: 0,
  order: [['createdAt', 'DESC']],
});

// Result:
// count = total matching records
// rows = array of Product instances for current page
```

### Date Filtering

```javascript
const { Op } = require('sequelize');

const transactions = await Transaction.findAll({
  where: {
    createdAt: {
      [Op.gte]: startDate,
      [Op.lte]: endDate,
    },
  },
});
```

### Complex Queries

```javascript
// Low stock products
const lowStockProducts = await Product.findAll({
  include: [{
    model: Inventory,
    as: 'inventories',
    required: false,
  }],
  where: {
    status: true,
  },
});

// Filter with OR
const results = await Product.findAll({
  where: {
    [Op.or]: [
      { name: { [Op.like]: `%${keyword}%` } },
      { sku: { [Op.like]: `%${keyword}%` } },
    ],
  },
});
```

## Creating and Updating Records

### Create

```javascript
// Simple create
const user = await User.create({
  username: 'john',
  password: 'password123',
  realName: 'John Doe',
  email: 'john@example.com',
  role: 'staff',
});

// Bulk create
await Product.bulkCreate([
  { name: 'Product A', sku: 'SKU001', unit: '个', price: 100 },
  { name: 'Product B', sku: 'SKU002', unit: '个', price: 200 },
]);
```

### Update

```javascript
// Update instance
const product = await Product.findByPk(1);
product.name = 'Updated Name';
product.price = 150;
await product.save();

// Bulk update
await Product.update(
  { status: false },
  { where: { id: { [Op.in]: [1, 2, 3] } } }
);
```

### Delete

```javascript
// Soft delete not used - use hard delete
const product = await Product.findByPk(1);
await product.destroy();

// Bulk delete
await Product.destroy({
  where: { status: false },
});
```

## Transactions (Database Transactions)

```javascript
const result = await sequelize.transaction(async (t) => {
  // All queries within this callback use the transaction
  const product = await Product.findByPk(productId, { transaction: t });
  
  const inventory = await Inventory.findOne({
    where: { productId, warehouseId },
    transaction: t,
  });
  
  inventory.quantity += quantity;
  await inventory.save({ transaction: t });
  
  await Transaction.create({
    type: 'in',
    productId,
    warehouseId,
    quantity,
    // ... other fields
  }, { transaction: t });
  
  return inventory;
});
```

## Streaming Large Result Sets

SQLite via Sequelize doesn't support native cursors. For large reports, use chunked pagination:

```javascript
async function* streamRecords(model, where = {}, chunkSize = 500) {
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const records = await model.findAll({
      where,
      limit: chunkSize,
      offset,
      raw: true,
    });
    
    if (records.length === 0) {
      hasMore = false;
    } else {
      for (const record of records) {
        yield record;
      }
      offset += chunkSize;
    }
  }
}

// Usage:
for await (const transaction of streamRecords(Transaction, { status: 'completed' })) {
  console.log(transaction);
}
```

## Model-Specific Notes

### User Model

- Password is automatically hashed on create/update using bcryptjs
- Use `user.comparePassword(plainPassword)` to verify passwords
- Roles: `admin`, `manager`, `staff`, `warehouse_keeper`

### Transaction Model

- `transactionNo` is auto-generated in `beforeCreate` hook if not provided
- `totalAmount` is auto-computed as `quantity * (price || unitPrice)`
- If `operator` is null and `createdBy` is set, `operator` defaults to `createdBy`

### Stocktake Model

- `stocktakeNo` is auto-generated in `beforeCreate` hook: `PD${YYYYMMDD}${4-digit-seq}`
- Related `StocktakeItem` records are in separate table with `stocktakeId` foreign key
- Use `include: [{ model: StocktakeItem, as: 'items' }]` to load items

### SystemConfig Model

- Singleton pattern: use `SystemConfig.getInstance()` to get/create config
- `settings` field is JSON type for arbitrary key-value config

## Associations Reference

```
User (many) ← createdBy/updatedBy → (Product, Category, Supplier, Warehouse, etc.)

Product
  ├─ belongsTo Category (categoryId)
  ├─ belongsTo Supplier (supplierId)
  ├─ belongsTo User as createdByUser (createdBy)
  └─ belongsTo User as updatedByUser (updatedBy)

Inventory
  ├─ belongsTo Product (productId)
  ├─ belongsTo Warehouse (warehouseId)
  └─ belongsTo User as updatedByUser (updatedBy)
  └─ Composite unique index on (productId, warehouseId)

Transaction
  ├─ belongsTo Product (productId)
  ├─ belongsTo Warehouse (warehouseId)
  ├─ belongsTo Supplier (supplierId)
  ├─ belongsTo User as operatorUser (operator)
  ├─ belongsTo User as creator (createdBy)
  └─ belongsTo User as auditor (auditBy)

Stocktake
  ├─ belongsTo Warehouse (warehouseId)
  ├─ belongsTo User as creator (createdBy)
  ├─ belongsTo User as firstConfirmer (firstConfirmedBy)
  ├─ belongsTo User as secondConfirmer (secondConfirmedBy)
  ├─ belongsTo User as completer (completedBy)
  ├─ belongsTo User as canceller (cancelledBy)
  └─ hasMany StocktakeItem as items (CASCADE delete)

StocktakeItem
  ├─ belongsTo Stocktake (stocktakeId)
  └─ belongsTo Product (productId)

Category
  ├─ hasMany Category as children (parentId)
  └─ belongsTo Category as parent (parentId)
```

## Database Initialization

Run the init script to create tables and seed default data:

```bash
# First-time setup (or reset)
RESET=true node db/init.js

# Re-run seeds (idempotent, won't duplicate)
node db/init.js
```

Default seeds:
- Admin user: `admin` / `admin123`
- Default warehouse: "默认仓库" (code: `DEFAULT`)
- Categories: 办公用品, 电子产品, 耗材

## Environment Variables

- `SQLITE_PATH`: Path to SQLite database file (default: `<repo>/data/warehouse.db`)
- `NODE_ENV`: Set to `test` to use in-memory database
- `AUTO_SYNC`: Set to `true` to auto-sync schema on connect (not recommended for production)
- `RESET`: Set to `true` when running `db/init.js` to drop and recreate all tables

## Migration Notes for Route Developers

1. **ID fields**: Routes currently using `_id` from Mongo will continue to work due to virtual getter
2. **Query patterns**: Replace Mongoose `.find()` with Sequelize `.findAll()`, `.findOne()`, etc.
3. **Populate**: Replace `.populate()` with `include: [{ model: X, as: 'alias' }]`
4. **Model names**: Import from `require('./models')` instead of individual files
5. **Validation**: Sequelize throws on validation errors; handle with try/catch
6. **Transactions**: Use `sequelize.transaction()` wrapper for atomic operations

## Common Pitfalls

- **Don't forget `await`**: All Sequelize operations are async
- **Association aliases**: Use exact `as` name from model definitions (e.g., `'category'` not `'Category'`)
- **Raw queries**: Use `{ raw: true }` option if you don't need model instances
- **Op import**: Import `Op` from Sequelize for operators: `const { Op } = require('sequelize');`
- **Foreign key fields**: Use lowercase camelCase (e.g., `categoryId`, not `CategoryId`)
