/**
 * Excel 流式导出。基于 exceljs 的 streaming workbook writer，
 * 把行一行一行写到 HTTP response，避免一次性把整张表加载进内存。
 */
const ExcelJS = require('exceljs');

/**
 * @param {{ name: string, columns: Array<{key:string, header:string, width?:number}> }} definition
 * @param {AsyncIterable<object>} rowIterable 已 mapRow 过的扁平行对象的异步迭代器
 * @param {NodeJS.WritableStream} outStream HTTP response 或文件流
 */
async function writeExcel(definition, rowIterable, outStream) {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: outStream,
    useStyles: true,
    useSharedStrings: false, // 流式模式下关闭 shared strings 以降内存
  });

  const sheet = workbook.addWorksheet(definition.name.slice(0, 31)); // sheet 名长度上限 31
  sheet.columns = definition.columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 16,
  }));

  // 表头加粗
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).commit();

  let rowCount = 0;
  for await (const row of rowIterable) {
    sheet.addRow(row).commit();
    rowCount += 1;
  }

  sheet.commit();
  await workbook.commit();
  return rowCount;
}

module.exports = { writeExcel };
