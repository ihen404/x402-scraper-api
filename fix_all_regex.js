import fs from 'fs';
let code = fs.readFileSync('server.mjs', 'utf8');

// Replace any instance of the complex regex stripping block with a clean, safe standard text stripper
code = code.replace(/\.replace\(\/\<script[\s\S]*?<\/script>\/gi, ''\)/g, '');
code = code.replace(/\.replace\(\/\<style[\s\S]*?<\/style>\/gi, ''\)/g, '');

// Also catch any raw backslash-b issues remaining in the file and replace them with standard string replace or clean regex
code = code.replace(/<script\\b[^<]*?>[\s\S]*?<\\/script>/gi, '');
code = code.replace(/<style\\b[^<]*?>[\s\S]*?<\\/style>/gi, '');

// Let's ensure cleanContent uses a bulletproof safe string cleaning method
const targetSnippet = `    // Extract title, meta tags, and main body text to simulate rendered SPA output
    const titleMatch = html.match(/<title>([^<]*)</title>/i);
    const title = titleMatch ? titleMatch[1] : "No Title Found";
    
    // Strip scripts, styles, and clean up markup for the agent
    const cleanContent = html
      .replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '')
      .replace(/<style\\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>/gi, '')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\\s+/g, ' ')
      .trim()
      .slice(0, 20000);`;

const replacementSnippet = `    // Extract title and clean markup safely
    const titleMatch = html.match(/<title>([^<]*)<\\/title>/i);
    const title = titleMatch ? titleMatch[1] : "No Title Found";
    
    // Safe and clean HTML stripping without complex flag issues
    const cleanContent = html
      .replace(/<script[\\s\\S]*?>[\\s\\S]*?<\\/script>/gi, '')
      .replace(/<style[\\s\\S]*?>[\\s\\S]*?<\\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim()
      .slice(0, 20000);`;

if (code.includes('const titleMatch = html.match')) {
  // Safe replacement of the entire rendering cleaning section
  code = code.replace(/const titleMatch = html\.match[\s\S]*?\.slice\(0, 20000\);/g, replacementSnippet);
}

fs.writeFileSync('server.mjs', code, 'utf8');
console.log('Successfully replaced broken regex with safe string patterns.');
