const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');

router.get('/my', authMiddleware, allowRoles('admin', 'employee', 'student'), courseController.getMyCourses);
router.get('/:id/full', authMiddleware, allowRoles('admin', 'employee', 'student'), courseController.getFullCourseData);
router.get('/:id/videos', authMiddleware, allowRoles('admin', 'employee', 'student'), courseController.getCourseVideos);
router.get('/', authMiddleware, allowRoles('admin', 'employee', 'client', 'student'), courseController.getAllCourses);
router.get('/:id', authMiddleware, allowRoles('admin', 'employee', 'client', 'student'), courseController.getCourseById);

router.post('/add-video', authMiddleware, allowRoles('admin'), courseController.addVideo);
router.post('/add-assignment', authMiddleware, allowRoles('admin'), courseController.addAssignment);
router.post('/grant-access', authMiddleware, allowRoles('admin'), courseController.grantAccess);

router.post('/', authMiddleware, allowRoles('admin'), courseController.createCourse);
router.post('/:courseId/modules', authMiddleware, allowRoles('admin'), courseController.createModule);
router.post('/:courseId/modules/:moduleId/lessons', authMiddleware, allowRoles('admin'), courseController.addLessonToModule);

router.put('/:id', authMiddleware, allowRoles('admin'), courseController.updateCourse);
router.delete('/:id', authMiddleware, allowRoles('admin'), courseController.deleteCourse);

module.exports = router;
