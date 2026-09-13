/**
 * Motor Avançado de Análise Preditiva - Aviator com Lógica Comportamental Tática
 * Simula a leitura humana de micro-padrões, limites de azuis/roxas e recuo estratégico.
 */

let desempenhoTeorias = {
  teoriaRespiroControlado: { acertos: 5, erros: 2 }, 
  teoriaLimitacaoRoxa:      { acertos: 5, erros: 2 }, 
  teoriaFluxoTatico:        { acertos: 5, erros: 2 }  
};

let ultimosSinaisEmitidos = [];
let indiceCeticismo = 1.0; // Ceticismo flexível e dinâmico

function analisarHistorico(historyData) {
  if (!historyData || historyData.length < 25) {
    return {
      signal: '⚪ AGUARDAR',
      sinal: '⚪ AGUARDAR',
      motivo: 'Mapeando comportamento tático da mesa e limites de azuis (mín. 25 rodadas)...',
      alvo: 'N/A',
      confianca: '0%',
      taxaAcerto: '0.0%'
    };
  }

  // -------------------------------------------------------------------------
  // 0. AVALIAÇÃO INTELIGENTE PÓS-RODADA (HUMANIZADA)
  // -------------------------------------------------------------------------
  const ultimaVela = historyData[0];
  const penultimaVela = historyData[1];
  const antepenultimaVela = historyData[2];
  const deuBomUltimaRodada = ultimaVela.mult >= 2.0;

  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];
    
    if (deuBomUltimaRodada) {
      desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
      // Alivia o ceticismo de forma suave quando a leitura dá certo
      indiceCeticismo = Math.max(0.80, indiceCeticismo - 0.08);
    } else {
      desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
      // Eleva o ceticismo com cautela, sem travar totalmente se houver padrão limpo
      indiceCeticismo = Math.min(1.25, indiceCeticismo + 0.12); 
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
  // 2. LEITURA DE MICRO-PADRÕES E LIMITAÇÕES (COMPORTAMENTO HUMANO)
  // -------------------------------------------------------------------------
  const janelaRecente = historyData.slice(0, 10);
  
  // Conta quantas azuis isoladas ou sequências curtas de azul ocorreram recentemente
  let azuisSeguidasRecentes = 0;
  for (let item of historyData) {
    if (item.mult < 2.0) azuisSeguidasRecentes++;
    else break;
  }

  // Verifica se as roxas estão se limitando (ex: máximo de 2 roxas seguidas antes de um respiro)
  let roxasSeguidas = 0;
  for (let item of historyData) {
    if (item.mult >= 2.0 && item.mult < 10) roxasSeguidas++;
    else break;
  }

  // Identifica se há padrão de "1 azul isolada entre roxas" (micro-padrão de respiro controlado)
  let temPadraoAzulIsolada = (penultimaVela.mult < 2.0 && ultimaVela.mult >= 2.0 && antepenultimaVela.mult >= 2.0);
  let mercadoEstavelRoxas = (roxasSeguidas <= 3 && azuisSeguidasRecentes <= 2);

  // -------------------------------------------------------------------------
  // 3. AVALIAÇÃO DE TEORIAS COM FILTRO TÁTICO
  // -------------------------------------------------------------------------
  function calcularRentabilidade(nomeTeoria) {
    const t = desempenhoTeorias[nomeTeoria];
    const total = t.acertos + t.erros;
    return total > 0 ? (t.acertos / total) * 100 : 50;
  }

  let scoreRespiroControlado = temPadraoAzulIsolada ? 82 : 50;
  let scoreLimitacaoRoxa = mercadoEstavelRoxas ? 78 : 45;
  let scoreFluxoTatico = (azuisSeguidasRecentes === 1) ? 75 : 40;

  let melhorTeoria = 'Nenhuma';
  let maiorScore = 0;
  let teoriaAtivaKey = '';

  if (scoreRespiroControlado > maiorScore && calcularRentabilidade('teoriaRespiroControlado') >= 50) {
    maiorScore = scoreRespiroControlado;
    melhorTeoria = 'Leitura de Respiro Controlado (Azul Isolada)';
    teoriaAtivaKey = 'teoriaRespiroControlado';
  }
  if (scoreLimitacaoRoxa > maiorScore && calcularRentabilidade('teoriaLimitacaoRoxa') >= 50) {
    maiorScore = scoreLimitacaoRoxa;
    melhorTeoria = 'Padrão de Limitação de Roxas/Azuis';
    teoriaAtivaKey = 'teoriaLimitacaoRoxa';
  }
  if (scoreFluxoTatico > maiorScore && calcularRentabilidade('teoriaFluxoTatico') >= 50) {
    maiorScore = scoreFluxoTatico;
    melhorTeoria = 'Fluxo Tático de Retomada';
    teoriaAtivaKey = 'teoriaFluxoTatico';
  }

  // -------------------------------------------------------------------------
  // 4. MECANISMO DE RECUO INTELIGENTE (HORA DE PARAR / EVITAR ARMADILHAS)
  // -------------------------------------------------------------------------
  // Se o mercado estourou para muitas azuis seguidas (quebra de padrão) ou o ceticismo estourou
  if (azuisSeguidasRecentes >= 3 || maiorScore < (58 * indiceCeticismo)) {
    return registrarSinalESair(
      '🛡️ RECUO TÁTICO / OBSERVANDO MESA',
      `O padrão de limitação quebrou (Sequência de azuis: ${azuisSeguidasRecentes}). O operador humano recua estrategicamente para evitar armadilhas até surgir nova oportunidade.`,
      'N/A',
      '30%',
      winRateFormatado,
      'ESPERA',
      'nenhuma'
    );
  }

  // -------------------------------------------------------------------------
  // 5. DECISÃO DE ENTRADA CALIBRADA
  // -------------------------------------------------------------------------
  let confiancaFinal = Math.round((maiorScore / indiceCeticismo) * 0.90);
  confiancaFinal = Math.min(Math.max(confiancaFinal, 35), 89);

  if (confiancaFinal >= 65) {
    return registrarSinalESair(
      '🟢 OPORTUNIDADE TÁTICA IDENTIFICADA',
      `Padrão validado ("${melhorTeoria}"). O comportamento da mesa indica respeito aos limites de velas baixas. Entrada controlada recomendada.`,
      '2.00x a 3.50x',
      `${confiancaFinal}%`,
      winRateFormatado,
      'ENTRADA',
      teoriaAtivaKey
    );
  }

  return registrarSinalESair(
    '🟡 AGUARDANDO CONFIRMAÇÃO DO PADRÃO',
    `Mercado sob observação atenta. A teoria "${melhorTeoria}" está montando estrutura, mas exige cautela antes de arriscar capital.`,
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