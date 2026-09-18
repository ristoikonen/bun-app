
//USAGE: bunx element run  services/loadtest.ts 
//USAGE: runLoadTest();

//import { step, TestSettings, By, Until } from '@flood/element'

const port = Bun.env.APP_PORT
const LOCALHOST_URL = "http://localhost:" + port + '/';


interface TestStats {
  success: number;
  failure: number;
  latencies: number[];
}

async function hitEndpoint(stats: TestStats) {
  const start = globalThis.performance.now();
  try {
    const response = await fetch(LOCALHOST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bun Tester", timestamp: Date.now() }),
    });

    const duration = globalThis.performance.now() - start;
    stats.latencies.push(duration);

    if (response.ok) {
      stats.success++;
    } else {
      stats.failure++;
    }
  } catch (error) {
    stats.failure++;
  }
}


async function runLoadTest(totalRequests = 1000, concurrency = 50) {
  console.log(`Starting localhost API load test...`);
  console.log(`Target: ${LOCALHOST_URL}`);
  console.log(`Total Requests: ${totalRequests} | Concurrency Limit: ${concurrency}\n`);

  const stats: TestStats = { success: 0, failure: 0, latencies: [] };
  const queue: Promise<void>[] = [];

  for (let i = 0; i < totalRequests; i++) {
    
    const requestPromise = hitEndpoint(stats).then(() => {
      // Remove  from queue when finished
      queue.splice(queue.indexOf(requestPromise), 1);
    });
    queue.push(requestPromise);

    
    if (queue.length >= concurrency) {
      await Promise.race(queue);
    }
  }

  // Await any remaining stragglers
  await Promise.all(queue);

  // Print Summary Data
  const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
  console.log("--- Test Results ---");
  console.log(`Successful Requests: ${stats.success}`);
  console.log(`Failed Requests:     ${stats.failure}`);
  console.log(`Avg Latency:         ${avgLatency.toFixed(2)}ms`);
  console.log(`Min/Max Latency:     ${Math.min(...stats.latencies).toFixed(2)}ms / ${Math.max(...stats.latencies).toFixed(2)}ms`);
}

runLoadTest();