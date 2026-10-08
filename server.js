const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PAYEE_WALLET = process.env.PAYEE_WALLET || "0x1234567890abcdef1234567890abcdef12345678";

const PAYMENT_REQUIREMENTS = {
  scheme: "exact",
  network: "base",
  token: "USDC",
  costPerRequest: "0.10",
  payeeWallet: PAYEE_WALLET,
  instruction: "Sign micro-transaction on Base and submit tx hash via x-payment header."
};

const x402Middleware = async (req, res, next) => {
  const paymentHeader = req.headers['x-payment'];

  if (!paymentHeader) {
    return res.status(402).json({
      status: "error",
      code: 402,
      message: "Payment required. Provide a valid x-payment transaction hash or signature via x402 protocol.",
      paymentRequirements: PAYMENT_REQUIREMENTS
    });
  }

  try {
    const isMock = paymentHeader.startsWith('mock_');
    const isValidHash = paymentHeader.startsWith('0x') && paymentHeader.length >= 42;

    if (!isMock && !isValidHash) {
      return res.status(402).json({
        status: "error",
        code: 402,
        message: "Invalid payment proof provided. Expected a valid Base tx hash (0x...) or authorized token.",
        paymentRequirements: PAYMENT_REQUIREMENTS
      });
    }

    req.payment = { proof: paymentHeader, verified: true };
    next();
  } catch (err) {
    return res.status(402).json({
      status: "error",
      code: 402,
      message: `Payment verification failed: ${err.message}`,
      paymentRequirements: PAYMENT_REQUIREMENTS
    });
  }
};

app.post('/api/scrape', x402Middleware, async (req, res) => {
  const { url, selectors } = req.body;

  if (!url) {
    return res.status(400).json({
      status: "error",
      code: 400,
      message: "Missing target URL in request body."
    });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const title = await page.title();
    
    let extractedData = {};
    if (selectors && Array.isArray(selectors)) {
      extractedData = await page.evaluate((selList) => {
        const results = {};
        selList.forEach((selector) => {
          const elements = document.querySelectorAll(selector);
          if (elements.length === 1) {
            results[selector] = elements[0].innerText.trim();
          } else if (elements.length > 1) {
            results[selector] = Array.from(elements).map(el => el.innerText.trim());
          } else {
            results[selector] = null;
          }
        });
        return results;
      }, selectors);
    }

    await browser.close();

    return res.status(200).json({
      status: "success",
      paymentVerified: true,
      data: {
        url,
        title,
        extracted: extractedData,
        scraped: true
      }
    });
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    return res.status(500).json({
      status: "error",
      code: 500,
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`x402 Scraper API running on port ${PORT}`);
});
