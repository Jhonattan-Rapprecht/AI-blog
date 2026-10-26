const express = require('express');
const router = express.Router();
const MediaController = require('../controllers/media.controller');

router.get('/', MediaController.list);
router.post('/upload', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], limit: '12mb' }), MediaController.upload);
router.put('/:id', MediaController.update);
router.delete('/:id', MediaController.remove);

module.exports = router;
