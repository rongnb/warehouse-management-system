require('../../setup-env');
const { parseOCRResult } = require('../../../backend/services/ocr');

describe('OCR parseOCRResult', () => {
  it('should return default values for empty input', () => {
    const result = parseOCRResult('');
    expect(result.modelName).toBe('未识别');
    expect(result.manufacturer).toBe('未识别');
    expect(result.confidence).toBe(0);
    expect(result.ocrText).toBe('');
  });

  it('should return default values for whitespace input', () => {
    const result = parseOCRResult('   \n  \n  ');
    expect(result.modelName).toBe('未识别');
    expect(result.manufacturer).toBe('未识别');
    expect(result.confidence).toBe(0);
  });

  it('should extract Lenovo ThinkPad manufacturer', () => {
    const text = '联想 ThinkPad\nT490 X1 Carbon';
    const result = parseOCRResult(text);
    expect(result.manufacturer).toBe('联想');
    expect(result.modelName).toMatch(/T490|X1|Carbon/i);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should extract model with alphanumeric pattern', () => {
    const text = 'Product Info\nCRG-319\nToner Cartridge';
    const result = parseOCRResult(text);
    expect(result.modelName).toMatch(/CRG-319|CRG319/i);
  });

  it('should extract Kest manufacturer and model', () => {
    const text = '科思特 CRG-319\n黑色墨粉盒';
    const result = parseOCRResult(text);
    expect(result.manufacturer).toBe('科思特');
    expect(result.modelName).toMatch(/CRG|319/);
  });

  it('should increase confidence when both manufacturer and model identified', () => {
    const text = '联想 ThinkPad T490';
    const result = parseOCRResult(text);
    expect(result.manufacturer).toBe('联想');
    expect(result.modelName).toBeTruthy();
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('should handle mixed language text', () => {
    const text = 'Lenovo联想\nThinkPad T14\nGen 2';
    const result = parseOCRResult(text);
    expect(result.manufacturer).toBe('联想');
    expect(result.modelName).toBeTruthy();
    expect(result.modelName.length).toBeGreaterThan(3);
  });

  it('should use longest line as fallback for model', () => {
    const text = 'Short\nThis is a much longer line without numbers\nShort';
    const result = parseOCRResult(text);
    expect(result.modelName).toBeTruthy();
    expect(result.modelName.length).toBeGreaterThanOrEqual(5);
  });
});
