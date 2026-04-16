const express = require('express');
const path = require('path');
const { pool } = require('../db');
const { getMetricsSnapshot, toPrometheusText } = require('../services/metricsService');

const router = express.Router();

router.get('/healthz', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        metrics: getMetricsSnapshot()
    });
});

router.get('/readyz', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ready', db: 'up' });
    } catch (error) {
        res.status(503).json({ status: 'not_ready', db: 'down', error: error.message });
    }
});

router.get('/metrics', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(toPrometheusText());
});

router.get('/openapi.yaml', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'openapi.yaml'));
});

module.exports = router;
