import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Replace the tools/list handler block with enhanced schema and annotations
const oldToolsList = /if \(method === "tools\/list"\) \{[\s\S]*?id: id !== undefined \? id : 1\s*\}\);\s*\n/g;

const newToolsList = `
    if (method === "tools/list") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          tools: [
            {
              name: "scrape",
              description: "Scrape, parse, and extract clean text content from any public web URL. [x402 Protocol: $0.01 USDC on Base Mainnet]",
              inputSchema: {
                type: "object",
                properties: {
                  url: { type: "string", description: "Target web URL to scrape" }
                },
                required: ["url"]
              },
              outputSchema: {
                type: "object",
                properties: {
                  success: { type: "boolean" },
                  content: { type: "string", description: "Extracted markdown or clean text content" },
                  url: { type: "string" }
                }
              },
              annotations: {
                readOnlyHint: true,
                destructiveHint: false,
                idempotentHint: true
              }
            }
          ]
        },
        id: id !== undefined ? id : 1
      });
    }
`;

if (oldToolsList.test(code)) {
  code = code.replace(oldToolsList, newToolsList);
  fs.writeFileSync('index.js', code);
  console.log("[Success] Enhanced tool schema and annotations added to index.js.");
} else {
  console.log("[Notice] Manual check needed for tools/list block replacement.");
}
