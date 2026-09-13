/**
 * Motor Avançado de Análise Preditiva - Com Confluência de Fatores (Casas, Minutagem e Fluxo)
 */

let desempenhoTeorias = {
  teoriaRespiroControlado: { acertos: 5, erros: 2 }, 
  teoriaLimitacaoRoxa:       { acertos: 5, erros: 2 }, 
  teoriaFluxoTatico:         { acertos: 5, erros: 2 }  
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

  // Ajuste dinâmico do ceticismo com base no comportamento de picos
  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];
    
    if (deuBomUltimaRodada) {
      desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
      if (foiVelaAltaUltima) {
        // Pós-vela alta exige um respiro saudável, sem travar o trader, mas dosando o otimismo
        indiceCeticismo = Math.min(1.15, indiceCeticismo + 0.04); 
      } else {
        indiceCeticismo = Math.max(0.85, indiceCeticismo - 0.05);
      }
    } else {
      desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
      indiceCeticismo = Math.min(1.30, indiceCeticismo + 0.10); 
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

  // --- ANÁLISE DE CONFLUÊNCIA DE FATORES (ESTILO HUMANO) ---
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

  // Verificando padrão estrutural de respiro e limites
  let temPadraoAzulIsolada = (penultimaVela.mult < 2.0 && ultimaVela.mult >= 2.0 && antepenultimaVela.mult >= 2.0);
  let mercadoEstavelRoxas = (roxasSeguidas <= 3 && azuisSeguidasRecentes <= 2);

  // Verificação de confluência de histórico de velas rosas recentes (Espelho / Fluxo Quente)
  let rosasRecentesNoHistorico = historyData.slice(0, 15).filter(i => i.mult >= 10).length;
  let temHistoricoEspelhoQuente = rosasRecentesNoHistorico >= 2; // Se já entregou mais de uma rosa recentemente, há indício de corredor ativo

  // Atribuição de pontos por teoria considerando confluência
  let scoreRespiroControlado = temPadraoAzulIsolada ? 80 : 45;
  let scoreLimitacaoRoxa = mercadoEstavelRoxas ? 75 : 40;
  let scoreFluxoTatico = (azuisSeguidasRecentes === 1) ? 70 : 35;

  // Se houver confluência com histórico quente de velas altas, damos um bônus analítico de convergência
  if (temHistoricoEspelhoQuente && mercadoEstavelRoxas) {
    scoreRespiroControlado += 12;
    scoreLimitacaoRoxa += 10;
  }

  let maiorScore = Math.max(scoreRespiroControlado, scoreLimitacaoRoxa, scoreFluxoTatico);

  // Critério de recuo se o mercado estiver truncado (muitas azuis seguidas) ou score abaixo do ceticismo
  if (azuisSeguidasRecentes >= 3 || maiorScore < (60 * indiceCeticismo)) {
    return registrarSinalESair(
      '🛡️ RECUO TÁTICO / OBSERVANDO MESA',
      `Fatores desalinhados (Azuis seguidas: ${azuisSeguidasRecentes}). Aguardando confluência limpa.`,
      'N/A',
      '32%',
      winRateFormatado,
      'ESPERA',
      'nenhuma',
      historyData
    );
  }

  let confiancaFinal = Math.round((maiorScore / indiceCeticismo) * 0.92);
  confiancaFinal = Math.min(Math.max(confiancaFinal, 35), 91);

  // Se a confluência e a confiança atingirem o patamar analítico exigido, libera a entrada focada em buscar o alvo tático
  if (confiancaFinal >= 65) {
    return registrarSinalESair(
      '🟢 OPORTUNIDADE TÁTICA IDENTIFICADA',
      'Confluência favorável: padrão comportamental e métricas de mesa alinhados.',
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
    'Mesa em observação; aguardando fechamento dos fatores secundários.',
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