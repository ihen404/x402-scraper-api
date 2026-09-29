import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

// Replace with your real Railway public domain
const RAILWAY_URL = "https://<YOUR-ACTUAL-RAILWAY-URL>.up.railway.app/mcp";

const transport = new SSEClientTransport(new URL(RAILWAY_URL));
const client = new Client({ name: "demo-agent", version: "1.0.0" });

async function run() {
  console.log("🤖 Initializing agent connection to MCP Server...");
  await client.connect(transport);
  console.log(" Connected to MCP server!");

  const tools = await client.listTools();
  console.log("Available tools:", JSON.stringify(tools, null, 2));
}

run().catch(console.error);
