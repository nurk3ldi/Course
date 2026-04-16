const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');
const { fileUpload } = require('../middlewares/uploadMiddleware');
const {
    uploadFile,
    getFileById,
    deleteFile
} = require('../controllers/fileController');

router.post(
    '/upload',
    authMiddleware,
    allowRoles('admin', 'employee', 'student'),
    fileUpload.single('file'),
    uploadFile
);
router.get('/:id', authMiddleware, allowRoles('admin', 'employee', 'student'), getFileById);
router.delete('/:id', authMiddleware, allowRoles('admin', 'employee', 'student'), deleteFile);

module.exports = router;
