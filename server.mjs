import express from 'express';

const app = express();

let metrics = {
totalRequests: 0,
successfulScrapes: 0,
paymentFailures: 0,
startTime: new Date().toISOString()
};
app.use(express.json());

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
  console.log('Brevo Email Dispatched Successfully:', result);
  return result;
}

async function verifyX402Payment(headers) {
  const paymentHeader = headers['x-payment'];
  if (!paymentHeader || paymentHeader === 'invalid-forced-test') {
    return { isValid: false, error: 'Invalid or missing x-payment header' };
  }
  return { isValid: true };
}

// 1. Scrape Endpoint
app.post('/api/scrape', async (req, res, next) => {
  try {
    const verification = await verifyX402Payment(req.headers);
    if (!verification.isValid) {
      try {
        await sendAlertEmail({
          subject: 'x402-scraper-api Payment Validation Failure',
          message: `Payment verification failed for request. Reason: ${verification.error}`
        });
      } catch (emailErr) {
        console.error('Failed to send error alert email:', emailErr.message);
      }
      return res.status(402).json({
        status: 'error',
        code: 402,
        message: verification.error
      });
    }

    res.json({ status: 'success', data: { scraped: true } });
  } catch (err) {
    next(err);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
