const express = require('express');
const router = express.Router();
const { scrapeCalendlyData } = require('../controllers/calendlyController');

router.get('/scrape/:calendlyLink', scrapeCalendlyData)
module.exports = router;