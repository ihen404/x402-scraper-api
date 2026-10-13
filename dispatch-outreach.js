import fs from 'fs';

async function dispatchOutreach() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("[Dispatcher Error] GITHUB_TOKEN environment variable is missing!");
    process.exit(1);
  }

  const reportPath = './growth_output/swarm-outreach-targets.json';
  if (!fs.existsSync(reportPath)) {
    console.error("[Dispatcher Error] No outreach targets found. Run scout-swarms.js first.");
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  console.log("[Dispatcher] Starting automated outreach dispatch to discovered repositories...");

  let dispatchedCount = 0;

  for (const group of report.targets) {
    for (const target of group.repositories) {
      const [owner, repo] = target.repo.split('/');
      console.log(`[Dispatcher] Creating outreach issue on ${target.repo}...`);

      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: "POST",
          headers: {
            "Authorization": `token ${token}`,
            "User-Agent": "x402-outreach-bot/3.3",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title: target.outreachPayload.title,
            body: target.outreachPayload.body
          })
        });

        if (res.status === 201) {
          const issueData = await res.json();
          console.log(`[Success] Issue created on ${target.repo}: ${issueData.html_url}`);
          dispatchedCount++;
        } else {
          const errData = await res.json();
          console.log(`[Skipped/Error] Could not open issue on ${target.repo}:`, errData.message || res.statusText);
        }
      } catch (err) {
        console.log(`[Error] Failed connecting to ${target.repo}:`, err.message);
      }

      // Brief delay to respect GitHub secondary rate limits
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`[Dispatcher Complete] Successfully dispatched ${dispatchedCount} outreach notices.`);
}

dispatchOutreach();
