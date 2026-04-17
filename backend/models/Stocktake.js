const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const Stocktake = sequelize.define('Stocktake', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    stocktakeNo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
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
    warehouseName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    status: {
      type: DataTypes.ENUM('draft', 'confirming', 'completed', 'cancelled'),
      defaultValue: 'draft',
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalProfitQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalProfitAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalLossQuantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalLossAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    firstConfirmedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    firstConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    firstConfirmedRemark: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    secondConfirmedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    secondConfirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    secondConfirmedRemark: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    completedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelledBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelReason: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    remark: {
      type: DataTypes.TEXT,
      defaultValue: '',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
  }, {
    tableName: 'stocktakes',
    timestamps: true,
  });

  Stocktake.beforeCreate(async (stocktake) => {
    if (!stocktake.stocktakeNo) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      const startOfDay = new Date(year, date.getMonth(), date.getDate());
      const endOfDay = new Date(year, date.getMonth(), date.getDate() + 1);
      
      const count = await stocktake.constructor.count({
        where: {
          createdAt: {
            [Op.gte]: startOfDay,
            [Op.lt]: endOfDay,
          },
        },
      });
      
      stocktake.stocktakeNo = `PD${year}${month}${day}${String(count + 1).padStart(4, '0')}`;
    }
  });

  Stocktake.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
  };

  return Stocktake;
};
