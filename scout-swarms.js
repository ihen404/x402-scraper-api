import fs from 'fs';

async function runSwarmScout() {
  console.log("[Swarm Scout Worker] Scanning GitHub repositories for high-concurrency swarm frameworks...");
  
  const searchQueries = [
    'crewai+scraping',
    'langgraph+web_search',
    'autogen+browser',
    'agency-swarm+tools'
  ];

  let discoveredTargets = [];

  for (const q of searchQueries) {
    try {
      const res = await fetch(`https://api.github.com/search/code?q=${q}`, {
        headers: {
          "User-Agent": "x402-swarm-scout/3.2",
          ...(process.env.GITHUB_TOKEN ? { "Authorization": `token ${process.env.GITHUB_TOKEN}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        const items = (data.items || []).slice(0, 3).map(item => ({
          repo: item.repository.full_name,
          path: item.path,
          html_url: item.html_url,
          outreachPayload: {
            title: "Integration: Accelerate agent scraping with x402-scraper-api (HTTP 402 + Prompt Sanitization)",
            body: "Hello! We noticed your agent swarm handles high-concurrency extraction tasks. You can integrate x402-scraper-api for zero-config RAG markdown extraction and prompt-injection guardrails via our MCP manifest: https://x402-scraper-api-production-67a4.up.railway.app/.well-known/mcp.json"
          }
        }));
        discoveredTargets.push({ query: q, targetsFound: items.length, repositories: items });
      }
    } catch (err) {
      console.log(`[Swarm Scout Worker] Query '${q}' skipped:`, err.message);
    }
  }

  const outputDir = './growth_output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const report = {
    timestamp: new Date().toISOString(),
    status: "swarms_indexed_with_outreach",
    scannedQueries: searchQueries.length,
    targets: discoveredTargets,
    mcpDiscoveryManifest: "https://x402-scraper-api-production-67a4.up.railway.app/.well-known/mcp.json"
  };

  fs.writeFileSync(`${outputDir}/swarm-outreach-targets.json`, JSON.stringify(report, null, 2));
  console.log("[Swarm Scout Worker] Outreach targets compiled to growth_output/swarm-outreach-targets.json");
}

runSwarmScout();
