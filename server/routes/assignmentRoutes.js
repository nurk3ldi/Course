const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');
const assignmentController = require('../controllers/assignmentController');

router.post('/submit', authMiddleware, allowRoles('student'), assignmentController.submitAssignment);
router.put('/review', authMiddleware, allowRoles('admin', 'employee'), assignmentController.reviewSubmission);
router.get('/my', authMiddleware, allowRoles('student'), assignmentController.getMySubmissions);

router.get('/:assignmentId/submissions', authMiddleware, allowRoles('admin', 'employee'), assignmentController.getAssignmentSubmissions);
router.put('/submissions/:submissionId/review', authMiddleware, allowRoles('admin', 'employee'), assignmentController.reviewSubmission);

router.post('/', authMiddleware, allowRoles('admin'), assignmentController.createAssignment);
router.get('/:id', authMiddleware, allowRoles('admin', 'employee', 'student'), assignmentController.getAssignmentById);

module.exports = router;
