import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const transport = new SSEClientTransport(
  new URL("https://YOUR-RAILWAY-APP-URL.up.railway.app/mcp")
);

const client = new Client({ name: "demo-agent", version: "1.0.0" });

async function run() {
  console.log("🤖 Initializing agent connection to MCP Server...");
  await client.connect(transport);
  console.log(" Connected to MCP server!");

  const tools = await client.listTools();
  console.log("Available tools:", tools);
}

run().catch(console.error);
