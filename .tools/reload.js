// 开发辅助：刷新全部 NB Music 页面（改渲染层 html/css/js 后调用，无需重启主进程）
const http = require('http');
const WebSocket = require('ws');

function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function cdp(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1e9);
    const onMsg = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id === id) { ws.off('message', onMsg); resolve(msg.result); }
    };
    ws.on('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { ws.off('message', onMsg); reject(new Error('timeout ' + method)); }, 5000);
  });
}

async function main() {
  let targets;
  try {
    targets = await getTargets();
  } catch (e) {
    console.error('9222 未开（应用没带 --remote-debugging-port 启动？）:', e.message);
    process.exit(1);
  }
  const pages = targets.filter(t => t.type === 'page');
  console.log('pages:', pages.map(t => t.title || t.url).join(' | '));
  for (const t of pages) {
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((r) => ws.on('open', r));
    await cdp(ws, 'Page.reload', { ignoreCache: true });
    ws.close();
  }
  console.log('reloaded');
}
main().catch(e => { console.error('ERR', e); process.exit(1); });
