const express = require('express');
const router = express.Router();
const ArticleController = require('../controllers/article.controller');

router.post('/', ArticleController.create);
router.get('/', ArticleController.getAll);
router.get('/:id', ArticleController.getById);
router.put('/:id', ArticleController.update);
router.delete('/:id', ArticleController.delete);

module.exports = router;
