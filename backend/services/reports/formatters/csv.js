async function writeCSV(definition, rowAsyncIterable, outStream) {
  outStream.write('\uFEFF');

  const headers = definition.columns.map((c) => c.header);
  outStream.write(headers.join(',') + '\n');

  let rowCount = 0;
  for await (const rowData of rowAsyncIterable) {
    const values = definition.columns.map((col) => {
      let value = rowData[col.key];
      if (value === null || value === undefined) value = '';
      value = String(value);
      
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    outStream.write(values.join(',') + '\n');
    rowCount++;
  }

  return rowCount;
}

module.exports = { writeCSV };
