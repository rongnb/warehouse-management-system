const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemConfig = sequelize.define('SystemConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    stocktakeFrequency: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'half_year', 'yearly'),
      defaultValue: 'quarterly',
    },
    stocktakeReminderDays: {
      type: DataTypes.INTEGER,
      defaultValue: 7,
    },
    autoGenerateStocktake: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    stockWarningThreshold: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    systemName: {
      type: DataTypes.STRING,
      defaultValue: '仓库管理系统',
    },
    settings: {
      type: DataTypes.JSON,
      defaultValue: {},
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
    tableName: 'system_configs',
    timestamps: true,
  });

  SystemConfig.getInstance = async function() {
    let config = await this.findOne();
    if (!config) {
      config = await this.create({});
    }
    return config;
  };

  SystemConfig.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
  };

  return SystemConfig;
};
