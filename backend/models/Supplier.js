const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Supplier = sequelize.define('Supplier', {
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
    contact: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        is: {
          args: /^1[3-9]\d{9}$/,
          msg: '请输入有效的手机号',
        },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    address: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    remark: {
      type: DataTypes.STRING,
      defaultValue: '',
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    level: {
      type: DataTypes.ENUM('A', 'B', 'C', 'D'),
      defaultValue: 'B',
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
    tableName: 'suppliers',
    timestamps: true,
  });

  Supplier.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
  };

  return Supplier;
};
