const metrics = {
    startedAt: Date.now(),
    requestsTotal: 0,
    requestDurationMsTotal: 0,
    statusCounts: new Map(),
    routeCounts: new Map(),
    lastErrors: [],
    alertSentAt: 0
};

const ALERT_WINDOW_MS = Number(process.env.ALERT_WINDOW_MS || 5 * 60 * 1000);
const ALERT_THRESHOLD_5XX = Number(process.env.ALERT_THRESHOLD_5XX || 25);
const ALERT_COOLDOWN_MS = Number(process.env.ALERT_COOLDOWN_MS || 10 * 60 * 1000);

const normalizeRoute = (url = '') => {
    return url
        .split('?')[0]
        .replace(/\/\d+/g, '/:id')
        .replace(/[0-9a-f]{8}-[0-9a-f-]{27,36}/gi, ':uuid');
};

const trackRequest = ({ method, path, statusCode, durationMs }) => {
    const routeKey = `${method.toUpperCase()} ${normalizeRoute(path)}`;
    metrics.requestsTotal += 1;
    metrics.requestDurationMsTotal += Number(durationMs) || 0;
    metrics.statusCounts.set(String(statusCode), (metrics.statusCounts.get(String(statusCode)) || 0) + 1);
    metrics.routeCounts.set(routeKey, (metrics.routeCounts.get(routeKey) || 0) + 1);

    if (statusCode >= 500) {
        metrics.lastErrors.push(Date.now());
    }
};

const trackProcessError = (label, error) => {
    const message = error?.stack || error?.message || String(error);
    console.error(`[process-error] ${label}:`, message);
    metrics.lastErrors.push(Date.now());
};

const cleanupErrorWindow = () => {
    const cutoff = Date.now() - ALERT_WINDOW_MS;
    metrics.lastErrors = metrics.lastErrors.filter((ts) => ts >= cutoff);
};

const maybeAlert = async () => {
    cleanupErrorWindow();
    if (metrics.lastErrors.length < ALERT_THRESHOLD_5XX) return;
    if (Date.now() - metrics.alertSentAt < ALERT_COOLDOWN_MS) return;

    metrics.alertSentAt = Date.now();
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    const payload = {
        level: 'critical',
        message: 'High server error rate detected',
        errors_in_window: metrics.lastErrors.length,
        window_ms: ALERT_WINDOW_MS,
        at: new Date().toISOString()
    };

    console.error('[ALERT]', payload);

    if (webhookUrl) {
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Failed to send alert webhook:', error.message);
        }
    }
};

const getMetricsSnapshot = () => {
    cleanupErrorWindow();
    return {
        uptime_seconds: Math.floor((Date.now() - metrics.startedAt) / 1000),
        requests_total: metrics.requestsTotal,
        request_duration_ms_total: metrics.requestDurationMsTotal,
        status_counts: Object.fromEntries(metrics.statusCounts.entries()),
        route_counts: Object.fromEntries(metrics.routeCounts.entries()),
        errors_last_window: metrics.lastErrors.length
    };
};

const toPrometheusText = () => {
    const snapshot = getMetricsSnapshot();
    const lines = [
        '# HELP lms_uptime_seconds Uptime in seconds',
        '# TYPE lms_uptime_seconds gauge',
        `lms_uptime_seconds ${snapshot.uptime_seconds}`,
        '# HELP lms_requests_total Total HTTP requests',
        '# TYPE lms_requests_total counter',
        `lms_requests_total ${snapshot.requests_total}`,
        '# HELP lms_request_duration_ms_total Sum of request durations',
        '# TYPE lms_request_duration_ms_total counter',
        `lms_request_duration_ms_total ${snapshot.request_duration_ms_total}`,
        '# HELP lms_errors_window_total 5xx and process errors in alert window',
        '# TYPE lms_errors_window_total gauge',
        `lms_errors_window_total ${snapshot.errors_last_window}`
    ];

    for (const [status, count] of Object.entries(snapshot.status_counts)) {
        lines.push(`lms_requests_by_status_total{status="${status}"} ${count}`);
    }
    return `${lines.join('\n')}\n`;
};

module.exports = {
    trackRequest,
    trackProcessError,
    maybeAlert,
    getMetricsSnapshot,
    toPrometheusText
};
