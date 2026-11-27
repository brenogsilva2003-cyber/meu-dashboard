let historyData = [];
let donutChartInstance = null;
let socket = null;
let reconectarTimer = null;
let renderAgendado = false;

// Relógio Digital e Atualização de tempos relativos a cada 1s
setInterval(() => {
  const agora = new Date();
  const relogioEl = document.getElementById('relogio-digital');
  if (relogioEl) {
    relogioEl.innerText = agora.toTimeString().split(' ')[0];
  }

  renderizarMinutagem20Minutos();
  atualizarCardsSuperiores();
}, 1000);

function agendarRenderizacao() {
  if (renderAgendado) return;
  renderAgendado = true;
  requestAnimationFrame(() => {
    renderAgendado = false;
    renderizarTudo();
  });
}

function conectarWebSocket() {
  if (reconectarTimer) {
    clearTimeout(reconectarTimer);
    reconectarTimer = null;
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = window.location.host;
  socket = new WebSocket(`${wsProtocol}//${wsHost}`);

  socket.onopen = () => {
    console.log('Conectado ao servidor WebSocket em tempo real.');
  };

  socket.onclose = () => {
    console.warn('Conexão WebSocket encerrada. Reconectando automaticamente em 1.5s...');
    reconectarTimer = setTimeout(conectarWebSocket, 1500);
  };

  socket.onerror = (err) => {
    console.warn('Erro no WebSocket:', err);
  };

  socket.onmessage = (event) => {
    try {
      const mensagem = JSON.parse(event.data);

      if (mensagem.tipo === 'HISTORICO_INICIAL') {
        historyData = Array.isArray(mensagem.dados) ? mensagem.dados : [];
        if (mensagem.analise) {
          atualizarPainelSinal(mensagem.analise);
          if (Array.isArray(mensagem.analise.historicoComFeedback) && mensagem.analise.historicoComFeedback.length) {
            historyData = mensagem.analise.historicoComFeedback;
          }
        }
        agendarRenderizacao();
        return;
      }

      if (mensagem.tipo === 'NOVA_RODADA') {
        const novaRodada = mensagem.dados;
        if (novaRodada && typeof novaRodada.mult === 'number' && !Number.isNaN(novaRodada.mult)) {
          const jaExisteMesmoId = novaRodada.id && historyData.some(item => item.id === novaRodada.id);
          const ultima = historyData[0];
          const mesmaVelaExata = !novaRodada.id && ultima &&
            ultima.mult === novaRodada.mult &&
            ultima.time === novaRodada.time &&
            Math.abs((ultima.timestamp || 0) - (novaRodada.timestamp || 0)) < 1500;

          if (!jaExisteMesmoId && !mesmaVelaExata) {
            historyData.unshift(novaRodada);
            if (historyData.length > 500) {
              historyData.pop();
            }
          }
        }

        if (mensagem.analise) {
          atualizarPainelSinal(mensagem.analise);
          if (Array.isArray(mensagem.analise.historicoComFeedback) && mensagem.analise.historicoComFeedback.length === historyData.length) {
            historyData = mensagem.analise.historicoComFeedback;
          }
        }

        agendarRenderizacao();
        return;
      }

      // Caso chegue apenas análise em outro formato de mensagem
      if (mensagem.analise) {
        atualizarPainelSinal(mensagem.analise);
        agendarRenderizacao();
      }
    } catch (e) {
      console.error('Erro ao processar pacote WebSocket:', e);
    }
  };
}

conectarWebSocket();

/**
 * Atualiza os elementos visuais do Card de Sinal em Tempo Real (Incluindo Win Rate)
 */
function atualizarPainelSinal(analise) {
  setVal('sinal-status', analise.sinal || '⚪ AGUARDANDO...');
  setVal('sinal-motivo', analise.motivo || 'Processando...');
  setVal('sinal-alvo', analise.alvo || 'N/A');

  const confiancaStr = analise.confianca || '0%';
  const taxaAcertoStr = analise.taxaAcerto || '0.0%';
  setVal('sinal-confianca', `Confiança: ${confiancaStr} | Win Rate: ${taxaAcertoStr}`);

  const statusEl = document.getElementById('sinal-status');
  if (statusEl && analise.sinal) {
    const s = analise.sinal.toUpperCase();
    if (s.includes('ENTRAR') || s.includes('FAVORÁVEL') || s.includes('OPORTUNIDADE') || s.includes('CONFLUÊNCIA')) {
      statusEl.style.color = '#00ff88';
    } else if (s.includes('RECUAR') || s.includes('ALERTA') || s.includes('DEFESA') || s.includes('CAUTELA') || s.includes('ARMADILHA') || s.includes('EXAUSTÃO') || s.includes('POLUÍDA')) {
      statusEl.style.color = '#ff3366';
    } else if (s.includes('MODERADA') || s.includes('ESPERA')) {
      statusEl.style.color = '#ffcc00';
    } else {
      statusEl.style.color = '#ffffff';
    }
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.menu-btn').forEach(el => el.classList.remove('active'));

  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) activeTab.classList.add('active');

  const activeBtn = Array.from(document.querySelectorAll('.menu-btn')).find(b => b.innerText.toLowerCase().includes(tabName));
  if (activeBtn) activeBtn.classList.add('active');
}

function getCorClass(mult) {
  if (mult >= 100) return 'hot';
  if (mult >= 10) return 'rosa';
  if (mult >= 2) return 'roxa';
  return 'azul';
}

function calcMinutosAtras(timestamp) {
  if (!timestamp) return '--';
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return 'Agora';
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const restMins = mins % 60;
    return `${hrs}h ${restMins}min`;
  }
  return `${mins} min`;
}

