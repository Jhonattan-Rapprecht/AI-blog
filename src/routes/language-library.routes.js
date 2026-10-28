const express = require('express');
const LanguageLibraryController = require('../controllers/language-library.controller');

const router = express.Router();

router.get('/catalog', LanguageLibraryController.getCatalog);

module.exports = router;
