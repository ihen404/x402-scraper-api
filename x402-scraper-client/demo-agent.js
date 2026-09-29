import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  console.log("🤖 Initializing agent connection to MCP Server...");

  const transport = new StreamableHTTPClientTransport(
    new URL("https://x402-scraper-api-production-67a4.up.railway.app/mcp")
  );

  const client = new Client(
    {
      name: "x402-demo-agent",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  console.log("✅ Connected to MCP Server!");

  // Discover registered tools
  const tools = await client.listTools();
  console.log("🛠️  Discovered tools:", JSON.stringify(tools, null, 2));

  // Execute scrape request
  console.log("🕷️  Requesting web scrape for: https://news.ycombinator.com");
  const response = await client.callTool({
    name: "scrape",
    arguments: {
      url: "https://news.ycombinator.com"
    }
  });

  console.log("📄 Scrape Result:", JSON.stringify(response, null, 2));
}

main().catch(console.error);
