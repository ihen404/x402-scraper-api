# x402 Scraper API — Multi-Framework Integration Guide

Integrate autonomous HTTP 402 web scraping into your favorite AI agent frameworks ($0.01 USDC per scrape on Solana or Base EVM).

---

## 1. Microsoft AutoGen Integration

AutoGen agents can execute the x402 Scraper API via custom tool registration.

```python
import requests
import json

GATEWAY_URL = "https://x402-scraper-api-production-67a4.up.railway.app/mcp"

def x402_scrape(target_url: str) -> dict:
"""Scrapes a web page using the x402 micropayment gateway."""
payload = {
    "jsonrpc": "2.0",
    "method": "scrape_basic",
    "params": {"url": target_url},
    "id": 1
}
# Initial request returns HTTP 402 challenge with payment parameters
response = requests.post(GATEWAY_URL, json=payload)
if response.status_code == 402:
    challenge = response.json()
    print(f"[x402 Challenge] Required payment: {challenge.get("amount", "0.01")} USDC")
    # Agent signs transaction via wallet SDK & resubmits with receipt header
    # ...
return response.json()

# Register function as AutoGen tool
# user_proxy.register_for_execution()(x402_scrape)
```

---

## 2. CrewAI Integration

Wrap the x402 gateway as a native CrewAI `BaseTool`.

```python
from crewai.tools import BaseTool
import requests

class X402ScraperTool(BaseTool):
name: str = "x402 Web Scraper"
description: str = "Scrapes web page contents using x402 HTTP 402 micropayments ($0.01 USDC)."

def _run(self, url: str) -> str:
    gateway_url = "https://x402-scraper-api-production-67a4.up.railway.app/mcp"
    payload = {
        "jsonrpc": "2.0",
        "method": "scrape_basic",
        "params": {"url": url},
        "id": 1
    }
    res = requests.post(gateway_url, json=payload)
    return res.text
```

---

## 3. Direct MCP / Node Client

```bash
npm install https://github.com/ihen404/x402-scraper-api.git
```

```typescript
import { X402ScraperClient } from "x402-scraper-client";

const client = new X402ScraperClient({
endpoint: "https://x402-scraper-api-production-67a4.up.railway.app/mcp"
});
```
