import fs from 'fs';

let serverCode = fs.readFileSync('server.js', 'utf8');

// 1. Add well-known Glama domain ownership claim endpoint
const glamaClaimEndpoint = `
// Glama Registry Ownership Verification Endpoint
app.get('/.well-known/glama.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    "$schema": "https://glama.ai/mcp/schemas/connector.json",
    "maintainers": [{ "email": "ike.hentrel@gmail.com" }]
  });
});
`;

if (!serverCode.includes('/.well-known/glama.json')) {
  serverCode = serverCode.replace("const app = express();", "const app = express();\n" + glamaClaimEndpoint);
}

// 2. Ensure CORS & Streamable HTTP headers match Glama standards
const streamableHttpHeader = `
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
`;

if (!serverCode.includes("Access-Control-Allow-Headers")) {
  serverCode = serverCode.replace("app.use(cors());", "app.use(cors());\n" + streamableHttpHeader);
}

fs.writeFileSync("server.js", serverCode);
console.log("[Success] Appended /.well-known/glama.json and enhanced streamable HTTP CORS headers.");
