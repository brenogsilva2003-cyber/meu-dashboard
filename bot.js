const puppeteer = require('puppeteer');
const WebSocket = require('ws');

const URL_DO_JOGO = 'https://belodi.aviatorpro.io/'; 
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

conectarWebSocket();
iniciarBot();

async function iniciarBot() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();

  // Intercepta requisições de rede para pegar o resultado oficial do crash
  page.on('response', async (response) => {
    try {
      const url = response.url();
      if (url.includes('history') || url.includes('rounds') || url.includes('results') || url.includes('payouts') || url.includes('stat')) {
        const text = await response.text();
        const matches = text.match(/"(multiplier|mult|crash|payout|val|rate)":\s*([\d.]+)/gi);
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
  console.log('[Bot] Monitorando histórico superior do Aviator na Bingo Bet...');

  let ultimaLida = '';

  // Varredura visual estrita focada apenas no topo (histórico de velas) e ignorando a tabela lateral
  setInterval(async () => {
    try {
      const frames = page.frames();
      for (const frame of frames) {
        const textoVela = await frame.evaluate(() => {
          // Tenta buscar primariamente os elementos da barra superior de histórico do Aviator (Spribe)
          // Geralmente ficam em containers específicos de histórico ou carrossel superior
          const pingsHistorico = document.querySelectorAll('div[class*="payout"], div[class*="bubble"], div[class*="history"] span, div[class*="recent"] span');
          
          for (let el of pingsHistorico) {
            const txt = el.innerText ? el.innerText.trim() : '';
            if (/^\d+\.\d{2}x$/i.test(txt) && el.children.length === 0) {
              return txt; // Retorna o primeiro histórico válido do topo
            }
          }

          // Fallback seguro: varre elementos de texto, mas EXCLUI explicitamente qualquer ancestral que seja tabela de apostas
          const todosElementos = document.querySelectorAll('span');
          for (let el of todosElementos) {
            // Se o elemento estiver dentro da área de apostas dos jogadores (coluna esquerda), ignoramos
            if (el.closest('.bets-list') || el.closest('[class*="players"]') || el.closest('[class*="bet-list"]')) {
              continue;
            }

            const txt = el.innerText ? el.innerText.trim() : '';
            if (/^\d+\.\d{2}x$/i.test(txt) && el.children.length === 0) {
              // Verifica se está na parte superior da tela (coordenada Y menor que 150px, ou seja, no topo)
              const rect = el.getBoundingClientRect();
              if (rect.top < 120 && rect.width > 0) {
                return txt;
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

  // Trava para evitar duplicatas enviadas num intervalo inferior a 2 segundos
  if (mult === ultimaEnviada && (tempoAtualMs - timestampUltimoEnvio) < 2000) return;
  
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