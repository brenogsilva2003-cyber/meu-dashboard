const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { analisarHistorico } = require('./analyzer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Evita cache em rotas dinâmicas e estáticas durante desenvolvimento/tempo real
app.use((req, res, next) => {
  if (req.url.endsWith('.js') || req.url.endsWith('.html') || req.url === '/') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
  next();
});

app.use(express.static('.'));

let historicoServidor = [];
let sequenciaRodada = 0;

function broadcastJSON(payload) {
  const raw = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(raw);
    }
  });
}

app.get('/limpar', (req, res) => {
  historicoServidor = [];
  sequenciaRodada = 0;
  console.log('[Servidor] Histórico limpo manualmente via rota /limpar.');

  broadcastJSON({
    tipo: 'HISTORICO_INICIAL',
    dados: [],
    analise: analisarHistorico([])
  });

  res.send('Histórico limpo com sucesso! Pode voltar para o dashboard.');
});

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  console.log('[Servidor] Cliente conectado.');

  const analiseAtual = historicoServidor.length >= 25
    ? analisarHistorico(historicoServidor)
    : null;

  ws.send(JSON.stringify({
    tipo: 'HISTORICO_INICIAL',
    dados: historicoServidor,
    analise: analiseAtual
  }));

  ws.on('message', (message) => {
    try {
      const texto = message.toString();
      const data = JSON.parse(texto);

      if (data.tipo === 'PING' || data.tipo === 'HISTORICO_INICIAL') return;

      const multNum = Number(data.mult);
      if (Number.isNaN(multNum) || multNum <= 0) return;

      sequenciaRodada += 1;
      const agora = Date.now();
      const horaFormatada = data.time || new Date(agora).toTimeString().split(' ')[0];

      const pacote = {
        ...data,
        id: data.id || `r-${sequenciaRodada}-${agora}`,
        seq: sequenciaRodada,
        mult: multNum,
        time: horaFormatada,
        timestamp: data.timestamp || agora
      };

      historicoServidor.unshift(pacote);
      if (historicoServidor.length > 500) {
        historicoServidor.pop();
      }

      const analise = analisarHistorico(historicoServidor);

      console.log(`[Servidor] #${sequenciaRodada} Transmitindo rodada ${pacote.mult.toFixed(2)}x (${pacote.time}) | Ação: ${analise.acao}`);

      broadcastJSON({
        tipo: 'NOVA_RODADA',
        dados: pacote,
        analise: analise
      });

      const gerouSinal = analise && (
        analise.acao === 'ENTRADA' ||
        analise.status === 'ENTRADA' ||
        (typeof analise.sinal === 'string' && analise.sinal.toUpperCase().includes('OPORTUNIDADE')) ||
        (typeof analise.mensagem === 'string' && analise.mensagem.toUpperCase().includes('OPORTUNIDADE'))
      );

      if (gerouSinal) {
        console.log('[Servidor] Oportunidade Tática detectada! Enviando comando DISPARAR_ENTRADA...');
        broadcastJSON({
          comando: 'DISPARAR_ENTRADA',
          alvo: analise.alvo,
          confianca: analise.confianca
        });
      }
    } catch (e) {
      console.error('Erro ao processar/retransmitir pacote:', e);
    }
  });
});

// Heartbeat a cada 15s para manter conexões WebSocket vivas e saudáveis
const intervaloHeartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

wss.on('close', () => {
  clearInterval(intervaloHeartbeat);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});