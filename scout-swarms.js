import fs from 'fs';

async function runSwarmScout() {
  console.log("[Swarm Scout Worker] Scanning GitHub repositories for Python & TypeScript swarm frameworks...");
  
  const searchQueries = [
    'crewai+scraping',
    'langgraph+web_search',
    'autogen+browser',
    'eliza+plugin',
    'langchain+mcp'
  ];

  let discoveredTargets = [];
  const token = process.env.GITHUB_TOKEN;

  for (const q of searchQueries) {
    try {
      const res = await fetch(`https://api.github.com/search/code?q=${q}`, {
        headers: {
          "User-Agent": "x402-swarm-scout/3.3",
          ...(token ? { "Authorization": `token ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        const items = (data.items || []).slice(0, 3).map(item => ({
          repo: item.repository.full_name,
          path: item.path,
          html_url: item.html_url,
          outreachPayload: {
            title: "Integration: Add zero-config M2M scraping & prompt sanitization via x402-scraper-api",
            body: "Hello! We noticed your agent workflow handles high-concurrency data retrieval. You can integrate x402-scraper-api using our Python or JS SDKs with native HTTP 402 micro-settlement and prompt-injection guardrails: https://x402-scraper-api-production-67a4.up.railway.app/.well-known/mcp.json"
          }
        }));
        discoveredTargets.push({ query: q, targetsFound: items.length, repositories: items });
      } else {
        console.log(`[Swarm Scout Worker] GitHub rate limit or error for query '${q}': ${res.status}`);
      }
    } catch (err) {
      console.log(`[Swarm Scout Worker] Query '${q}' failed:`, err.message);
    }
  }

  const outputDir = './growth_output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const report = {
    timestamp: new Date().toISOString(),
    status: "cross_ecosystem_swarms_indexed",
    authenticated: !!token,
    targets: discoveredTargets,
    mcpDiscoveryManifest: "https://x402-scraper-api-production-67a4.up.railway.app/.well-known/mcp.json"
  };

  fs.writeFileSync(`${outputDir}/swarm-outreach-targets.json`, JSON.stringify(report, null, 2));
  console.log("[Swarm Scout Worker] Cross-ecosystem outreach targets compiled successfully.");
}

runSwarmScout();
