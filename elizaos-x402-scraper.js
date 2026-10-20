// ElizaOS Action Plugin for x402 Scraper API
export const x402ScraperAction = {
  name: "X402_SCRAPE_WEBSITE",
  description: "Scrapes web pages to LLM-ready Markdown using paid x402 micropayments on Base or Solana.",
  similes: ["SCRAPE_URL", "FETCH_MARKDOWN", "READ_PAYWALLED_PAGE"],
  
  validate: async (runtime, message) => {
    return typeof message.content.text === "string" && message.content.text.includes("http");
  },

  handler: async (runtime, message, state, options, callback) => {
    const urlMatch = message.content.text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) return false;
    const targetUrl = urlMatch[0];

    try {
      // Calls x402 Scraper Gateway with auto-payment client
      const response = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await response.json();
      callback({ text: `Successfully scraped ${targetUrl}:\n\n${data.markdown.slice(0, 1000)}...` });
      return true;
    } catch (err) {
      console.error("ElizaOS x402 Scrape error:", err);
      return false;
    }
  }
};
