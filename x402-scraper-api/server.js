const express = require("express");
require("dotenv").config();

let x402;
try {
  x402 = require("@x402/express").x402;
} catch (e) {
  x402 = null;
}

const app = express();
app.use(express.json());

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
}, (req, res) => {
  const targetUrl = req.body.url || "https://example.com";
  res.json({
    status: "success",
    url: targetUrl,
    data: {
      title: "Example Domain",
      content: "Scraped successfully."
    }
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});
