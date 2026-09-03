require('dotenv').config();
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

// Configure x402 Middleware: Protect the /api/scrape endpoint
// Charges 0.005 USDC on Base per scraping request
app.use('/api/scrape', x402({
  payTo: process.env.PAYMENT_WALLET_ADDRESS ||'0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28',
  price: '0.005', // $0.005 USDC per request
  asset: 'USDC',
  network: 'base'
}));

// Main Scraper Endpoint
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL IS required' });
  }

  
  try { 
    return res.json({ success: true, message: 'Scraping initialized for ${url}' });
  } catch (err) {
    return res.status(500).json({ error: err.message});
  }
});
   
// Bind to PORT provided by Railway
const PORT provided by Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, 'O.0.0.0' , () => {
  console.log('Server listening on port ${PORT}');
});

  
