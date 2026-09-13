/**
 * Motor Avançado de Análise Preditiva - Com faixas ajustadas (10-50, 50-100, 100-999, 1000+)
 */

let desempenhoTeorias = {
  teoriaRespiroControlado: { acertos: 5, erros: 2 }, 
  teoriaLimitacaoRoxa:      { acertos: 5, erros: 2 }, 
  teoriaFluxoTatico:        { acertos: 5, erros: 2 }  
};

let ultimosSinaisEmitidos = [];
let indiceCeticismo = 1.0; 

function analisarHistorico(historyData) {
  if (!historyData || historyData.length < 25) {
    return {
      signal: '⚪ AGUARDAR',
      sinal: '⚪ AGUARDAR',
      motivo: 'Mapeando comportamento tático e faixas de velas altas (mín. 25 rodadas)...',
      alvo: 'N/A',
      confianca: '0%',
      taxaAcerto: '0.0%',
      estatisticasFaixas: calcularEstatisticasFaixas(historyData || [])
    };
  }

  const ultimaVela = historyData[0];
  const penultimaVela = historyData[1];
  const antepenultimaVela = historyData[2];
  const deuBomUltimaRodada = ultimaVela.mult >= 2.0;

  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];
    if (deuBomUltimaRodada) {
      desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
      indiceCeticismo = Math.max(0.80, indiceCeticismo - 0.08);
    } else {
      desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
      indiceCeticismo = Math.min(1.25, indiceCeticismo + 0.12); 
    }
  }

  // Win Rate Global
  let acertosGlobais = 0;
  let totalAmostras = Math.min(40, historyData.length - 2);
  for (let i = 0; i < totalAmostras; i++) {
    if (historyData[i].mult >= 2.00) acertosGlobais++;
  }
  let winRateCalculado = totalAmostras > 0 ? (acertosGlobais / totalAmostras) * 100 : 65.0;
  winRateCalculado = Math.min(Math.max(winRateCalculado, 35.0), 90.0);
  const winRateFormatado = `${winRateCalculado.toFixed(1)}%`;

  // Leitura de Micro-padrões
  let azuisSeguidasRecentes = 0;
  for (let item of historyData) {
    if (item.mult < 2.0) azuisSeguidasRecentes++;
    else break;
  }

  let roxasSeguidas = 0;
  for (let item of historyData) {
    if (item.mult >= 2.0 && item.mult < 10) roxasSeguidas++;
    else break;
  }

  let temPadraoAzulIsolada = (penultimaVela.mult < 2.0 && ultimaVela.mult >= 2.0 && antepenultimaVela.mult >= 2.0);
  let mercadoEstavelRoxas = (roxasSeguidas <= 3 && azuisSeguidasRecentes <= 2);

  let scoreRespiroControlado = temPadraoAzulIsolada ? 82 : 50;
  let scoreLimitacaoRoxa = mercadoEstavelRoxas ? 78 : 45;
  let scoreFluxoTatico = (azuisSeguidasRecentes === 1) ? 75 : 40;

  let maiorScore = Math.max(scoreRespiroControlado, scoreLimitacaoRoxa, scoreFluxoTatico);

  if (azuisSeguidasRecentes >= 3 || maiorScore < (58 * indiceCeticismo)) {
    return registrarSinalESair(
      '🛡️ RECUO TÁTICO / OBSERVANDO MESA',
      `Quebra de padrão detectada (Azuis seguidas: ${azuisSeguidasRecentes}). Recuo estratégico ativado.`,
      'N/A',
      '30%',
      winRateFormatado,
      'ESPERA',
      'nenhuma',
      historyData
    );
  }

  let confiancaFinal = Math.round((maiorScore / indiceCeticismo) * 0.90);
  confiancaFinal = Math.min(Math.max(confiancaFinal, 35), 89);

  if (confiancaFinal >= 65) {
    return registrarSinalESair(
      '🟢 OPORTUNIDADE TÁTICA IDENTIFICADA',
      'Padrão comportamental de respiro e limites respeitado na mesa.',
      '2.00x a 3.50x',
      `${confiancaFinal}%`,
      winRateFormatado,
      'ENTRADA',
      'teoriaRespiroControlado',
      historyData
    );
  }

  return registrarSinalESair(
    '🟡 AGUARDANDO CONFIRMAÇÃO',
    'Mercado em observação para nova oportunidade limpa.',
    '1.50x a 2.00x',
    `${confiancaFinal}%`,
    winRateFormatado,
    'ENTRADA',
    'teoriaRespiroControlado',
    historyData
  );
}

// Cálculo focado nas novas faixas solicitadas
function calcularEstatisticasFaixas(historyData) {
  let resultado = {
    faixa10_50: { velas: '-', tempo: 'Nenhum' },
    faixa50_100: { velas: '-', tempo: 'Nenhum' },
    faixa100_999: { velas: '-', tempo: 'Nenhum' },
    faixa1000: { velas: '-', tempo: 'Nenhum' }
  };

  let idx10 = historyData.findIndex(i => i.mult >= 10 && i.mult < 50);
  let idx50 = historyData.findIndex(i => i.mult >= 50 && i.mult < 100);
  let idx100 = historyData.findIndex(i => i.mult >= 100 && i.mult < 1000);
  let idx1000 = historyData.findIndex(i => i.mult >= 1000);

  if (idx10 !== -1) {
    resultado.faixa10_50 = { velas: idx10, tempo: estimarTempo(idx10) };
  }
  if (idx50 !== -1) {
    resultado.faixa50_100 = { velas: idx50, tempo: estimarTempo(idx50) };
  }
  if (idx100 !== -1) {
    resultado.faixa100_999 = { velas: idx100, tempo: estimarTempo(idx100) };
  }
  if (idx1000 !== -1) {
    resultado.faixa1000 = { velas: idx1000, tempo: estimarTempo(idx1000) };
  }

  return resultado;
}

function estimarTempo(qtdVelas) {
  let segundosTotais = qtdVelas * 25; // Média estimada de segundos por rodada
  let minutos = Math.floor(segundosTotais / 60);
  if (minutos < 1) return `${segundosTotais}s`;
  let horas = Math.floor(minutos / 60);
  if (horas < 1) return `${minutos}m`;
  let minsRestantes = minutos % 60;
  return `${horas}h ${minsRestantes}m`;
}

function registrarSinalESair(sinal, motivo, alvo, confianca, taxaAcerto, tipoAcao, teoriaUsada, historyData) {
  if (tipoAcao === 'ENTRADA') {
    ultimosSinaisEmitidos.push({ tipo: tipoAcao, teoriaUsada, timestamp: Date.now() });
    if (ultimosSinaisEmitidos.length > 15) ultimosSinaisEmitidos.shift();
  }

  return {
    sinal,
    motivo,
    alvo,
    confianca,
    taxaAcerto,
    estatisticasFaixas: calcularEstatisticasFaixas(historyData)
  };
}

module.exports = { analisarHistorico };