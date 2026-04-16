const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');
const { videoRateLimitMiddleware } = require('../middlewares/videoRateLimitMiddleware');
const { getLessonVideoUrl, streamVideoAsset } = require('../controllers/videoController');

router.get('/:lessonId/url', authMiddleware, allowRoles('admin', 'employee', 'student'), getLessonVideoUrl);
router.get('/stream/:lessonId/:asset', videoRateLimitMiddleware, streamVideoAsset);

module.exports = router;
