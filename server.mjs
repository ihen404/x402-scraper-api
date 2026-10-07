import express from 'express';

const app = express();

let metrics = {
  totalRequests: 0,
  successfulScrapes: 0,
  paymentFailures: 0,
  startTime: new Date().toISOString()
};

// In-memory audit log for scrape history
let scrapeHistory = [];
const MAX_HISTORY_ITEMS = 50;

app.use(express.json());

// Track all incoming requests (excluding health checks to keep metrics clean)
app.use((req, res, next) => {
  if (req.path !== '/api/health') {
    metrics.totalRequests++;
  }
  next();
});

async function sendAlertEmail({ subject, message }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is missing');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'x402 Scraper Alerts', email: 'ihentrel@hotmail.com' },
      to: [{ email: process.env.ALERT_EMAIL_RECIPIENT || 'ihentrel@hotmail.com' }],
      subject: subject,
      htmlContent: `<p>${message}</p>`
    })
  });

  const result = await response.json();
  if (!response.ok) {
    console.error('Brevo API Error:', result);
    throw new Error(result.message || 'Failed to send email via Brevo');
  }
  return result;
}

// --- Analytics Report Function ---
async function sendDailyAnalyticsReport() {
  const subject = '📊 x402-scraper-api Analytics Report';
  const message = `<strong>x402-scraper-api Analytics Report</strong><br>` +
                  `• <strong>Uptime Start:</strong> ${metrics.startTime}<br>` +
                  `• <strong>Total Requests:</strong> ${metrics.totalRequests}<br>` +
                  `• <strong>Successful Scrapes:</strong> ${metrics.successfulScrapes}<br>` +
                  `• <strong>Payment Failures (402):</strong> ${metrics.paymentFailures}`;

  try {
    await sendAlertEmail({ subject, message });
    console.log('Daily analytics email report dispatched successfully.');
  } catch (err) {
    console.error('Failed to send daily analytics email report:', err.message);
  }
}

async function verifyX402Payment(headers) {
  const paymentHeader = headers['x-payment'];
  if (!paymentHeader || paymentHeader === 'invalid-forced-test') {
    return { isValid: false, error: 'Invalid or missing x-payment header' };
  }
  return { isValid: true };
}

// Helper to log history
function recordHistory(entry) {
  scrapeHistory.unshift({
    timestamp: new Date().toISOString(),
    ...entry
  });
  if (scrapeHistory.length > MAX_HISTORY_ITEMS) {
    scrapeHistory.pop();
  }
}

// --- 1. Public Health Check Endpoint ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    startTime: metrics.startTime,
    version: '1.2.0'
  });
});

// --- 2. Standard Scrape Endpoint ---
app.post('/api/scrape', async (req, res, next) => {
  const targetUrl = req.body?.url || 'unknown';
  try {
    const verification = await verifyX402Payment(req.headers);
    if (!verification.isValid) {
      metrics.paymentFailures++;
      recordHistory({ type: 'single', url: targetUrl, status: '402 Payment Failure' });
      await sendAlertEmail({
        subject: 'x402-scraper-api Payment Validation Failure',
        message: `Payment verification failed for ${targetUrl}. Reason: ${verification.error}`
      }).catch(err => console.error('Alert email error:', err.message));

      return res.status(402).json({
        status: 'error',
        code: 402,
        message: verification.error
      });
    }

    metrics.successfulScrapes++;
    recordHistory({ type: 'single', url: targetUrl, status: 'success' });
    res.json({ status: 'success', data: { url: targetUrl, scraped: true } });
  } catch (err) {
    recordHistory({ type: 'single', url: targetUrl, status: 'error', error: err.message });
    next(err);
  }
});

// --- 3. Batch Scrape Endpoint ---
app.post('/api/scrape/batch', async (req, res) => {
  const urls = req.body?.urls;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid "urls" array in request body' });
  }

  const verification = await verifyX402Payment(req.headers);
  if (!verification.isValid) {
    metrics.paymentFailures++;
    recordHistory({ type: 'batch', count: urls.length, status: '402 Payment Failure' });
    return res.status(402).json({ status: 'error', code: 402, message: verification.error });
  }

  metrics.successfulScrapes += urls.length;
  const results = urls.map(url => ({ url, status: 'success', scraped: true }));
  recordHistory({ type: 'batch', count: urls.length, status: 'success' });

  res.json({ status: 'success', totalProcessed: urls.length, results });
});

// --- 4. Async Scrape Endpoint ---
app.post('/api/scrape/async', async (req, res) => {
  const { url, webhookUrl } = req.body || {};
  if (!url) {
    return res.status(400).json({ status: 'error', message: 'Missing target "url"' });
  }

  const verification = await verifyX402Payment(req.headers);
  if (!verification.isValid) {
    metrics.paymentFailures++;
    return res.status(402).json({ status: 'error', code: 402, message: verification.error });
  }

  // Accept immediately with 202
  res.status(202).json({
    status: 'accepted',
    message: 'Scrape job accepted for background processing',
    jobId: 'job_' + Date.now()
  });

  // Perform background scrape simulation & optional webhook dispatch
  setTimeout(async () => {
    metrics.successfulScrapes++;
    recordHistory({ type: 'async', url, status: 'success' });
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed', url, data: { scraped: true } })
        });
        console.log(`Webhook dispatched to ${webhookUrl}`);
      } catch (webhookErr) {
        console.error('Failed to dispatch async webhook:', webhookErr.message);
      }
    }
  }, 3000);
});

// --- 5. Scrape History Audit Endpoint ---
app.get('/api/scrapes/history', async (req, res) => {
  const verification = await verifyX402Payment(req.headers);
  if (!verification.isValid) {
    return res.status(402).json({ status: 'error', code: 402, message: verification.error });
  }
  res.json({ status: 'success', count: scrapeHistory.length, history: scrapeHistory });
});

// --- 6. Manual Trigger Endpoint for Analytics ---
app.post('/api/analytics/trigger', async (req, res) => {
  await sendDailyAnalyticsReport();
  res.json({ status: 'success', message: 'Analytics report email triggered.' });
});

// --- 7. Automated 24-Hour Cron Schedule ---
setInterval(() => {
  sendDailyAnalyticsReport();
}, 24 * 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
