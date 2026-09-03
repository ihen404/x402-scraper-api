const express = require('express');
const app = express();
app.use(express.json());

// Load x402 conditionally to prevent crashes if environment variables are missing
try {
  const x402 = require('@ihentrel/x402-express');
  app.use('/api/scrape', x402({
    payTo: process.env.PAYMENT_WALLET_ADDRESS || '0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28',
    price: '0.005',
    network: 'base',
    asset: 'USDC'
  }));
} catch (err) {
  console.error('Failed to initialize x402 middleware:', err.message);
}

// Scraper Endpoint
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    return res.json({ success: true, message: `Scraping initialized for ${url}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Bind to dynamic PORT assigned by Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
