//TODO: To get serious; get httpbin locally, set TARGET_HOST = "localhost" and TARGET_PORT = 8080
// And run it in Docker: docker run -p 8080:80 kennethreitz/httpbin
// Pass local variables: $env:APP_HOST="localhost"; $env:APP_PORT="8080"; bun getbinheaders.ts

const TARGET_BIN_STRESS_HOST = Bun.env.APP_HOST || "httpbin.org";
const TARGET_BIN_STRESS_PORT = parseInt(Bun.env.APP_PORT || "443", 10);

const TOTAL_BIN_STRESS_REQUESTS = 1; 
const BIN_STRESS_CONCURRENCY = 1;    // Max parallel open sockets

// Dynamically handle Host header formatting
const hostHeader = TARGET_BIN_STRESS_PORT === 80 || TARGET_BIN_STRESS_PORT === 443 
  ? TARGET_BIN_STRESS_HOST 
  : `${TARGET_BIN_STRESS_HOST}:${TARGET_BIN_STRESS_PORT}`;

// CRITICAL: Must end with two empty strings to guarantee \r\n\r\n
const rawBinStressRequest = [
  "GET /headers HTTP/1.1",
  `Host: ${hostHeader}`,
  "User-Agent: Bun-TCP-Benchmarker",
  "Accept: */*",
  "Connection: close", 
  "", 
  "", 
].join("\r\n");

let completedBinStressRequests = 0;
let failedBinStressRequests = 0;
let startedStressRequests = 0;

async function worker() {
  while (startedStressRequests < TOTAL_BIN_STRESS_REQUESTS) {
    startedStressRequests++;
    
    await new Promise<void>((resolve) => {
      Bun.connect({
        hostname: TARGET_BIN_STRESS_HOST, 
        port: TARGET_BIN_STRESS_PORT, 
        tls: TARGET_BIN_STRESS_PORT === 443, // Auto-enable TLS for HTTPS.  tls: true when port is 443
        socket: {
          open(socket) {
          
            const tlsCipher = socket.getCipher();
            const tlsVersion = socket.getTLSVersion() || '';
            const tlsPeerCert = socket.getPeerCertificate();
        
            console.log(`Cipher Version Negotiated: ${tlsCipher?.version ?? ''}`); 
            console.log(`TLS Version Used: ${tlsVersion}`);    
            if (tlsPeerCert && Object.keys(tlsPeerCert).length > 0) {
              console.log("\n--- Remote Peer Certificate Parsed ---");
              console.log(`Subject Name (Common Name): ${tlsPeerCert.subject.CN}`);
              console.log(`Issuer Name (Who signed it): ${tlsPeerCert.issuer.CN}`);
              console.log(`Valid From: ${tlsPeerCert.valid_from}`);
              console.log(`Valid Until (Expiration): ${tlsPeerCert.valid_to}`);
              console.log(`Serial Number: ${tlsPeerCert.serialNumber}`);
              console.log("-----------------------------------------\n");
            }
        

            socket.write(rawBinStressRequest);
          },
          data(socket) {
            completedBinStressRequests++;
            socket.end();
          },
          close() {
            resolve();
          },
          error() {
            failedBinStressRequests++;
            resolve();
          },
        },
      }).catch(() => {
        failedBinStressRequests++;
        resolve();
      });
    });
  }
}

async function runBinStressHeaderTest() {
  console.log(`Benchmarking http://${TARGET_BIN_STRESS_HOST}:${TARGET_BIN_STRESS_PORT}`);
  console.log(`Target: ${TOTAL_BIN_STRESS_REQUESTS} requests | Concurrency: ${BIN_STRESS_CONCURRENCY}\n`);
  
  const startTime = performance.now();

  // Progress reporter interval
  const progressTimer = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    const currentRps = (completedBinStressRequests / elapsed).toFixed(0);
    process.stdout.write(
      `Progress: ${completedBinStressRequests + failedBinStressRequests}/${TOTAL_BIN_STRESS_REQUESTS} | Success: ${completedBinStressRequests} | RPS: ${currentRps}\r`
    );
  }, 100);

  // Spawn fixed workers based on concurrency settings
  const workers = Array.from({ length: BIN_STRESS_CONCURRENCY }, worker);
  await Promise.all(workers);

  clearInterval(progressTimer);

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  const avgRps = (completedBinStressRequests / parseFloat(duration)).toFixed(2);

  console.log("\n\n Test complete!");
  console.log(`Duration: ${duration} seconds`);
  console.log(`Avg Throughput: ${avgRps} requests/sec`);
  console.log(`Successful responses: ${completedBinStressRequests}`);
  console.log(`Socket drops/failures: ${failedBinStressRequests}`);
}

runBinStressHeaderTest();
