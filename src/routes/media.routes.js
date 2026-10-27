const express = require('express');
const router = express.Router();
const MediaController = require('../controllers/media.controller');

router.get('/', MediaController.list);
router.post('/upload', express.raw({ type: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'], limit: '200mb' }), MediaController.upload);
router.post('/video-link', MediaController.addVideoLink);
router.put('/:id', MediaController.update);
router.delete('/:id', MediaController.remove);

module.exports = router;
