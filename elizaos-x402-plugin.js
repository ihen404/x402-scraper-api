// ElizaOS Plugin Wrapper for x402 Scraper API
import X402ScraperSolanaTool from "./solana-tool-wrapper.js";
import X402ScraperBaseTool from "./base-tool-wrapper.js";

export const x402ScraperPlugin = {
  name: "x402-scraper",
  description: "Autonomous HTTP 402 paid web scraping API across Solana and Base",
  actions: [
    {
      name: "SCRAPE_WEB_PAGE",
      similes: ["FETCH_URL", "SCRAPE_MARKDOWN", "READ_PAGE"],
      description: "Scrapes any public URL and returns clean LLM-ready Markdown via x402 micropayments.",
      handler: async (runtime, message, state, options) => {
        const url = options?.url || message.content?.text;
        const chain = options?.chain || "solana"; // Default to 70% Solana traffic
        
        if (chain === "base") {
          const tool = new X402ScraperBaseTool();
          return await tool.invoke(url);
        } else {
          const tool = new X402ScraperSolanaTool();
          return await tool.invoke(url);
        }
      }
    }
  ]
};

export default x402ScraperPlugin;
