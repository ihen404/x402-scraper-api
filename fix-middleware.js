import fs from 'fs';

let code = fs.readFileSync('index.js', 'utf8');

// Strip out the misplaced telemetry block from the top
code = code.replace(/\/\/ Telemetry middleware for tracking MCP traffic velocity[\s\S]*?\}\);\s*\n/g, "");

// Find where express() is initialized and insert the telemetry middleware right after it
const target = 'const app = express();';
const telemetrySnippet = `
// Telemetry middleware for tracking MCP traffic velocity
app.use((req, res, next) => {
  if (req.path.includes('/mcp')) {
    console.log(\`[Telemetry] \${new Date().toISOString()} | Method: \${req.method} | IP: \${req.ip} | User-Agent: \${req.headers['user-agent']}\`);
  }
  next();
});
`;

if (code.includes(target)) {
  code = code.replace(target, target + "\n" + telemetrySnippet);
} else {
  code = telemetrySnippet + "\n" + code;
}

fs.writeFileSync('index.js', code);
console.log("[Fixed] Telemetry middleware correctly repositioned after app initialization.");
