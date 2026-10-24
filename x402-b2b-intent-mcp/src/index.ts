import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createB2BIntentServer } from "./server.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const server = createB2BIntentServer();
  await serveStdio(() => server, { legacy: "reject" });
}

main().catch((err) => {
  console.error("Fatal error running MCP Stdio Server:", err);
  process.exit(1);
});
