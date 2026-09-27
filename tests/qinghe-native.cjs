const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright');

// Uses the existing development binary and Vite; never packages a release.
(async () => {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const endpoint = `http://127.0.0.1:${port}`;
  const app = spawn(path.resolve('src-tauri/target/debug/testpb.exe'), [], {
    detached: process.env.TESTPB_KEEP_OPEN === '1',
    windowsHide: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port} --remote-debugging-address=127.0.0.1`,
      WEBVIEW2_USER_DATA_FOLDER: path.resolve(`test-results/native-qinghe-${process.pid}`)
    }
  });
  let completed = false;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const browser = await chromium.connectOverCDP(endpoint, { timeout: 500 });
        await browser.close();
        ready = true;
        break;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    if (!ready) throw new Error('Native WebView unavailable');
    const check = spawn(process.execPath, [process.env.TESTPB_CHECK_SCRIPT || 'tests/qinghe-browser.cjs'], {
      stdio: 'inherit',
      env: { ...process.env, TESTPB_CDP: endpoint }
    });
    const code = await new Promise(resolve => check.on('exit', resolve));
    if (code) throw new Error(`Native checks failed: ${code}`);
    console.log('Native Tauri pointer checks passed');
    completed = true;
    if (process.env.TESTPB_KEEP_OPEN === '1') console.log(`Preview PID=${app.pid} CDP=${endpoint}`);
  } finally {
    if (completed && process.env.TESTPB_KEEP_OPEN === '1') app.unref();
    else app.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