function renderizarTudo() {
  renderizarVelasComCasas();
  atualizarCardsSuperiores();
  atualizarMedias();
  renderizarDistribuicao();
  renderizarMinutagem20Minutos();
}

function atualizarMedias() {
  const rosas = historyData.filter(i => i.mult >= 10).slice(0, 10);
  const roxas = historyData.filter(i => i.mult >= 2 && i.mult < 10).slice(0, 15);
  const azuis = historyData.filter(i => i.mult < 2).slice(0, 20);

  const mediaRosas = rosas.length > 0
    ? (rosas.reduce((acc, curr) => acc + curr.mult, 0) / rosas.length).toFixed(2)
    : '0.00';

  const mediaRoxas = roxas.length > 0
    ? (roxas.reduce((acc, curr) => acc + curr.mult, 0) / roxas.length).toFixed(2)
    : '0.00';

  const mediaAzuis = azuis.length > 0
    ? (azuis.reduce((acc, curr) => acc + curr.mult, 0) / azuis.length).toFixed(2)
    : '0.00';

  setVal('media-rosas', `${mediaRosas}x`);
  setVal('media-roxas', `${mediaRoxas}x`);
  setVal('media-azuis', `${mediaAzuis}x`);
}

function renderizarVelasComCasas() {
  const grid = document.getElementById('grid-rodadas');
  if (!grid) return;

  const cronologico = [...historyData].reverse();
  const temRosaNoHistorico = cronologico.some(item => item.mult >= 10);

  let contadorCasas = 0;
  let encontrouPrimeiraRosa = false;

  const resultadosCalculados = cronologico.map((item) => {
    const eRosaOuHot = item.mult >= 10;
    let badgeText = 0;

    if (!temRosaNoHistorico) {
      badgeText = 0;
    } else if (eRosaOuHot) {
      encontrouPrimeiraRosa = true;
      contadorCasas++;
      badgeText = contadorCasas;
      contadorCasas = 0;
    } else if (encontrouPrimeiraRosa) {
      contadorCasas++;
      badgeText = contadorCasas;
    } else {
      badgeText = 0;
    }

    return {
      ...item,
      badgeText
    };
  });

  const paraExibir = resultadosCalculados.reverse();

  grid.innerHTML = paraExibir.map((item) => {
    const cor = getCorClass(item.mult);

    let estiloFeedback = '';
    if (item.statusFeedback === 'acerto') {
      estiloFeedback = 'border: 2px solid #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);';
    } else if (item.statusFeedback === 'erro') {
      estiloFeedback = 'border: 2px solid #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);';
    }

    return `
      <div class="vela-item ${cor}" style="${estiloFeedback}">
        <div class="badge-casa">${item.badgeText}</div>
        <div class="mult">${item.mult.toFixed(2)}x</div>
        <div class="time">${item.time || ''}</div>
      </div>
    `;
  }).join('');
}

function calcularMetricasFaixa(condicaoFn) {
  let velasContador = 0;
  let itemEncontrado = null;

  for (let i = 0; i < historyData.length; i++) {
    if (condicaoFn(historyData[i].mult)) {
      itemEncontrado = historyData[i];
      break;
    } else {
      velasContador++;
    }
  }

  return {
    velas: itemEncontrado ? velasContador : '-',
    tempo: itemEncontrado ? calcMinutosAtras(itemEncontrado.timestamp) : '-'
  };
}

