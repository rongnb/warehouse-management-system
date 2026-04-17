const { BadRequestError } = require('../../errors/AppError');
const { ALL, BY_ID } = require('./definitions');
const { writeExcel } = require('./formatters/excel');
const { writeCSV } = require('./formatters/csv');
const logger = require('../../utils/logger');

async function generateReport({ reportId, format = 'excel', filters, res }) {
  const definition = BY_ID[reportId];
  if (!definition) {
    throw new BadRequestError(`未知报表: ${reportId}`);
  }

  if (format !== 'excel' && format !== 'csv') {
    throw new BadRequestError(`不支持的格式: ${format}`);
  }

  const mimeTypes = {
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv; charset=utf-8',
  };

  const extensions = {
    excel: 'xlsx',
    csv: 'csv',
  };

  const fileName = `${definition.name}.${extensions[format]}`;
  const encodedFileName = encodeURIComponent(fileName);

  res.setHeader('Content-Type', mimeTypes[format]);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
  res.setHeader('Cache-Control', 'no-store');

  async function* buildRowIterable() {
    for await (const rawRow of definition.fetchRows(filters)) {
      if (definition.expand) {
        const expandedRows = definition.expand(rawRow);
        for (const mappedRow of expandedRows) {
          yield mappedRow;
        }
      } else {
        yield definition.mapRow(rawRow);
      }
    }
  }

  try {
    const rowIterable = buildRowIterable();
    
    let rowCount;
    if (format === 'excel') {
      rowCount = await writeExcel(definition, rowIterable, res);
    } else {
      rowCount = await writeCSV(definition, rowIterable, res);
    }

    logger.info(`报表生成完成: ${reportId}, 格式: ${format}, 行数: ${rowCount}`);
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      throw error;
    } else {
      logger.error(`报表流式写入失败: ${error.message}`);
      res.end();
    }
  }
}

module.exports = {
  generateReport,
  ALL,
  BY_ID,
};
