const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');
const {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus
} = require('../controllers/orderController');

router.post('/', authMiddleware, allowRoles('admin', 'client'), createOrder);
router.get('/', authMiddleware, allowRoles('admin', 'client'), getOrders);
router.get('/:id', authMiddleware, allowRoles('admin', 'client'), getOrderById);
router.put('/:id/status', authMiddleware, allowRoles('admin'), updateOrderStatus);

module.exports = router;
