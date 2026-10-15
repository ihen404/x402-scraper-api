import requests
import time

class X402ScraperClient:
    def __init__(self, endpoint="https://x402-scraper-api-production-67a4.up.railway.app/mcp", 
                 payment_signature=None, preferred_chain="eip155:8453"):
        self.endpoint = endpoint
        self.payment_signature = payment_signature
        self.preferred_chain = preferred_chain

    def call_tool(self, name: str, args: dict = None):
        if args is None:
            args = {}
            
        headers = {
            "Content-Type": "application/json",
            "X-Settlement-Chain": self.preferred_chain
        }
        
        if self.payment_signature:
            headers["Payment-Signature"] = self.payment_signature

        payload = {
            "jsonrpc": "2.0",
            "method": "tools/call",
            "params": {"name": name, "arguments": args},
            "id": int(time.time() * 1000)
        }

        response = requests.post(self.endpoint, json=payload, headers=headers)
        return response.json()

    def scrape_token_minified(self, url: str, max_tokens: int = 1000):
        """Scrape and minify HTML to save 80-90% on LLM context tokens."""
        return self.call_tool("scrape_token_minified", {"url": url, "maxTokens": max_tokens})

    def purchase_pass(self):
        """Acquire 24-hour unlimited pass for high-frequency agent crawlers ($5.00 USDC)."""
        return self.call_tool("purchase_pass", {"durationHours": 24, "tier": "unlimited_swarm"})