function atualizarCardsSuperiores() {
  const f10_50 = calcularMetricasFaixa(m => m >= 10 && m < 50);
  const f50_100 = calcularMetricasFaixa(m => m >= 50 && m < 100);
  const f100_999 = calcularMetricasFaixa(m => m >= 100 && m < 1000);
  const f1000 = calcularMetricasFaixa(m => m >= 1000);

  setVal('velas-10-50', f10_50.velas);
  setVal('tempo-10-50', f10_50.tempo);

  setVal('velas-50-100', f50_100.velas);
  setVal('tempo-50-100', f50_100.tempo);

  setVal('velas-100-999', f100_999.velas);
  setVal('tempo-100-999', f100_999.tempo);

  setVal('velas-1000', f1000.velas);
  setVal('tempo-1000', f1000.tempo);
}

function renderizarDistribuicao() {
  const umaHoraAtras = Date.now() - (60 * 60 * 1000);
  const velasHora = historyData.filter(i => i.timestamp && i.timestamp >= umaHoraAtras);

  const total = velasHora.length;
  let qAzul = 0, qRoxa = 0, qRosa = 0, qHot = 0;

  velasHora.forEach(i => {
    if (i.mult >= 100) qHot++;
    else if (i.mult >= 10) qRosa++;
    else if (i.mult >= 2) qRoxa++;
    else qAzul++;
  });

  setVal('total-velas-hora', total);
  setVal('donut-center-val', total);

  const pAzul = total ? Math.round((qAzul / total) * 100) : 0;
  const pRoxa = total ? Math.round((qRoxa / total) * 100) : 0;
  const pRosa = total ? Math.round((qRosa / total) * 100) : 0;
  const pHot = total ? Math.round((qHot / total) * 100) : 0;

  setVal('pct-azul', `${pAzul}%`);
  setVal('qty-azul', qAzul);
  setVal('pct-roxa', `${pRoxa}%`);
  setVal('qty-roxa', qRoxa);
  setVal('pct-rosa', `${pRosa}%`);
  setVal('qty-rosa', qRosa);
  setVal('pct-hot', `${pHot}%`);
  setVal('qty-hot', qHot);

  const ctx = document.getElementById('donutChart');
  if (!ctx || typeof Chart === 'undefined') return;

  if (!donutChartInstance) {
    donutChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Azul', 'Roxa', 'Rosa', 'Hot'],
        datasets: [{
          data: [qAzul, qRoxa, qRosa, qHot],
          backgroundColor: ['#2563eb', '#9333ea', '#e11d48', '#ff0055'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '75%',
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  } else {
    donutChartInstance.data.datasets[0].data = [qAzul, qRoxa, qRosa, qHot];
    donutChartInstance.update('none');
  }
}

function setVal(id, text) {
  const el = document.getElementById(id);
  if (el) el.innerText = text;
}

function renderizarMinutagem20Minutos() {
  const chart = document.getElementById('minutagem-chart');
  if (!chart) return;

  const agora = Date.now();
  const vinteMinutosMs = 20 * 60 * 1000;

  const rosasValidas = historyData.filter(i => {
    const eRosa = i.mult >= 10;
    const dentroDos20Min = i.timestamp ? (agora - i.timestamp) <= vinteMinutosMs : false;
    return eRosa && dentroDos20Min;
  });

  const contagemDigitos = Array(10).fill(0);

  rosasValidas.forEach(item => {
    if (item.time) {
      const minuto = item.time.split(':')[1];
      if (minuto) {
        const digitoFinal = parseInt(minuto.slice(-1), 10);
        if (!Number.isNaN(digitoFinal) && digitoFinal >= 0 && digitoFinal <= 9) {
          contagemDigitos[digitoFinal]++;
        }
      }
    }
  });

  const maxVal = Math.max(...contagemDigitos, 1);

  chart.innerHTML = contagemDigitos.map((qtd, index) => {
    const alturaPct = Math.round((qtd / maxVal) * 100);
    return `
      <div class="bar-col">
        <div class="bar-val">${qtd}</div>
        <div class="bar" style="height: ${Math.max(alturaPct, 5)}%;"></div>
        <div class="bar-label">${index}</div>
      </div>
    `;
  }).join('');
}