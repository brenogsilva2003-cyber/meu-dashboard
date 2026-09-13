/**
 * Motor Avançado de Análise Preditiva - Com Pressão Azul Proporcional e Anti-Falso Alívio
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
  const foiVelaAltaUltima = ultimaVela.mult >= 10.0;

  // Ajuste dinâmico do ceticismo de forma suave
  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];
    
    if (deuBomUltimaRodada) {
      desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
      if (foiVelaAltaUltima) {
        indiceCeticismo = Math.min(1.10, indiceCeticismo + 0.03); 
      } else {
        indiceCeticismo = Math.max(0.85, indiceCeticismo - 0.05);
      }
    } else {
      desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
      indiceCeticismo = Math.min(1.25, indiceCeticismo + 0.08); 
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

  // --- ANÁLISE DE MESA COM DENSIDADE PROPORCIONAL (SEM ENGESSAMENTO) ---
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

  // Avaliação proporcional do bloco recente (janela flexível de análise de peso)
  let janelaRecente = historyData.slice(0, 7);
  let quantidadeAzuisJanela = janelaRecente.filter(i => i.mult < 2.0).length;
  let proporcaoAzuis = quantidadeAzuisJanela / janelaRecente.length; // Mede o percentual de poluição da mesa

  // Detecção orgânica de "Falso Alívio" (Roxa fraca isolada no meio de um ambiente majoritariamente azul)
  let ehRoxaFraca = (ultimaVela.mult >= 2.0 && ultimaVela.mult < 3.2);
  let ambientePoluido = proporcaoAzuis >= 0.55; // Se mais de 55% das últimas velas foram azuis, o ambiente está pesado
  let falsoAlivioDetectado = (ehRoxaFraca && ambientePoluido);

  // Detector de oscilação errática / ruído pesado
  let oscilacoesErraticas = 0;
  for (let i = 0; i < Math.min(5, historyData.length - 1); i++) {
    let atual = historyData[i].mult;
    let proxima = historyData[i+1].mult;
    if ((atual < 2.0 && proxima >= 5.0) || (atual >= 5.0 && proxima < 2.0)) {
      oscilacoesErraticas++;
    }
  }

  // RECUO TÁTICO PROPORCIONAL: Se a mesa estiver muito azulada ou rosnando falso alívio, recua sem travas rígidas de contagem
  if (azuisSeguidasRecentes >= 3 || ambientePoluido || falsoAlivioDetectado) {
    return registrarSinalESair(
      '🛡️ RECUO TÁTICO / OBSERVANDO MESA',
      `Ambiente com alta densidade de azuis (${Math.round(proporcaoAzuis * 100)}%) ou falso alívio detectado. Recuo preventivo.`,
      'N/A',
      '25%',
      winRateFormatado,
      'ESPERA',
      'nenhuma',
      historyData
    );
  }

  // Fatores de oportunidade real (comportamento limpo)
  let temPadraoRespiro = (penultimaVela.mult < 2.0 && ultimaVela.mult >= 2.0 && antepenultimaVela.mult >= 2.0);
  let mercadoEstavelRoxas = (roxasSeguidas <= 4 && azuisSeguidasRecentes <= 2);
  let rosasRecentesNoHistorico = historyData.slice(0, 15).filter(i => i.mult >= 10).length;
  let temFluxoQuente = rosasRecentesNoHistorico >= 1; 

  let scoreBase = 50;
  if (temPadraoRespiro) scoreBase += 20;
  if (mercadoEstavelRoxas) scoreBase += 15;
  if (temFluxoQuente) scoreBase += 15;
  if (azuisSeguidasRecentes === 1) scoreBase += 10;

  if (oscilacoesErraticas >= 2) {
    scoreBase -= 20; 
  }

  let confiancaFinal = Math.round((scoreBase / indiceCeticismo) * 0.95);
  confiancaFinal = Math.min(Math.max(confiancaFinal, 35), 92);

  if (confiancaFinal >= 65) {
    return registrarSinalESair(
      '🟢 OPORTUNIDADE TÁTICA IDENTIFICADA',
      'Conjunto limpo de fatores e fluxo dinâmico confirmado.',
      '2.00x a 4.00x',
      `${confiancaFinal}%`,
      winRateFormatado,
      'ENTRADA',
      'teoriaRespiroControlado',
      historyData
    );
  }

  return registrarSinalESair(
    '🟡 AGUARDANDO CONFIRMAÇÃO',
    'Mesa em transição; aguardando melhor alinhamento dinâmico.',
    '1.50x a 2.00x',
    `${confiancaFinal}%`,
    winRateFormatado,
    'ENTRADA',
    'teoriaRespiroControlado',
    historyData
  );
}

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

  if (idx10 !== -1) resultado.faixa10_50 = { velas: idx10, tempo: estimarTempo(idx10) };
  if (idx50 !== -1) resultado.faixa50_100 = { velas: idx50, tempo: estimarTempo(idx50) };
  if (idx100 !== -1) resultado.faixa100_999 = { velas: idx100, tempo: estimarTempo(idx100) };
  if (idx1000 !== -1) resultado.faixa1000 = { velas: idx1000, tempo: estimarTempo(idx1000) };

  return resultado;
}

function estimarTempo(qtdVelas) {
  let segundosTotais = qtdVelas * 25; 
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