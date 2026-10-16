import express from 'express';

const router = express.Router();

router.get('/capabilities', (req, res) => {
  res.json({
    service: "x402 Scraper & Extraction M2M Utility",
    version: "1.2.0",
    network: "eip155:8453",
    payout_address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    pricing: {
      standard_scrape_usdc: 0.01,
      cached_scrape_usdc: 0.0025,
      affiliate_rebate_pct: 10
    },
    caching: {
      enabled: true,
      ttl_seconds: 900
    },
    features: [
      "real-time-base-usdc-settlement",
      "prepaid-credit-api-keys",
      "affiliate-rebate-routing",
      "async-webhook-notifications",
      "in-memory-swarm-caching"
    ],
    endpoints: {
      openapi_spec: "/api/openapi.json",
      extract_sync: "/api/extract",
      extract_async: "/api/extract/webhook",
      credits_deposit: "/api/credits/deposit"
    }
  });
});

router.get('/openapi.json', (req, res) => {
  res.json({
    openapi: "3.1.0",
    info: {
      title: "x402 Scraper M2M API",
      version: "1.2.0",
      description: "Autonomous Web Scraping Utility with Base Mainnet USDC Settlement & Webhook Processing"
    },
    servers: [{ url: "https://x402-scraper-api.up.railway.app" }],
    paths: {
      "/api/extract": {
        post: {
          summary: "Synchronous URL Scraping",
          description: "Extract structured data or raw HTML from a target URL. Requires x402 payment proof or valid pre-paid API key.",
          parameters: [
            { in: "header", name: "X-Payment-Signature", required: false, schema: { type: "string" } },
            { in: "header", name: "X-Api-Key", required: false, schema: { type: "string" } },
            { in: "header", name: "ref", required: false, schema: { type: "string", description: "Affiliate wallet address for 10% rebate" } }
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { url: { type: "string", format: "uri" } },
                  required: ["url"]
                }
              }
            }
          },
          responses: {
            "200": { description: "Successful Scraping Extraction" },
            "402": { description: "Payment Required - Includes x402 challenge parameters" }
          }
        }
      }
    }
  });
});

export default router;
