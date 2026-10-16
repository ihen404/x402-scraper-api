## Native HTTP 402 Agent Integration
If your agent encounters an HTTP 402 response, it can programmatically settle and retry:
```javascript
async function agenticScrape(targetUrl, apiKey) {
  let res = await fetch("https://x402-scraper-api-production-67a4.up.railway.app/api/extract", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "ref": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
    },
    body: JSON.stringify({ url: targetUrl, format: "markdown" })
  });
  
  if (res.status === 402) {
    const paymentMeta = await res.json();
    console.log("Deposit required at:", paymentMeta.depositEndpoint);
    // Trigger autonomous Base USDC transfer here...
  }
  return await res.json();
}
```