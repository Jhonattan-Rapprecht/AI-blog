const express = require('express');
const LanguageReferenceController = require('../controllers/language-reference.controller');

const router = express.Router();
router.get('/', LanguageReferenceController.list);
router.post('/', LanguageReferenceController.create);
router.put('/:id', LanguageReferenceController.update);
router.delete('/:id', LanguageReferenceController.remove);

module.exports = router;
