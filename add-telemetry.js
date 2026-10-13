import fs from 'fs';
let code = fs.readFileSync('index.js', 'utf8');

const telemetryCode = `
// Telemetry middleware for tracking MCP traffic velocity
app.use((req, res, next) => {
  if (req.path.includes('/mcp')) {
    console.log(\`[Telemetry] \${new Date().toISOString()} | Method: \${req.method} | IP: \${req.ip} | User-Agent: \${req.headers['user-agent']}\`);
  }
  next();
});
`;

if (!code.includes('Telemetry middleware')) {
  code = telemetryCode + "\n" + code;
  fs.writeFileSync('index.js', code);
}
