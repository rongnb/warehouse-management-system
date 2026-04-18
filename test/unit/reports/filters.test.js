require('../../setup-env');
const { parseDate, parseId, parseFilters, buildDateRange } = require('../../../backend/services/reports/filters');
const { BadRequestError } = require('../../../backend/errors/AppError');

describe('Reports Filters', () => {
  describe('parseDate', () => {
    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
    });

    it('should parse valid date string', () => {
      const result = parseDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should throw BadRequestError for invalid date', () => {
      expect(() => parseDate('not-a-date')).toThrow(BadRequestError);
      expect(() => parseDate('2024-99-99')).toThrow(BadRequestError);
    });
  });

  describe('parseId', () => {
    it('should return null for empty string', () => {
      expect(parseId('')).toBeNull();
      expect(parseId(null)).toBeNull();
      expect(parseId(undefined)).toBeNull();
    });

    it('should parse valid positive integer', () => {
      expect(parseId('123')).toBe(123);
      expect(parseId('1')).toBe(1);
    });

    it('should throw BadRequestError for zero or negative', () => {
      expect(() => parseId('0')).toThrow(BadRequestError);
      expect(() => parseId('-5')).toThrow(BadRequestError);
    });

    it('should throw BadRequestError for non-numeric', () => {
      expect(() => parseId('abc')).toThrow(BadRequestError);
      expect(() => parseId('12.5')).toThrow(BadRequestError);
    });
  });

  describe('parseFilters', () => {
    it('should parse all filters correctly', () => {
      const query = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        warehouse: '5',
        category: '10',
        supplier: '20',
      };

      const result = parseFilters(query);
      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.warehouseId).toBe(5);
      expect(result.categoryId).toBe(10);
      expect(result.supplierId).toBe(20);
    });

    it('should handle empty query', () => {
      const result = parseFilters({});
      expect(result.startDate).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.warehouseId).toBeNull();
      expect(result.categoryId).toBeNull();
      expect(result.supplierId).toBeNull();
    });
  });

  describe('buildDateRange', () => {
    it('should return empty object for no dates', () => {
      const filters = { startDate: null, endDate: null };
      const result = buildDateRange('createdAt', filters);
      expect(result).toEqual({});
    });

    it('should build range with both start and end', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const filters = { startDate: start, endDate: end };
      const result = buildDateRange('createdAt', filters);
      
      expect(result.createdAt).toBeDefined();
      const gte = result.createdAt[Object.getOwnPropertySymbols(result.createdAt)[0]];
      const lte = result.createdAt[Object.getOwnPropertySymbols(result.createdAt)[1]];
      expect(gte).toBe(start);
      expect(lte).toBe(end);
    });

    it('should build range with only start date', () => {
      const start = new Date('2024-01-01');
      const filters = { startDate: start, endDate: null };
      const result = buildDateRange('createdAt', filters);
      
      expect(result.createdAt).toBeDefined();
      const symbols = Object.getOwnPropertySymbols(result.createdAt);
      expect(symbols.length).toBe(1);
      expect(result.createdAt[symbols[0]]).toBe(start);
    });

    it('should build range with only end date', () => {
      const end = new Date('2024-12-31');
      const filters = { startDate: null, endDate: end };
      const result = buildDateRange('createdAt', filters);
      
      expect(result.createdAt).toBeDefined();
      const symbols = Object.getOwnPropertySymbols(result.createdAt);
      expect(symbols.length).toBe(1);
      expect(result.createdAt[symbols[0]]).toBe(end);
    });
  });
});
