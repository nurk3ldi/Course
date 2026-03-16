const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
    createCourse, getAllCourses, updateCourse, deleteCourse,
    addVideo, updateVideo, deleteVideo, 
    grantAccess, revokeAccess, getMyCourses, getCourseVideos 
} = require('../controllers/courseController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const router = express.Router();

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage });

router.get('/all', verifyToken, verifyAdmin, getAllCourses);
router.post('/create', verifyToken, verifyAdmin, createCourse);
router.put('/:id', verifyToken, verifyAdmin, updateCourse);
router.delete('/:id', verifyToken, verifyAdmin, deleteCourse);

router.post('/add-video', verifyToken, verifyAdmin, upload.single('video'), addVideo);
router.put('/video/:id', verifyToken, verifyAdmin, updateVideo);
router.delete('/video/:id', verifyToken, verifyAdmin, deleteVideo);

router.post('/grant-access', verifyToken, verifyAdmin, grantAccess);
router.delete('/revoke-access', verifyToken, verifyAdmin, revokeAccess);

router.get('/my-courses', verifyToken, getMyCourses);
router.get('/:courseId/videos', verifyToken, getCourseVideos);

module.exports = router;