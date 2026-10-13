import fs from 'fs';

// 1. Update package.json metadata
const pkgPath = 'package.json';
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.description = pkg.description || "Enterprise web scraping MCP server with automated x402 micro-payment negotiation on Base Mainnet.";
  pkg.homepage = "https://github.com/ihen404/x402-scraper-api";
  pkg.keywords = ["mcp", "scraping", "x402", "base", "ai-agents", "micropayments"];
  pkg.repository = {
    type: "git",
    url: "https://github.com/ihen404/x402-scraper-api.git"
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log("[Updated] package.json metadata enriched.");
}
