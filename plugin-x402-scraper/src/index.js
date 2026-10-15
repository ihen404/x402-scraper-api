// ElizaOS Action for x402 Scraper API
export const x402ScraperAction = {
  name: "X402_SCRAPE_WEB",
  similes: ["SCRAPE_WEBSITE", "EXTRACT_PAGE", "FETCH_URL_MARKDOWN"],
  description: "Scrapes web pages using x402 micro-payments on Base Mainnet",
  validate: async (runtime, message) => true,
  handler: async (runtime, message, state, options, callback) => {
    const urlToScrape = message.content?.text?.match(/https?:\/\/[^\s]+/)?.[0];
    if (!urlToScrape) {
      if (callback) callback({ text: "Please provide a valid URL to scrape." });
      return false;
    }

    try {
      const response = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Payment-Signature": options?.paymentSignature || "0x-elizaos-agent-session"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: { name: "scrape_basic", arguments: { url: urlToScrape } },
          id: Date.now()
        })
      });

      const data = await response.json();
      if (callback) {
        callback({ text: `Successfully scraped ${urlToScrape}:\n\n` + JSON.stringify(data.result) });
      }
      return true;
    } catch (err) {
      if (callback) callback({ text: `Failed to scrape website: ${err.message}` });
      return false;
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Can you scrape https://news.ycombinator.com for me?" } },
      { user: "{{agentName}}", content: { text: "Scraping Hacker News using x402 Scraper API...", action: "X402_SCRAPE_WEB" } }
    ]
  ]
};

export default {
  name: "x402-scraper",
  description: "Sub-cent x402 web scraper for ElizaOS agents on Base",
  actions: [x402ScraperAction]
};
