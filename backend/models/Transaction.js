const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    transactionNo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM('in', 'out', 'stocktake_profit', 'stocktake_loss'),
      allowNull: false,
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'warehouses',
        key: 'id',
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'suppliers',
        key: 'id',
      },
    },
    customer: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    operator: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    referenceNo: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    remark: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
      defaultValue: 'completed',
    },
    batchNumber: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    productionDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    auditBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    auditTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    auditRemark: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    consumptionUnit: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    consumptionApprover: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    consumptionHandler: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    consumptionDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'transactions',
    timestamps: true,
  });

  Transaction.beforeValidate(async (transaction) => {
    if (!transaction.transactionNo) {
      let prefix = 'OUT';
      if (transaction.type === 'in') prefix = 'IN';
      if (transaction.type === 'stocktake_profit') prefix = 'PROFIT';
      if (transaction.type === 'stocktake_loss') prefix = 'LOSS';
      
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const random = Math.random().toString(36).substr(2, 6).toUpperCase();
      transaction.transactionNo = `${prefix}${date}${random}`;
    }
    
    if (transaction.quantity && (transaction.price || transaction.unitPrice)) {
      transaction.totalAmount = transaction.quantity * (transaction.price || transaction.unitPrice);
    }
    
    if (!transaction.operator && transaction.createdBy) {
      transaction.operator = transaction.createdBy;
    }
  });

  Transaction.beforeUpdate(async (transaction) => {
    if (transaction.changed('quantity') || transaction.changed('price') || transaction.changed('unitPrice')) {
      const qty = transaction.quantity || 0;
      const priceVal = transaction.price || transaction.unitPrice || 0;
      transaction.totalAmount = qty * priceVal;
    }
  });

  Transaction.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
  };

  return Transaction;
};
