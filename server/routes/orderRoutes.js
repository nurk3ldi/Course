const express = require('express');
const router = express.Router();

router.post('/', (req, res) => res.send('POST /api/orders'));
router.get('/', (req, res) => res.send('GET /api/orders'));
router.get('/:id', (req, res) => res.send(`GET /api/orders/${req.params.id}`));

module.exports = router;