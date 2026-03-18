const express = require('express');
const router = express.Router();

router.post('/upload', (req, res) => res.send('POST /api/files/upload'));
router.get('/:id', (req, res) => res.send(`GET /api/files/${req.params.id}`));
router.delete('/:id', (req, res) => res.send(`DELETE /api/files/${req.params.id}`));

module.exports = router;