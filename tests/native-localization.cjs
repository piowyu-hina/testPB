// Reuse the existing WebView2 page; no reload, new game, or new native window.
const { writeFileSync, mkdirSync } = require('node:fs');
(async () => {
  const endpoint = process.env.TESTPB_CDP;
  if (!endpoint) throw Error('Set TESTPB_CDP to the existing native window endpoint');
  const targets = await (await fetch(`${endpoint}/json/list`)).json();
  const target = targets.find(t => t.type === 'page' && t.url.startsWith('http://127.0.0.1:1420'));
  if (!target) throw Error('No existing development game found');
  const socket = new WebSocket(target.webSocketDebuggerUrl), pending = new Map(); let id = 0;
  socket.onmessage = e => { const m = JSON.parse(e.data), p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); } };
  await new Promise((resolve,reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve,reject) => { const key = ++id; pending.set(key,{resolve,reject}); socket.send(JSON.stringify({id:key,method,params})); });
  const evaluate = async expression => { const r = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails)); return r.result.value; };
  const click = async selector => {
    const point = await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e?.getClientRects().length)throw Error('Target hidden');const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  };
  try {
    mkdirSync('test-results',{recursive:true});
    const original = await evaluate('document.documentElement.lang');
    const home = await evaluate(`Boolean(document.querySelector('#open-settings')?.getClientRects().length)`);
    const dialog = home ? '#village-settings' : '#battle-help';
    await send('Page.bringToFront');
    await click(home ? '#open-settings' : '#open-battle-help');
    for (const lang of ['en','zh-Hant']) {
      await click(`${dialog} [data-language="${lang}"]`);
      const actual = await evaluate('document.documentElement.lang');
      if (actual !== lang) throw Error(`Native switch failed: ${actual}`);
      const shot = await send('Page.captureScreenshot',{format:'png'});
      writeFileSync(`test-results/i18n-native-${lang}.png`,Buffer.from(shot.data,'base64'));
    }
    await click(`${dialog} [data-language="${original}"]`);
    await click(home ? '#close-settings' : '#close-battle-help');
    console.log(await evaluate(`({language:document.documentElement.lang,overflow:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth})`));
  } finally { socket.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
