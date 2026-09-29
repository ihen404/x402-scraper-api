import { x402Client } from 'x402-express';

export interface ScrapeOptions {
  url: string;
  privateKey: string;
}

export interface ScrapeResult {
  url: string;
  title?: string;
  status: number;
  timestamp: string;
}

export class X402ScraperTool {
  private endpoint: string;

  constructor(endpoint: string = 'https://x402-scraper-api-production-67a4.up.railway.app/api/scrape') {
    this.endpoint = endpoint;
  }

  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    const client = new x402Client({ privateKey: options.privateKey });

    const response = await client.post(this.endpoint, {
      body: JSON.stringify({ url: options.url }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`x402 Scrape request failed with status ${response.status}`);
    }

    return await response.json();
  }

  asLangChainTool(privateKey: string) {
    return {
      name: 'x402_web_scraper',
      description: 'Scrapes web pages using automated Base USDC micro-payments (0.005 USDC).',
      call: async (input: { url: string }) => {
        return await this.scrape({ url: input.url, privateKey });
      }
    };
  }
}
