const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const URL_DO_JOGO = 'https://bingo.bet.br/play/cassino'; 
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

  // Monitoramento de requisições de rede otimizado para o provedor do Aviator
  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (url.includes('history') || url.includes('rounds') || url.includes('result') || url.includes('payouts')) {
        const text = await response.text();
        const matches = text.match(/"(multiplier|mult|crash|payout|rate)":\s*([\d.]+)/gi);

        if (matches) {
          matches.forEach(m => {
            const val = parseFloat(m.replace(/[^0-9.]/g, ''));
            if (!isNaN(val) && val >= 1.0 && val < 5000) {
              enviarVela(val);
            }
          });
        }
      }
    } catch (e) {}
  });

  await page.goto(URL_DO_JOGO, { waitUntil: 'networkidle2' });
  console.log('[Bot] Monitorando rede e interface do jogo na Bingo Bet...');

  let ultimaLida = '';
  
  // Varredura visual refinada focada no histórico superior do Aviator
  setInterval(async () => {
    try {
      for (const frame of page.frames()) {
        const textoVela = await frame.evaluate(() => {
          // Busca elementos estilizados nas barras de histórico típicas do Aviator
          const seletoresHistorico = document.querySelectorAll('span, div, p');
          for (let el of seletoresHistorico) {
            const texto = el.innerText ? el.innerText.trim() : '';
            // Valida se o texto tem estritamente o formato de multiplicador do jogo (ex: 2.38x, 14.20x)
            if (/^\d+\.\d{2}x$/i.test(texto)) {
              // Garante que é um elemento de texto puro (folha da árvore DOM) para evitar pegar blocos inteiros
              if (el.children.length === 0) {
                return texto;
              }
            }
          }
          return null;
        });

        if (textoVela && textoVela !== ultimaLida) {
          ultimaLida = textoVela;
          const val = parseFloat(textoVela.replace(/x/i, ''));
          if (!isNaN(val) && val >= 1.0) {
            enviarVela(val);
          }
        }
      }
    } catch (e) {}
  }, 1000);
}

let ultimaEnviada = 0;
let timestampUltimoEnvio = 0;

function enviarVela(mult) {
  const agora = new Date();
  const tempoAtualMs = agora.getTime();

  // Trava anti-duplicação de milissegundos para evitar disparo seguido do mesmo elemento visual
  if (mult === ultimaEnviada && (tempoAtualMs - timestampUltimoEnvio) < 3000) return;
  
  ultimaEnviada = mult;
  timestampUltimoEnvio = tempoAtualMs;

  const tempoComSegundos = agora.toTimeString().split(' ')[0];

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