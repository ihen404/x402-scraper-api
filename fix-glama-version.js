import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Replace the initialize handler block with exact version matching and proper ID echoing
code = code.replace(
  /if \(method === "initialize"[\s\S]*?\}\);/g,
  `if (method === "initialize") {
      return res.json({
        jsonrpc: "2.0",
        result: {
          protocolVersion: body.params?.protocolVersion || "2025-11-25",
          capabilities: {
            tools: { listChanged: false },
            tasks: { cancel: {}, list: {} }
          },
          serverInfo: { name: "x402-scraper-api", version: "3.3.0" }
        },
        id: id !== undefined ? id : 1
      });
    }`
);

// Also fix general id fallback across the handler
code = code.replace(/id: id \|\| 1/g, "id: id !== undefined ? id : 1");

fs.writeFileSync('index.js', code);
console.log("[Fix Applied] Glama protocol version and ID handling updated.");
