const express = require('express');
const { getAllUsers } = require('../controllers/userController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/', verifyToken, verifyAdmin, getAllUsers);

module.exports = router;