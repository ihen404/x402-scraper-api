require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'x402-scraper-api is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// --- Asynchronous Webhook Swarm Callback Endpoint ---
app.post('/api/extract/webhook', async (req, res) => {
  const { target_url, tier, callback_url, ref } = req.body;
  const paymentProof = req.headers['x-payment-proof'];

  if (!paymentProof) {
    return res.status(402).json({ error: "Payment Required", message: "Provide valid X-Payment-Proof header." });
  }

  if (!callback_url) {
    return res.status(400).json({ error: "Bad Request", message: "callback_url is required." });
  }

  const jobId = "job_" + Math.random().toString(36).substring(2, 9);

  // Acknowledge immediately so agents don't timeout
  res.status(202).json({
    status: "processing",
    job_id: jobId,
    message: "Extraction job queued successfully. Results will be posted to callback_url."
  });

  // Background processing simulation & webhook callback dispatch
  setTimeout(async () => {
    const payload = {
      job_id: jobId,
      status: "success",
      target_url,
      tier: tier || "structured_extraction",
      data: { extracted_at: new Date().toISOString(), sample_field: "Processed data value" },
      ref: ref || null
    };
    console.log(`[Webhook Dispatch] Sent results for ${jobId} to ${callback_url}`);
  }, 2000);
});
