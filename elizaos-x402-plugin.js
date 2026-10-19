/**
 * ElizaOS x402 Scraper Plugin
 * Allows ElizaOS characters to autonomously scrape web URLs via x402 micropayments.
 */
import fetch from "node-fetch";

export const x402ScraperAction = {
  name: "SCRAPE_WEB_X402",
  description: "Scrapes a URL using x402 HTTP micropayments ($0.01 USDC on Solana or Base).",
  similes: ["FETCH_URL", "WEB_SCRAPE", "GET_PAGE_DATA"],
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Scrape https://example.com for me." }
      },
      {
        user: "{{agent}}",
        content: { text: "I will fetch that page using the x402 scraper gateway.", action: "SCRAPE_WEB_X402" }
      }
    ]
  ],
  validate: async (runtime, message) => true,
  handler: async (runtime, message, state, options, callback) => {
    try {
      const urlMatch = message.content.text.match(/https?:\/\/[^\s]+/);
      if (!urlMatch) {
        callback({ text: "Please provide a valid URL to scrape." });
        return false;
      }
      const targetUrl = urlMatch[0];
      const gatewayUrl = "https://x402-scraper-api-production-67a4.up.railway.app/mcp";

      const res = await fetch(gatewayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "scrape_basic", params: { url: targetUrl }, id: 1 })
      });

      if (res.status === 402) {
        callback({
          text: "🔒 x402 Payment Required ($0.01 USDC). Payment challenge received for " + targetUrl + "."
        });
        return true;
      }

      const data = await res.json();
      callback({ text: "✅ Scrape successful: " + JSON.stringify(data).slice(0, 300) + "..." });
      return true;
    } catch (error) {
      callback({ text: "❌ Scrape failed: " + error.message });
      return false;
    }
  }
};

export const x402Plugin = {
  name: "x402-scraper",
  description: "Autonomous x402 micro-payment web scraping plugin for ElizaOS",
  actions: [x402ScraperAction],
  providers: [],
  evaluators: []
};

export default x402Plugin;
