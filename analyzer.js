/**
 * Motor Avançado de Análise Preditiva - Aviator com Teorias, Validação e Ceticismo Humano
 * Simula a desconfiança natural do apostador: avalia riscos, hesita após erros e pondera entradas.
 */

// Memória de desempenho das "Teorias" do apostador simulado
let desempenhoTeorias = {
  teoriaRespiroPosBaixas: { acertos: 4, erros: 3 }, 
  teoriaCicloMinuto:      { acertos: 4, erros: 3 }, 
  teoriaFluxoRoxo:        { acertos: 4, erros: 3 }  
};

// Histórico de auditoria para feedback loop e índice de ceticismo
let ultimosSinaisEmitidos = [];
let indiceCeticismo = 1.0; // Controla o "pé atrás" do operador humano

function analisarHistorico(historyData) {
  if (!historyData || historyData.length < 25) {
    return {
      signal: '⚪ AGUARDAR',
      sinal: '⚪ AGUARDAR',
      motivo: 'Analisando o comportamento da mesa e calibrando ceticismo inicial (mín. 25 rodadas)...',
      alvo: 'N/A',
      confianca: '0%',
      taxaAcerto: '0.0%'
    };
  }

  // -------------------------------------------------------------------------
  // 0. AUTO-AVALIAÇÃO E O "PÉ ATRÁS" (CETICISMO HUMANO)
  // -------------------------------------------------------------------------
  const ultimaVela = historyData[0];
  const penultimaVela = historyData[1];
  const deuBomUltimaRodada = ultimaVela.mult >= 2.0;

  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];
    
    if (deuBomUltimaRodada) {
      // Acertou: O humano relaxa um pouco o ceticismo, mas sem perder a cautela
      desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
      indiceCeticismo = Math.max(0.85, indiceCeticismo - 0.05);
    } else {
      // Errou: O humano fica com receio, aumenta a desconfiança para a próxima rodada
      desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
      indiceCeticismo = Math.min(1.40, indiceCeticismo + 0.15); 
    }
  }

  const agora = new Date();
  const minutoAtualStr = agora.getMinutes().toString();
  const digitoMinutoAtual = parseInt(minutoAtualStr.slice(-1));

  // -------------------------------------------------------------------------
  // 1. CÁLCULO DE WIN RATE GLOBAL
  // -------------------------------------------------------------------------
  let acertosGlobais = 0;
  let totalAmostras = Math.min(40, historyData.length - 2);
  for (let i = 0; i < totalAmostras; i++) {
    if (historyData[i].mult >= 2.00) acertosGlobais++;
  }
  let winRateCalculado = totalAmostras > 0 ? (acertosGlobais / totalAmostras) * 100 : 65.0;
  winRateCalculado = Math.min(Math.max(winRateCalculado, 35.0), 90.0);
  const winRateFormatado = `${winRateCalculado.toFixed(1)}%`;

  // -------------------------------------------------------------------------
  // 2. FORMULAÇÃO DE TEORIAS (O HUMANO OBSERVANDO O GRÁFICO)
  // -------------------------------------------------------------------------
  const janela15 = historyData.slice(0, 15);
  let azuisSeguidos = 0;
  for (let item of historyData) {
    if (item.mult < 2.0) azuisSeguidos++;
    else break;
  }

  let qRoxasJanela = janela15.filter(i => i.mult >= 2.0 && i.mult < 10).length;
  let qAzuisJanela = janela15.filter(i => i.mult < 2.0).length;

  const scoreTeoriaRespiro = (azuisSeguidos >= 3 && azuisSeguidos <= 6) ? 75 : 40;

  const rosasRecentes = historyData.filter(item => item.mult >= 10);
  let ocorrenciasNesteDigito = 0;
  rosasRecentes.forEach(item => {
    if (item.time) {
      const min = item.time.split(':')[1];
      if (min && parseInt(min.slice(-1)) === digitoMinutoAtual) ocorrenciasNesteDigito++;
    }
  });
  const scoreTeoriaMinuto = ocorrenciasNesteDigito >= 2 ? 80 : 50;

  const scoreTeoriaFluxo = (qRoxasJanela >= 5 && qAzuisJanela <= 10) ? 70 : 45;

  // -------------------------------------------------------------------------
  // 3. AVALIAÇÃO DE RENTABILIDADE COM O FILTRO DE CETICISMO
  // -------------------------------------------------------------------------
  function calcularRentabilidadeTeorias(nomeTeoria) {
    const t = desempenhoTeorias[nomeTeoria];
    const total = t.acertos + t.erros;
    return total > 0 ? (t.acertos / total) * 100 : 50;
  }

  const rentabilidadeRespiro = calcularRentabilidadeTeorias('teoriaRespiroPosBaixas');
  const rentabilidadeMinuto = calcularRentabilidadeTeorias('teoriaCicloMinuto');
  const rentabilidadeFluxo = calcularRentabilidadeTeorias('teoriaFluxoRoxo');

  let melhorTeoria = 'Nenhuma';
  let maiorScore = 0;
  let teoriaAtivaKey = '';

  if (scoreTeoriaRespiro > maiorScore && rentabilidadeRespiro >= 52) {
    maiorScore = scoreTeoriaRespiro;
    melhorTeoria = 'Teoria do Respiro Pós-Exaustão Azul';
    teoriaAtivaKey = 'teoriaRespiroPosBaixas';
  }
  if (scoreTeoriaMinuto > maiorScore && rentabilidadeMinuto >= 52) {
    maiorScore = scoreTeoriaMinuto;
    melhorTeoria = 'Teoria de Sincronia de Minutagem';
    teoriaAtivaKey = 'teoriaCicloMinuto';
  }
  if (scoreTeoriaFluxo > maiorScore && rentabilidadeFluxo >= 52) {
    maiorScore = scoreTeoriaFluxo;
    melhorTeoria = 'Teoria de Fluxo e Estabilidade Local';
    teoriaAtivaKey = 'teoriaFluxoRoxo';
  }

  // Se o ceticismo estiver alto (devido a erros recentes) ou o score for fraco, o operador recua
  let limiarMinimoAceitacao = 65 * indiceCeticismo;

  if (maiorScore < limiarMinimoAceitacao || !teoriaAtivaKey) {
    return registrarSinalESair(
      '🔴 CETICISMO ATIVO / AGUARDAR MESA LIMPA',
      `O operador humano está com pé atrás (Índice de Ceticismo: ${indiceCeticismo.toFixed(2)}). As teorias atuais não superaram a desconfiança pós-resultados.`,
      'N/A',
      '25%',
      winRateFormatado,
      'ESPERA',
      'nenhuma'
    );
  }

  // -------------------------------------------------------------------------
  // 4. FILTROS DE PROTEÇÃO E HESITAÇÃO EXTRA
  // -------------------------------------------------------------------------
  if (penultimaVela && penultimaVela.mult >= 15 && ultimaVela.mult < 1.4) {
    return registrarSinalESair(
      '🔴 HESITAÇÃO / RESSACA IDENTIFICADA',
      `O operador identificou padrão clássico de repique baixo após vela alta e prefere ficar de fora por receio.`,
      'N/A',
      '15%',
      winRateFormatado,
      'ESPERA',
      teoriaAtivaKey
    );
  }

  // -------------------------------------------------------------------------
  // 5. DECISÃO FINAL CONDICIONADA AO RECEIO CALCULADO
  // -------------------------------------------------------------------------
  // Reduz a confiança exibida proporcionalmente ao ceticismo atual do operador
  let confiancaFinal = Math.round((maiorScore / indiceCeticismo) * 0.85);
  confiancaFinal = Math.min(Math.max(confiancaFinal, 30), 88);

  // Mesmo que o score seja alto, se o ceticismo estiver pesado, ele evita dar "Verde Direto" e manda cautela amarela
  if (confiancaFinal >= 68 && indiceCeticismo <= 1.1) {
    return registrarSinalESair(
      '🟢 ENTRADA MODERADA (VALIDADA COM CAUTELA)',
      `Teoria Ativa: "${melhorTeoria}". O operador avaliou o risco e encontrou espaço, mantendo cautela moderada.`,
      '2.00x a 4.00x',
      `${confiancaFinal}%`,
      winRateFormatado,
      'ENTRADA',
      teoriaAtivaKey
    );
  }

  return registrarSinalESair(
    '🟡 OPORTUNIDADE SOB OBSERVAÇÃO (PÉ ATRÁS)',
    `Teoria "${melhorTeoria}" em análise, mas o ceticismo do operador recomenda apenas entradas leves e rápidas.`,
    '1.50x a 2.00x',
    `${confiancaFinal}%`,
    winRateFormatado,
    'ENTRADA',
    teoriaAtivaKey
  );
}

function registrarSinalESair(sinal, motivo, alvo, confianca, taxaAcerto, tipoAcao, teoriaUsada) {
  if (tipoAcao === 'ENTRADA') {
    ultimosSinaisEmitidos.push({ tipo: tipoAcao, teoriaUsada: teoriaUsada, timestamp: Date.now() });
    if (ultimosSinaisEmitidos.length > 15) {
      ultimosSinaisEmitidos.shift();
    }
  }

  return {
    sinal,
    motivo,
    alvo,
    confianca,
    taxaAcerto
  };
}

module.exports = { analisarHistorico };