const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateReport, ALL } = require('../services/reports');
const { parseFilters } = require('../services/reports/filters');

const router = express.Router();

router.get('/', auth, asyncHandler(async (req, res) => {
  const reports = ALL.map((def) => ({
    id: def.id,
    name: def.name,
    columns: def.columns.map((col) => ({
      key: col.key,
      header: col.header,
    })),
  }));

  res.json({ reports });
}));

router.get('/:id', auth, requireRole(['admin', 'manager']), asyncHandler(async (req, res) => {
  const reportId = req.params.id;
  const format = req.query.format || 'excel';
  const filters = parseFilters(req.query);

  await generateReport({
    reportId,
    format,
    filters,
    res,
  });
}));

module.exports = router;
