// Direct page CDP avoids WebView2 shared-worker auto-attach incompatibilities.
// Reuses the existing native window; never launches or reloads another game.
const { writeFileSync } = require('node:fs');
(async () => {
  const endpoint = process.env.TESTPB_CDP;
  if (!endpoint) throw new Error('Set TESTPB_CDP to the existing native window CDP HTTP endpoint');
  const targets = await (await fetch(`${endpoint}/json/list`)).json();
  const target = targets.find(t => t.type === 'page' && t.url.startsWith('http://127.0.0.1:1420'));
  if (!target) throw new Error('Existing testPB development page not found');
  const socket = new WebSocket(target.webSocketDebuggerUrl), pending = new Map(); let id = 0;
  socket.onmessage = event => {
    const message = JSON.parse(event.data), task = pending.get(message.id);
    if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
  };
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(r => setTimeout(r, 100)); }
    throw new Error(`Timed out: ${expression}`);
  };
  const point = selector => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||!e.getClientRects().length)throw Error('Invisible target');const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  const hover = async selector => send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...await point(selector) });
  const click = async selector => {
    const p = await point(selector); await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...p });
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...p, button: 'left', clickCount: 1 });
  };
  const idle = () => wait(`document.querySelector('#game')?.getAttribute('aria-busy')==='false'&&!document.querySelector('#game')?.classList.contains('dealing-hand')`);
  try {
    await send('Page.bringToFront');
    if (await evaluate(`Boolean(document.querySelector('#open-dungeons')?.getClientRects().length)`)) {
      await click('#open-dungeons');
      await wait(`Boolean(document.querySelector('#start-game')?.getClientRects().length)&&!document.querySelector('.screen-curtain:not([hidden])')`);
      await click('#start-game');
      await wait(`!document.querySelector('.screen-curtain:not([hidden])')`);
    }
    await idle(); await click('[data-test-action="elite"]'); await idle();
    for (const kind of ['ward-source', 'elite']) {
      await hover(`.actor.${kind}`);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`test-results/ward-native-${kind}.png`, Buffer.from(shot.data, 'base64'));
    }
    console.log(await evaluate(`({stage:document.querySelector('#journey-progress-label').textContent,links:document.querySelectorAll('#ward-links line').length,shields:[...document.querySelectorAll('.actor.warded .guard-shield')].map(e=>getComputedStyle(e).display),overflow:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth})`));
  } finally { socket.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
