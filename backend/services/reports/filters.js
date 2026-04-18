const { BadRequestError } = require('../../errors/AppError');
const { Op } = require('sequelize');

function parseDate(value) {
  if (!value || value === '') return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new BadRequestError(`日期不是合法日期: ${value}`);
  }
  return date;
}

function parseId(value) {
  if (!value || value === '') return null;
  const id = parseInt(value, 10);
  if (isNaN(id) || id <= 0 || !Number.isInteger(parseFloat(value))) {
    throw new BadRequestError(`ID不是合法 ID: ${value}`);
  }
  return id;
}

function parseFilters(query) {
  return {
    startDate: parseDate(query.startDate),
    endDate: parseDate(query.endDate),
    warehouseId: parseId(query.warehouse),
    categoryId: parseId(query.category),
    supplierId: parseId(query.supplier),
  };
}

function buildDateRange(field, filters) {
  const { startDate, endDate } = filters;
  if (!startDate && !endDate) return {};
  
  const range = {};
  if (startDate && endDate) {
    range[field] = { [Op.gte]: startDate, [Op.lte]: endDate };
  } else if (startDate) {
    range[field] = { [Op.gte]: startDate };
  } else if (endDate) {
    range[field] = { [Op.lte]: endDate };
  }
  
  return range;
}

module.exports = {
  parseDate,
  parseId,
  parseFilters,
  buildDateRange,
};
