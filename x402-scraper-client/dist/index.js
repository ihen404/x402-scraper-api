export class X402ScraperClient {
    endpoint;
    apiKey;
    constructor(options) {
        this.endpoint = options.endpoint;
        this.apiKey = options.apiKey;
    }
    async scrape(url, paymentProof) {
        const headers = {
            "Content-Type": "application/json",
        };
        if (this.apiKey) {
            headers["x-api-key"] = this.apiKey;
        }
        if (paymentProof) {
            headers["x-402-payment-proof"] = paymentProof;
        }
        const response = await fetch(`${this.endpoint.replace(/\/mcp$/, "")}/api/scrape`, {
            method: "POST",
            headers,
            body: JSON.stringify({ url }),
        });
        if (response.status === 402) {
            const x402Meta = await response.json();
            throw new Error(`Payment Required ($${x402Meta.x402.price_usd} USDC on ${x402Meta.x402.network}). Please provide an x402-payment-proof header.`);
        }
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Scrape failed [${response.status}]: ${errBody}`);
        }
        const data = await response.json();
        return data.result;
    }
}
