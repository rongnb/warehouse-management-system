const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
      set(value) {
        this.setDataValue('sku', value ? value.toUpperCase() : value);
      },
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id',
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
    description: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    specification: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    modelName: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    manufacturer: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '个',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    costPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    image: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    minStock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    maxStock: {
      type: DataTypes.INTEGER,
      defaultValue: 99999,
      validate: {
        min: 0,
      },
    },
    remark: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'products',
    timestamps: true,
    indexes: [
      {
        fields: ['name'],
      },
      {
        unique: true,
        fields: ['sku'],
      },
    ],
  });

  Product.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
  };

  return Product;
};
