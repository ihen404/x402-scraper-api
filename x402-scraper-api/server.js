try { require('dotenv').config(); } catch (e) {}

const express = require('express');
const x402 = require('@ihentrel/x402-express');
const puppeteer = require('puppeteer-core');
const TurndownService = require('turndown');

const app = express();
app.use(express.json());

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

app.use('/api/scrape', x402({
  payTo: process.env.PAYMENT_WALLET_ADDRESS || '0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28',
  price: '0.005',
  network: 'base',
  asset: 'USDC'
}));

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
