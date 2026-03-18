const express = require('express');
const router = express.Router();

router.post('/', (req, res) => res.send('POST /api/assignments'));
router.get('/:id', (req, res) => res.send(`GET /api/assignments/${req.params.id}`));
router.post('/submit', (req, res) => res.send('POST /api/assignments/submit'));
router.put('/review', (req, res) => res.send('PUT /api/assignments/review'));

module.exports = router;