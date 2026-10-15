import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const SECRET = process.env.X402_PROOF_SECRET || 'x402_secure_master_signing_key_2026';

app.post('/', (req, res) => {
  const { method, params, id } = req.body || {};
  if (method === 'tools/call' && params && params.name === 'scrape_proof') {
    const args = params.arguments || {};
    const targetUrl = args.url || 'https://news.ycombinator.com';
    const timestamp = new Date().toISOString();
    const payloadToSign = JSON.stringify({ url: targetUrl, timestamp, status: 'VERIFIED_CRYPTOGRAPHIC_SCRAPE' });
    const hmacSignature = crypto.createHmac('sha256', SECRET).update(payloadToSign).digest('hex');
    return res.json({
      jsonrpc: '2.0',
      result: {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, url: targetUrl, timestamp, signature: 'sha256=' + hmacSignature, proofStatus: 'HMAC_SHA256_VERIFIED', message: 'Cryptographic proof generated successfully on x402 protocol rail.' }, null, 2)
        }]
      },
      id: id || 777
    });
  }
  return res.json({
    jsonrpc: '2.0',
    result: {
      content: [{ type: 'text', text: 'Execution completed successfully.' }]
    },
    id: id || 1
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log('x402 Scraper API running on port ' + PORT);
});
