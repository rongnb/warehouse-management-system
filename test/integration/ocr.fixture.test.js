require('../setup-env');
const path = require('path');
const fs = require('fs');
const { initializeWorker, parseOCRResult } = require('../../backend/services/ocr');

// SKIP: Requires tesseract traineddata files and is heavy for CI
describe.skip('OCR Fixture Integration Tests', () => {
  const fixturesPath = path.join(__dirname, '../fixtures/ocr');
  const lenovoPath = path.join(fixturesPath, 'lenovo-thinkpad.png');
  const kestPath = path.join(fixturesPath, 'kest-crg319.png');

  const chiSimPath = path.join(__dirname, '../../backend/chi_sim.traineddata');
  const engPath = path.join(__dirname, '../../backend/eng.traineddata');

  beforeAll(() => {
    if (!fs.existsSync(chiSimPath) || !fs.existsSync(engPath)) {
      console.log('⚠️  Skipping OCR fixture tests: traineddata files not found');
      return;
    }
    if (!fs.existsSync(lenovoPath) || !fs.existsSync(kestPath)) {
      console.log('⚠️  Skipping OCR fixture tests: fixture images not found');
      return;
    }
  });

  it('should recognize Lenovo ThinkPad from fixture image', async () => {
    if (!fs.existsSync(chiSimPath) || !fs.existsSync(lenovoPath)) return;

    const worker = await initializeWorker();
    const result = await worker.recognize(lenovoPath);
    const parsed = parseOCRResult(result.data.text);

    expect(parsed.manufacturer).toBe('联想');
    expect(parsed.modelName).toBeTruthy();
  }, 60000);

  it('should recognize Kest CRG-319 from fixture image', async () => {
    if (!fs.existsSync(chiSimPath) || !fs.existsSync(kestPath)) return;

    const worker = await initializeWorker();
    const result = await worker.recognize(kestPath);
    const parsed = parseOCRResult(result.data.text);

    expect(parsed.manufacturer).toBe('科思特');
    expect(parsed.modelName).toMatch(/CRG|319/i);
  }, 60000);
});
