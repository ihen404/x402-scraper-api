# Ship AI Agents That Pay For Themselves 🤖💸

Traditional APIs demand monthly subscriptions, credit cards, and human sign-offs—completely locking out autonomous AI agents. 

We built **`x402-scraper-api`** to fix this. It’s a production-grade web scraping endpoint and MCP server that implements the native **HTTP 402 Payment Required** standard on **Base**.

### How It Works in 3 Steps:
1. **Request**: Your agent queries our scraping endpoint for any URL.
2. **Challenge**: If unpaid, the API returns `402` with an invoice (`$0.001 USDC` on Base).
3. **Settle & Fetch**: The agent's wallet signs the micro-transaction on-chain, attaches the `x-402-payment-proof` header, and instantly receives clean, LLM-ready Markdown. No API keys. No subscriptions.

### Get Started Today:
* **GitHub Repository**: [ihen404/x402-scraper-api](https://github.com/ihen404/x402-scraper-api)
* **Explore on Glama & Smithery**: Live in directory listings now!
* **Quickstart Snippet**: Check out `x402-signer.js` in our repo to equip your agent with a self-paying wallet today.
