const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const URL_DO_JOGO = 'https://bingo.bet.br/play/cassino'; // URL pública do seu servidor no Render com protocolo WSS (seguro)
const RENDER_WS_URL = 'wss://meu-dashboard-0lly.onrender.com';

let ws;

function conectarWebSocket() {
  ws = new WebSocket(RENDER_WS_URL);

  ws.on('open', () => {
    console.log('[Bot] Conectado com sucesso ao servidor no Render!');
  });

  ws.on('error', (err) => {
    console.error('[Bot] Erro na conexão WebSocket:', err.message);
  });

  ws.on('close', () => {
    console.warn('[Bot] Conexão caiu. Tentando reconectar em 3 segundos...');
    setTimeout(conectarWebSocket, 3000);
  });
}

// Inicia a conexão do WebSocket
conectarWebSocket();
iniciarBot();

async function iniciarBot() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();

  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (url.includes('history') || url.includes('rounds') || url.includes('result') || url.includes('state')) {
        const text = await response.text();
        const matches = text.match(/"(multiplier|mult|crash|rate)":\s*([\d.]+)/gi);

        if (matches) {
          matches.forEach(m => {
            const val = parseFloat(m.replace(/[^0-9.]/g, ''));
            if (!isNaN(val) && val >= 1.0) {
              enviarVela(val);
            }
          });
        }
      }
    } catch (e) {}
  });

  await page.goto(URL_DO_JOGO, { waitUntil: 'networkidle2' });
  console.log('[Bot] Monitorando rede do jogo...');

  let ultimaLida = '';
  setInterval(async () => {
    try {
      for (const frame of page.frames()) {
        const textoVela = await frame.evaluate(() => {
          const els = Array.from(document.querySelectorAll('*'));
          const el = els.find(e => e.children.length === 0 && /^\d+\.\d{2}x$/i.test(e.innerText?.trim()));
          return el ? el.innerText.trim() : null;
        });

        if (textoVela && textoVela !== ultimaLida) {
          ultimaLida = textoVela;
          const val = parseFloat(textoVela.replace(/x/i, ''));
          if (!isNaN(val)) enviarVela(val);
        }
      }
    } catch (e) {}
  }, 1500);
}

let ultimaEnviada = 0;
function enviarVela(mult) {
  if (mult === ultimaEnviada) return;
  ultimaEnviada = mult;

  const agora = new Date();
  const tempoComSegundos = agora.toTimeString().split(' ')[0]; // Ex: 22:58:11

  const dadosRodada = {
    mult: mult,
    time: tempoComSegundos,
    timestamp: agora.getTime()
  };

  console.log(`[Bot] 🚀 VELA CAPTURADA: ${dadosRodada.mult}x às ${dadosRodada.time}`);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(dadosRodada));
  } else {
    console.warn('[Bot] WebSocket desconectado. Não foi possível enviar a vela no momento.');
  }
}