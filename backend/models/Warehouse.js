const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Warehouse = sequelize.define('Warehouse', {
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
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
      set(value) {
        this.setDataValue('code', value ? value.toUpperCase() : value);
      },
    },
    location: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    manager: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: {
          args: /^1[3-9]\d{9}$/,
          msg: '请输入有效的手机号',
        },
      },
    },
    description: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    sort: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'warehouses',
    timestamps: true,
  });

  Warehouse.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
  };

  return Warehouse;
};
