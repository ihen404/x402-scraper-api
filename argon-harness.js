import { GoogleGenAI } from '@google/genai';

/**
 * Gemini 4 Argon Agent Harness for x402 Scraper API
 * Designed for multi-turn autonomous execution with 1M token context window
 */
export class ArgonScraperHarness {
  constructor({ apiKey, x402Endpoint, baseWalletPrivateKey }) {
    this.ai = new GoogleGenAI({ apiKey });
    this.endpoint = x402Endpoint || 'https://x402-scraper-api-production-67a4.up.railway.app/mcp';
    this.walletKey = baseWalletPrivateKey;
    this.model = 'gemini-4-argon';
  }

  getToolDeclaration() {
    return {
      functionDeclarations: [
        {
          name: 'x402_scrape_url',
          description: 'Scrape live web page and retrieve clean, sanitized LLM Markdown content via Base Mainnet x402 micro-payment ($0.01 USDC).',
          parameters: {
            type: 'OBJECT',
            properties: {
              url: { type: 'STRING', description: 'The absolute URL to scrape' }
            },
            required: ['url']
          }
        }
      ]
    };
  }

  async handleToolCall(functionCall, paymentProofHeader) {
    if (functionCall.name === 'x402_scrape_url') {
      const { url } = functionCall.args;
      console.log(`[Argon Harness] Executing paid scrape for: ${url}`);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-payment-proof': paymentProofHeader || 'PROD_TEST_PROOF'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'scrape_url',
            arguments: { url }
          }
        })
      });

      return await response.json();
    }
  }
}
