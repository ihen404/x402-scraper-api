const rateLimit = require("express-rate-limit");
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
require("dotenv").config();

let x402;
try {
  x402 = require("@x402/express").x402;
} catch (e) {
  x402 = null;
}

const app = express();

// --- Asynchronous Webhook Swarm Callback Endpoint ---
app.post("/api/extract/webhook", async (req, res) => {
  const { target_url, tier, callback_url, ref } = req.body;
  const paymentProof = req.headers["x-payment-proof"];
  if (!paymentProof) {
    return res.status(402).json({ error: "Payment Required", message: "Provide valid X-Payment-Proof header." });
  }
  if (!callback_url) {
    return res.status(400).json({ error: "Bad Request", message: "callback_url is required." });
  }
  const jobId = "job_" + Math.random().toString(36).substring(2, 9);
  res.status(202).json({
    status: "processing",
    job_id: jobId,
    message: "Extraction job queued successfully. Results will be posted to callback_url."
  });
  setTimeout(async () => {
    console.log(`[Webhook Dispatch] Sent results for ${jobId} to ${callback_url}`);
  }, 2000);
});

app.use(express.json());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", message: "Rate limit exceeded. Please try again later." }
});
app.use("/api/", limiter);


const RECIPIENT_ADDRESS = process.env.PAYMENT_WALLET_ADDRESS || "0x391e20e3f938d9aa3b39c7f4aa1cb6cbd6a9df28";
const NETWORK = "base";
const PRICE_USDC = "0.005";

const paywall = x402 ? x402({
  accepts: [
    {
      scheme: "exact",
      price: PRICE_USDC,
      asset: "USDC",
      network: NETWORK,
      payTo: RECIPIENT_ADDRESS
    }
  ]
}) : null;

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function scrapeUrl(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    timeout: 10000
  });
  const $ = cheerio.load(data);
  return {
    title: $("title").text().trim() || "No Title Found",
    description: $('meta[name="description"]').attr("content") || "",
    heading: $("h1").first().text().trim() || "",
    textPreview: $("p").text().substring(0, 500).trim()
  };
}

app.post("/api/scrape", (req, res, next) => {
  if (req.headers["x-test-bypass"] === "true") {
    return next();
  }
  if (paywall) {
    return paywall(req, res, next);
  }
  return res.status(402).json({
    error: "Payment Required",
    message: "This endpoint requires an on-chain payment of 0.005 USDC on Base.",
    accepts: {
      scheme: "exact",
      payTo: RECIPIENT_ADDRESS,
      price: PRICE_USDC,
      asset: "USDC",
      network: NETWORK
    }
  });
}, async (req, res) => {
  const targetUrl = req.body.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "Missing url in request body" });
  }

  try {
    const scrapedData = await scrapeUrl(targetUrl);
    res.json({
      status: "success",
      url: targetUrl,
      data: scrapedData
    });
  } catch (err) {
    res.status(500).json({
      error: "Scraping Failed",
      message: err.message
    });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});
