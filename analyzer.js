/**
 * Motor Avançado de Análise Tática e Preditiva - Mentalidade de Trader (Aviator/Spribe)
 */

let desempenhoTeorias = {
  cicloLimpoAposExaustao: { acertos: 5, erros: 2 }, 
  respiroControladoPosAzuis: { acertos: 5, erros: 2 }, 
  fluxoHarmonicoTatico: { acertos: 5, erros: 2 }  
};

let ultimosSinaisEmitidos = [];
let indiceCeticismo = 1.0; 
let historicoReflexoes = [];

function analisarHistorico(historyData) {
  // Garantir massa crítica mínima de dados para leitura de ciclos (25 rodadas)
  if (!historyData || historyData.length < 25) {
    const jsonEsperaInicial = {
      acao: "ESPERA",
      sinal: "Mapeando o fluxo e a respiração inicial da mesa...",
      motivo: "Aguardando massa crítica de dados (mínimo de 25 rodadas) para leitura segura de ciclos.",
      alvo: "N/A",
      confianca: "0",
      reflexao: "Aguardando contexto estrutural para iniciar autocrítica e avaliação de risco.",
      nivel_ceticismo: "alto"
    };
    return formatarRetornoServidor(jsonEsperaInicial, historyData || []);
  }

  const ultimaVela = historyData[0];
  const penultimaVela = historyData[1];
  const antepenultimaVela = historyData[2];
  const deuBomUltimaRodada = ultimaVela.mult >= 2.0;

  // 1. Processo contínuo de autocrítica e aprendizado com erros/acertos anteriores
  let reflexaoAtual = 'Analisando fluxo natural e batimento da mesa...';
  
  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];
    
    if (ultimoSinal.tipoAcao === 'ENTRADA') {
      if (deuBomUltimaRodada) {
        desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
        reflexaoAtual = `Autocrítica Positiva: Entrada validada com sucesso! Alvo atingido (${ultimaVela.mult}x). Ciclo respeitou a tese.`;
      } else {
        desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
        reflexaoAtual = `Autocrítica de Erro: A entrada falhou (${ultimaVela.mult}x). O padrão quebrou a cadência esperada; elevando ceticismo.`;
      }
    } else {
      if (deuBomUltimaRodada) {
        reflexaoAtual = `Reflexão Tática: Fiquei de fora e a mesa pagou ${ultimaVela.mult}x. Oportunidade escapou, mas preservação de capital prevaleceu sobre o arrependimento.`;
      } else {
        reflexaoAtual = `Reflexão Tática: Excelente leitura! Evitei um ciclo poluído ou armadilha (${ultimaVela.mult}x) ficando de fora.`;
      }
    }

    historicoReflexoes.push({ rodada: historyData.length, texto: reflexaoAtual });
    if (historicoReflexoes.length > 10) historicoReflexoes.shift();

    // Calibragem adaptativa do ceticismo baseada no comportamento recente
    if (deuBomUltimaRodada) {
      if (ultimaVela.mult >= 10.0) {
        indiceCeticismo = Math.min(1.25, indiceCeticismo + 0.05); // Pico alto recente deixa o trader mais cauteloso
      } else {
        indiceCeticismo = Math.max(0.85, indiceCeticismo - 0.04);
      }
    } else {
      indiceCeticismo = Math.min(1.35, indiceCeticismo + 0.08); // Sequência ruim aumenta o ceticismo defensivo
    }
  }

  // 2. Leitura tática do contexto das últimas 8 a 25 rodadas (Ciclos e Ruído)
  let azuisSeguidasRecentes = 0;
  for (let item of historyData) {
    if (item.mult < 2.0) azuisSeguidasRecentes++;
    else break;
  }

  let janelaRecente = historyData.slice(0, 10);
  let quantidadeAzuisJanela = janelaRecente.filter(i => i.mult < 2.0).length;
  let proporcaoAzuis = quantidadeAzuisJanela / janelaRecente.length;
  
  // Diagnóstico do ambiente da mesa
  let ambientePoluido = proporcaoAzuis >= 0.60 || azuisSeguidasRecentes >= 4;
  let acabouDeDarPicoAlto = penultimaVela.mult >= 15.0 || antepenultimaVela.mult >= 15.0;
  let quebraDeCadencia = penultimaVela.mult >= 10.0 && ultimaVela.mult < 2.0;

  let acaoDecidida = "ENTRADA";
  let teoriaUtilizada = "respiroControladoPosAzuis";
  let sinalTexto = "Oportunidade tática limpa identificada após respiro controlado.";
  let motivoTexto = "A mesa acabou de limpar um ciclo poluído e apresenta um respiro estruturado e harmônico nas últimas velas.";
  let alvoTexto = "2.00x ~ 3.50x";
  let confiancaNumerica = 78;
  let nivelCeticismoStr = "moderado";

  // 3. Aplicação rigorosa da preservação de capital e filtragem de ruído
  if (ambientePoluido) {
    acaoDecidida = "ESPERA";
    teoriaUtilizada = "nenhuma";
    sinalTexto = "Mesa poluída e densa de azuis; mantendo capital seguro.";
    motivoTexto = "Excesso de velas baixas recentes indica exaustão ou distribuição instável. Prefiro ficar de fora do que cair em armadilha.";
    alvoTexto = "N/A";
    confiancaNumerica = 35;
    nivelCeticismoStr = "alto";
  } else if (acabouDeDarPicoAlto) {
    acaoDecidida = "ESPERA";
    teoriaUtilizada = "nenhuma";
    sinalTexto = "Cautela após pico alto recente.";
    motivoTexto = "Esse pico alto recente me deixa mais cauteloso. A mesa tende a entrar em fase de absorção e retração.";
    alvoTexto = "N/A";
    confiancaNumerica = 40;
    nivelCeticismoStr = "alto";
  } else if (quebraDeCadencia) {
    acaoDecidida = "ESPERA";
    teoriaUtilizada = "nenhuma";
    sinalTexto = "Aguardando estabilização pós-quebra de padrão.";
    motivoTexto = "O padrão anterior quebrou abruptamente. Prefiro esperar a mesa mostrar mais intenção e desenhar um novo ciclo.";
    alvoTexto = "N/A";
    confiancaNumerica = 45;
    nivelCeticismoStr = "alto";
  } else {
    // Calculo de confiança ajustado pelo ceticismo dinâmico
    let scoreBase = 65;
    if (azuisSeguidasRecentes <= 1) scoreBase += 15;
    if (ultimaVela.mult >= 2.0 && ultimaVela.mult < 6.0) scoreBase += 10;

    let confFinal = Math.round((scoreBase / indiceCeticismo) * 0.95);
    confiancaNumerica = Math.min(Math.max(confFinal, 25), 90);

    if (confiancaNumerica < 62) {
      acaoDecidida = "ESPERA";
      teoriaUtilizada = "nenhuma";
      sinalTexto = "Cenário ambíguo; mantendo postura defensiva.";
      motivoTexto = "Quando estou em dúvida ou a mesa está ambígua, o protocolo exige aguardar. Nenhuma vantagem tática clara no momento.";
      alvoTexto = "N/A";
      nivelCeticismoStr = "alto";
    } else {
      nivelCeticismoStr = indiceCeticismo > 1.1 ? "moderado" : "baixo";
    }
  }

  // Montagem do objeto estrito de resposta exigido pela tática
  const jsonDecisao = {
    acao: acaoDecidida,
    sinal: sinalTexto,
    motivo: motivoTexto,
    alvo: alvoTexto,
    confianca: confiancaNumerica.toString(),
    reflexao: reflexaoAtual,
    nivel_ceticismo: nivelCeticismoStr
  };

  return formatarRetornoServidor(jsonDecisao, historyData, teoriaUtilizada);
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

