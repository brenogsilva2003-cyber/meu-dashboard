/**
 * Motor Avançado de Análise Preditiva - Com Leitura de Ciclos, Quebra de Contexto e Fluidez Humana
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
        indiceCeticismo = Math.min(1.15, indiceCeticismo + 0.04); // Respiro maior pós-pico (fim de ciclo natural)
      } else {
        indiceCeticismo = Math.max(0.85, indiceCeticismo - 0.05);
      }
    } else {
      desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
      indiceCeticismo = Math.min(1.30, indiceCeticismo + 0.09); 
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

  // --- ANÁLISE DE CICLOS E QUEBRA DE CONTEXTO ---
  let azuisSeguidasRecentes = 0;
  for (let item of historyData) {
    if (item.mult < 2.0) azuisSeguidasRecentes++;
    else break;
  }

  // Identifica se a última rodada foi um pico expressivo (Fim de Ciclo / Exaustão da Mesa)
  let acabouDeDarPicoAlto = (penultimaVela.mult >= 15.0 || antepenultimaVela.mult >= 15.0);

  // Identifica quebra de padrão orgânica (Ex: Logo após um momento bom, vem uma azul traiçoeira que quebra a cadência)
  let quebraDePadraoRecente = (penultimaVela.mult >= 10.0 && ultimaVela.mult < 2.0) || 
                              (azuisSeguidasRecentes >= 2 && penultimaVela.mult < 2.0);

  // Percentual de poluição do ambiente recente
  let janelaRecente = historyData.slice(0, 6);
  let quantidadeAzuisJanela = janelaRecente.filter(i => i.mult < 2.0).length;
  let proporcaoAzuis = quantidadeAzuisJanela / janelaRecente.length;
  let ambientePoluido = proporcaoAzuis >= 0.55;

  // RECUO TÁTICO POR FIM DE CICLO OU QUEBRA DE VALIDADE:
  // Se a mesa acabou de pagar um pico alto (ex: 20x+) e desandou, ou se o padrão quebrou, o robô entende que o ciclo expirou.
  if (acabouDeDarPicoAlto || quebraDePadraoRecente || ambientePoluido) {
    return registrarSinalESair(
      '🛡️ RECUO TÁTICO / FIM DE CICLO',
      `Ciclo anterior encerrado (pico recente ou quebra de cadência identificada). Aguardando nova estrutura.`,
      'N/A',
      '20%',
      winRateFormatado,
      'ESPERA',
      'nenhuma',
      historyData
    );
  }

  // Fatores de oportunidade limpa para um NOVO ciclo
  let temPadraoRespiro = (penultimaVela.mult < 2.0 && ultimaVela.mult >= 2.0 && antepenultimaVela.mult >= 2.0);
  let rosasRecentesNoHistorico = historyData.slice(0, 15).filter(i => i.mult >= 10).length;
  let temFluxoQuente = rosasRecentesNoHistorico >= 1; 

  let scoreBase = 45;
  if (temPadraoRespiro) scoreBase += 25;
  if (temFluxoQuente) scoreBase += 20;
  if (azuisSeguidasRecentes === 0 || azuisSeguidasRecentes === 1) scoreBase += 15;

  let confiancaFinal = Math.round((scoreBase / indiceCeticismo) * 0.95);
  confiancaFinal = Math.min(Math.max(confiancaFinal, 30), 92);

  // Libera entrada apenas se houver harmonia real no novo ciclo
  if (confiancaFinal >= 65 && !ambientePoluido) {
    return registrarSinalESair(
      '🟢 OPORTUNIDADE TÁTICA IDENTIFICADA',
      'Novo ciclo estruturado e harmônico detectado na mesa.',
      '2.00x a 4.00x',
      `${confiancaFinal}%`,
      winRateFormatado,
      'ENTRADA',
      'teoriaRespiroControlado',
      historyData
    );
  }

  return registrarSinalESair(
    '🟡 AGUARDANDO NOVO CICLO',
    'Mesa em transição pós-movimento; aguardando desenho de nova oportunidade.',
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