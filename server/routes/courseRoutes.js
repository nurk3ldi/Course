const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// --- СПЕЦИФИЧНЫЕ ГЕТ РОУТЫ (выше, чтобы не конфликтовать) ---
router.get('/my', authMiddleware, courseController.getMyCourses);
router.get('/:id/full', authMiddleware, courseController.getFullCourseData);
router.get('/:id/videos', authMiddleware, courseController.getCourseVideos);

// --- ОБЩИЕ ГЕТ РОУТЫ ---
router.get('/', authMiddleware, courseController.getAllCourses);

// --- СПЕЦИФИЧНЫЕ POST РОУТЫ (выше общих) ---
router.post('/add-video', authMiddleware, courseController.addVideo);
router.post('/add-assignment', authMiddleware, courseController.addAssignment);
router.post('/grant-access', authMiddleware, courseController.grantAccess);

// --- ОБЩИЕ POST РОУТЫ ---
router.post('/', authMiddleware, courseController.createCourse);
router.post('/:courseId/modules', authMiddleware, courseController.createModule);
router.post('/:courseId/modules/:moduleId/lessons', authMiddleware, courseController.addLessonToModule);

// --- PUT И DELETE РОУТЫ ---
router.put('/:id', authMiddleware, courseController.updateCourse);
router.delete('/:id', authMiddleware, courseController.deleteCourse);

module.exports = router;