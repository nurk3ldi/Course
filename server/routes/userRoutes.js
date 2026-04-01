const express = require('express');
const { getAllUsers } = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const router = express.Router();

router.get('/', authMiddleware, adminMiddleware, getAllUsers);

module.exports = router;