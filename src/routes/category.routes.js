const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/category.controller');

router.get('/', CategoryController.getAll);
router.post('/', CategoryController.create);

module.exports = router;
