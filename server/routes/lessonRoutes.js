const express = require('express');
const router = express.Router();
const {
    getLessonById,
    createLesson,
    updateLesson,
    uploadLessonVideo,
    deleteLesson
} = require('../controllers/lessonController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');
const { videoUpload } = require('../middlewares/uploadMiddleware');

router.get('/:id', authMiddleware, allowRoles('admin', 'employee', 'student'), getLessonById);
router.post('/', authMiddleware, allowRoles('admin'), videoUpload.single('video'), createLesson);
router.put('/:id', authMiddleware, allowRoles('admin'), videoUpload.single('video'), updateLesson);
router.post('/:id/video', authMiddleware, allowRoles('admin'), videoUpload.single('video'), uploadLessonVideo);
router.delete('/:id', authMiddleware, allowRoles('admin'), deleteLesson);

module.exports = router;
