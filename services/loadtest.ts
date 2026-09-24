
//USAGE: bunx element run  services/httpstress.ts 
//USAGE (comment method at the end): runLoadTest();

//import { step, TestSettings, By, Until } from '@flood/element'

const port = Bun.env.APP_PORT
const host = Bun.env.APP_HOST
const LOCALHOST_URL = "http://" + host+ ":" + port + '/';


interface TestStats {
  success: number;
  failure: number;
  latencies: number[];
}

async function hitEndpoint(stats: TestStats) {
  const start = globalThis.performance.now();
  try {
    Bun.connect({
      hostname: host,
      port: port,  
      socket: {
        open(socket) {
          socket.write(rawRequest);
        },
        data(socket, data) {
          socket.end();
        },
        error(socket, err) {
          console.error(err);
        }
      }
    });
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