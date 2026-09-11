const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { analisarHistorico } = require('./analyzer'); // Nome correto da função

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

      // 1. Guarda a nova rodada na memória do servidor
      historicoServidor.unshift(pacote);
      if (historicoServidor.length > 500) historicoServidor.pop();

      // 2. Executa a análise passando o histórico completo para a inteligência
      const analise = analisarHistorico(historicoServidor);

      console.log('[Servidor] Transmitindo rodada e análise:', pacote.mult);

      // 3. Transmite a nova rodada + sinal atualizado para todas as abas abertas
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 = WebSocket.OPEN
          client.send(JSON.stringify({
            tipo: 'NOVA_RODADA',
            dados: pacote,
            analise: analise
          }));
        }
      });
    } catch (e) {
      console.error('Erro ao retransmitir pacote:', e);
    }
  });
});

// O Render injeta a porta correta na variável process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});