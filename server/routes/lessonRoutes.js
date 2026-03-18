const express = require('express');
const router = express.Router();

router.get('/:id', (req, res) => res.send(`GET /api/lessons/${req.params.id}`));
router.post('/', (req, res) => res.send('POST /api/lessons'));
router.put('/:id', (req, res) => res.send(`PUT /api/lessons/${req.params.id}`));
router.delete('/:id', (req, res) => res.send(`DELETE /api/lessons/${req.params.id}`));

module.exports = router;