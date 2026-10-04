const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/category.controller');

router.get('/', CategoryController.getAll);
router.post('/', CategoryController.create);
router.delete('/:id', CategoryController.delete);

module.exports = router;
