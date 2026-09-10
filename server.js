const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static('.'));

// Memória do servidor para guardar as últimas rodadas
let historicoServidor = [];

wss.on('connection', (ws) => {
  console.log('[Servidor] Cliente conectado.');

  // Envia todo o histórico acumulado para a aba que acabou de abrir
  ws.send(JSON.stringify({
    tipo: 'HISTORICO_INICIAL',
    dados: historicoServidor
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Ignora mensagens de controle
      if (data.tipo === 'HISTORICO_INICIAL') return;

      const pacote = {
        ...data,
        timestamp: data.timestamp || Date.now()
      };

      // Guarda a nova rodada na memória do servidor
      historicoServidor.unshift(pacote);
      if (historicoServidor.length > 500) historicoServidor.pop();

      console.log('[Servidor] Transmitindo:', JSON.stringify(pacote));

      // Transmite a nova rodada em tempo real para todas as abas abertas
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 = WebSocket.OPEN
          client.send(JSON.stringify({
            tipo: 'NOVA_RODADA',
            dados: pacote
          }));
        }
      });
    } catch (e) {
      console.error('Erro ao retransmitir pacote:', e);
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});