const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StocktakeItem = sequelize.define('StocktakeItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    stocktakeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'stocktakes',
        key: 'id',
      },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    productName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    spec: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    unit: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    systemQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    actualQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    difference: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    differenceType: {
      type: DataTypes.ENUM('profit', 'loss', 'none'),
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    remark: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
  }, {
    tableName: 'stocktake_items',
    timestamps: true,
  });

  StocktakeItem.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
  };

  return StocktakeItem;
};
