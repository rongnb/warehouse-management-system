/**
 * 报表筛选条件解析。
 * 把 query string 中的常见参数（startDate / endDate / warehouse / category / supplier）
 * 解析成 Mongoose 查询条件片段。各报表定义可以选择性使用。
 */
const mongoose = require('mongoose');
const { BadRequestError } = require('../../errors/AppError');

function parseDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new BadRequestError(`${fieldName} 不是合法日期: ${value}`);
  }
  return d;
}

function parseObjectId(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  if (!mongoose.isValidObjectId(value)) {
    throw new BadRequestError(`${fieldName} 不是合法 ID: ${value}`);
  }
  return new mongoose.Types.ObjectId(value);
}

/**
 * 从 req.query 解析通用筛选条件。
 * @param {object} query
 * @returns {{ startDate: Date|null, endDate: Date|null, warehouse: ObjectId|null,
 *            category: ObjectId|null, supplier: ObjectId|null }}
 */
function parseFilters(query = {}) {
  return {
    startDate: parseDate(query.startDate, 'startDate'),
    endDate: parseDate(query.endDate, 'endDate'),
    warehouse: parseObjectId(query.warehouse, 'warehouse'),
    category: parseObjectId(query.category, 'category'),
    supplier: parseObjectId(query.supplier, 'supplier'),
  };
}

/**
 * 将通用筛选转成针对某字段名的 mongoose 查询条件。
 * 例如 dateField='createdAt'，会在 startDate/endDate 都存在时生成
 * { createdAt: { $gte, $lte } }。
 */
function buildDateRange(dateField, filters) {
  if (!filters.startDate && !filters.endDate) return {};
  const range = {};
  if (filters.startDate) range.$gte = filters.startDate;
  if (filters.endDate) range.$lte = filters.endDate;
  return { [dateField]: range };
}

module.exports = { parseFilters, buildDateRange };
