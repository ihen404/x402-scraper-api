import { exec } from 'child_process';

console.log("🚀 Launching Background Traffic Seeder (Pings every 15 minutes)...");

function runCycle() {
  exec('node swarm-client.js', (err, stdout, stderr) => {
    if (err) {
      console.error(`[Error]: ${err.message}`);
      return;
    }
    console.log(stdout);
  });
}

// Run immediately, then repeat every 15 minutes
runCycle();
setInterval(runCycle, 15 * 60 * 1000);
