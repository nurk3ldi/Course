const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.send('GET /api/courses'));
router.get('/:id', (req, res) => res.send(`GET /api/courses/${req.params.id}`));
router.post('/', (req, res) => res.send('POST /api/courses'));
router.put('/:id', (req, res) => res.send(`PUT /api/courses/${req.params.id}`));
router.delete('/:id', (req, res) => res.send(`DELETE /api/courses/${req.params.id}`));

module.exports = router;