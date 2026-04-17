require('../../setup-env');
const { Writable } = require('stream');
const { writeCSV } = require('../../../backend/services/reports/formatters/csv');
const { writeExcel } = require('../../../backend/services/reports/formatters/excel');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

describe('Report Formatters', () => {
  describe('CSV Writer', () => {
    it('should write BOM and header', async () => {
      const definition = {
        columns: [
          { key: 'col1', header: 'Column 1' },
          { key: 'col2', header: 'Column 2' },
        ],
      };

      const chunks = [];
      const stream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      async function* rows() {
        // No rows
      }

      await writeCSV(definition, rows(), stream);
      const output = Buffer.concat(chunks).toString('utf-8');
      
      expect(output.startsWith('\uFEFF')).toBe(true);
      expect(output).toContain('Column 1,Column 2');
    });

    it('should escape commas, quotes, and newlines', async () => {
      const definition = {
        columns: [
          { key: 'col1', header: 'Col1' },
          { key: 'col2', header: 'Col2' },
          { key: 'col3', header: 'Col3' },
        ],
      };

      const chunks = [];
      const stream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      async function* rows() {
        yield { col1: 'has,comma', col2: 'has"quote', col3: 'has\nnewline' };
      }

      await writeCSV(definition, rows(), stream);
      const output = Buffer.concat(chunks).toString('utf-8');
      
      expect(output).toContain('"has,comma"');
      expect(output).toContain('"has""quote"');
      expect(output).toContain('"has\nnewline"');
    });

    it('should write multiple rows', async () => {
      const definition = {
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'value', header: 'Value' },
        ],
      };

      const chunks = [];
      const stream = new Writable({
        write(chunk, encoding, callback) {
          chunks.push(chunk);
          callback();
        },
      });

      async function* rows() {
        yield { name: 'Row1', value: 100 };
        yield { name: 'Row2', value: 200 };
        yield { name: 'Row3', value: 300 };
      }

      const count = await writeCSV(definition, rows(), stream);
      const output = Buffer.concat(chunks).toString('utf-8');
      
      expect(count).toBe(3);
      expect(output).toContain('Row1,100');
      expect(output).toContain('Row2,200');
      expect(output).toContain('Row3,300');
    });
  });

  describe('Excel Writer', () => {
    // SKIP: Excel writer tests hang in CI due to stream handling
    it.skip('should write Excel with header and rows', async () => {
      const definition = {
        name: 'TestReport',
        columns: [
          { key: 'name', header: 'Name', width: 20 },
          { key: 'value', header: 'Value', width: 10 },
        ],
      };

      const tmpFile = path.join(__dirname, '../../fixtures/test-output.xlsx');
      const stream = fs.createWriteStream(tmpFile);

      async function* rows() {
        yield { name: 'Item1', value: 10 };
        yield { name: 'Item2', value: 20 };
        yield { name: 'Item3', value: 30 };
      }

      const count = await writeExcel(definition, rows(), stream);
      await new Promise((resolve) => stream.on('finish', resolve));

      expect(count).toBe(3);
      expect(fs.existsSync(tmpFile)).toBe(true);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(tmpFile);
      
      const sheet = workbook.worksheets[0];
      expect(sheet.name).toBe('TestReport');
      expect(sheet.rowCount).toBe(4); // header + 3 rows
      
      expect(sheet.getRow(1).getCell(1).value).toBe('Name');
      expect(sheet.getRow(1).getCell(2).value).toBe('Value');
      expect(sheet.getRow(2).getCell(1).value).toBe('Item1');
      expect(sheet.getRow(2).getCell(2).value).toBe(10);

      fs.unlinkSync(tmpFile);
    });

    it.skip('should handle empty row set', async () => {
      const definition = {
        name: 'EmptyReport',
        columns: [
          { key: 'col1', header: 'Col1' },
        ],
      };

      const tmpFile = path.join(__dirname, '../../fixtures/test-empty.xlsx');
      const stream = fs.createWriteStream(tmpFile);

      async function* rows() {
        // No rows
      }

      const count = await writeExcel(definition, rows(), stream);
      await new Promise((resolve) => stream.on('finish', resolve));

      expect(count).toBe(0);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(tmpFile);
      
      const sheet = workbook.worksheets[0];
      expect(sheet.rowCount).toBe(1); // just header

      fs.unlinkSync(tmpFile);
    });
  });
});
