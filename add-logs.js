import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Replace the start of the app.all("/mcp" handler to log incoming requests
code = code.replace(
  'app.all("/mcp", (req, res) => {',
  'app.all("/mcp", (req, res) => {\n  console.log("[Glama Test Log] Method:", req.method, "Headers:", JSON.stringify(req.headers), "Body:", JSON.stringify(req.body));'
);

fs.writeFileSync('index.js', code);
console.log("[Logging Added] Request inspector added to /mcp endpoint.");