function formatarRetornoServidor(jsonDecisao, historyData, teoriaUsada = 'nenhuma') {
  // Registo de sinal para controle de feedback na próxima rodada
  ultimosSinaisEmitidos.push({ 
    tipoAcao: jsonDecisao.acao, 
    teoriaUsada: teoriaUsada, 
    timestamp: Date.now() 
  });
  if (ultimosSinaisEmitidos.length > 30) ultimosSinaisEmitidos.shift();

  // Feedback automático na primeira vela do histórico com base no resultado real
  if (historyData.length > 1) {
    const sinalAnterior = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 2];
    if (sinalAnterior && sinalAnterior.tipoAcao === 'ENTRADA') {
      if (!historyData[0].statusFeedback || historyData[0].statusFeedback === 'neutro') {
        historyData[0].statusFeedback = historyData[0].mult >= 2.00 ? 'acerto' : 'erro';
      }
    } else {
      if (!historyData[0].statusFeedback) {
        historyData[0].statusFeedback = 'neutro';
      }
    }
  }

  let historyComFeedback = historyData.map((vela) => {
    return {
      ...vela,
      statusFeedback: vela.statusFeedback || 'neutro'
    };
  });

  // Win Rate Global computado das últimas amostras
  let acertosGlobais = 0;
  let totalAmostras = Math.min(40, historyData.length);
  for (let i = 0; i < totalAmostras; i++) {
    if (historyData[i].mult >= 2.00) acertosGlobais++;
  }
  let winRateCalculado = totalAmostras > 0 ? (acertosGlobais / totalAmostras) * 100 : 65.0;
  const taxaAcertoFormatada = `${winRateCalculado.toFixed(1)}%`;

  // Retorno compatível com o bot executor (`acao`) e propriedades informativas para o dashboard
  return {
    acao: jsonDecisao.acao,
    sinal: jsonDecisao.sinal,
    motivo: jsonDecisao.motivo,
    alvo: jsonDecisao.alvo,
    confianca: `${jsonDecisao.confianca}%`,
    taxaAcerto: taxaAcertoFormatada,
    estatisticasFaixas: calcularEstatisticasFaixas(historyData),
    reflexaoHumana: jsonDecisao.reflexao,
    historicoComFeedback: historyComFeedback
  };
}

module.exports = { analisarHistorico };