require('../../setup-env');
const { ALL, BY_ID, _internal } = require('../../../backend/services/reports/definitions');

describe('Report Definitions', () => {
  it('should have 6 report definitions', () => {
    expect(ALL).toHaveLength(6);
  });

  it('should have unique report IDs', () => {
    const ids = ALL.map((def) => def.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have all required properties for each report', () => {
    ALL.forEach((def) => {
      expect(def.id).toBeTruthy();
      expect(typeof def.name).toBe('string');
      expect(Array.isArray(def.columns)).toBe(true);
      expect(def.columns.length).toBeGreaterThan(0);
      expect(typeof def.fetchRows).toBe('function');
      expect(def.mapRow || def.expand).toBeTruthy();
    });
  });

  it('should have all reports accessible by ID', () => {
    const expectedIds = ['inventory', 'transactions', 'stocktake', 'supplier', 'low-stock', 'operation-log'];
    expectedIds.forEach((id) => {
      expect(BY_ID[id]).toBeDefined();
      expect(BY_ID[id].id).toBe(id);
    });
  });

  describe('Internal helpers', () => {
    it('formatDate should format valid dates', () => {
      const date = new Date('2024-01-15T10:30:45');
      const result = _internal.formatDate(date);
      expect(result).toMatch(/2024-01-15 \d{2}:\d{2}:\d{2}/);
    });

    it('formatDate should return empty string for invalid dates', () => {
      expect(_internal.formatDate(null)).toBe('');
      expect(_internal.formatDate(undefined)).toBe('');
      expect(_internal.formatDate(new Date('invalid'))).toBe('');
    });

    it('safe should return value if not null/undefined', () => {
      expect(_internal.safe('test')).toBe('test');
      expect(_internal.safe(0)).toBe(0);
      expect(_internal.safe(false)).toBe(false);
    });

    it('safe should return fallback for null/undefined', () => {
      expect(_internal.safe(null)).toBe('');
      expect(_internal.safe(undefined)).toBe('');
      expect(_internal.safe(null, 'default')).toBe('default');
    });
  });
});
