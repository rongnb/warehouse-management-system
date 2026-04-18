const ExcelJS = require('exceljs');

async function writeExcel(definition, rowAsyncIterable, outStream) {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: outStream,
    useStyles: true,
    useSharedStrings: false,
  });

  const sheetName = definition.name.substring(0, 31);
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = definition.columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  let rowCount = 0;
  for await (const rowData of rowAsyncIterable) {
    const row = sheet.addRow(rowData);
    row.commit();
    rowCount++;
  }

  await workbook.commit();
  return rowCount;
}

module.exports = { writeExcel };
