const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const assignmentController = require('../controllers/assignmentController');

router.post('/submit', authMiddleware, assignmentController.submitAssignment);
router.get('/:assignmentId/submissions', authMiddleware, adminMiddleware, assignmentController.getAssignmentSubmissions);
router.put('/submissions/:submissionId/review', authMiddleware, adminMiddleware, assignmentController.reviewSubmission);
router.get('/my', authMiddleware, assignmentController.getMySubmissions);

module.exports = router;