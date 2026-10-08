import express from "express";
import { calculateDynamicPricing } from "./dynamic-pricing-middleware.mjs";

const app = express();
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "healthy", time: Date.now() }));

app.post("/api/scrape", async (req, res) => {
  const paymentHeader = req.headers["x-payment"] || req.headers["payment-signature"];
  if (!paymentHeader || paymentHeader === "invalid-forced-test") {
    const pricingChallenge = calculateDynamicPricing(req.body);
    res.setHeader("PAYMENT-REQUIRED", JSON.stringify(pricingChallenge));
    return res.status(402).json({ error: "Payment Required", details: pricingChallenge });
  }
  const isHeadless = req.body.renderJs === true || req.body.complexity === "high";
  return res.json({
    status: "success",
    tier: isHeadless ? "headless-spa-render" : "standard-html-fetch",
    data: { url: req.body.url, scraped: true, renderedWithHeadless: isHeadless, time: Date.now() }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("x402 Scraper API running on port " + PORT));
// cache-bust: 1791424276777
