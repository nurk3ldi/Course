const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { allowRoles } = require('../middlewares/roleMiddleware');
const {
    createPayment,
    listPayments,
    getPaymentById,
    updatePayment
} = require('../controllers/paymentController');

router.post('/', authMiddleware, allowRoles('admin', 'client'), createPayment);
router.get('/', authMiddleware, allowRoles('admin', 'client'), listPayments);
router.get('/:id', authMiddleware, allowRoles('admin', 'client'), getPaymentById);
router.put('/:id', authMiddleware, allowRoles('admin'), updatePayment);

module.exports = router;
