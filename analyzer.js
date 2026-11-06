/**
 * Motor Avançado de Análise Tática e Preditiva - Mentalidade de Trader (Aviator/Spribe)
 * Versão Híbrida Otimizada: Estatística + Similaridade de Sequências + Peso Real de Teorias + Autocrítica
 */

let desempenhoTeorias = {
  cicloLimpoAposExaustao: { acertos: 5, erros: 2 },
  respiroControladoPosAzuis: { acertos: 5, erros: 2 },
  fluxoHarmonicoTatico: { acertos: 5, erros: 2 }
};

let ultimosSinaisEmitidos = [];
let indiceCeticismo = 1.0;
let historicoReflexoes = [];

// ====================== HELPERS DE CLASSIFICAÇÃO ======================

function classificarVela(mult) {
  if (mult < 2.0) return 'azul';
  if (mult >= 10.0) return 'alta';
  return 'roxa';
}

function vetorizarSequencia(historyData, tamanho = 8) {
  const fatia = historyData.slice(0, tamanho);
  return fatia.map(v => classificarVela(v.mult));
}

function calcularSimilaridade(vetorA, vetorB) {
  if (!vetorA.length || !vetorB.length || vetorA.length !== vetorB.length) return 0;
  let iguais = 0;
  for (let i = 0; i < vetorA.length; i++) {
    if (vetorA[i] === vetorB[i]) iguais++;
  }
  return iguais / vetorA.length;
}

// ====================== CAMADA 1: ESTATÍSTICA BÁSICA ======================

function calcularEstatisticasBasicas(historyData) {
  const janela10 = historyData.slice(0, 10);
  const janela20 = historyData.slice(0, 20);
  const janela50 = historyData.slice(0, Math.min(50, historyData.length));

  const densAzuis10 = janela10.filter(v => v.mult < 2.0).length / (janela10.length || 1);
  const densAzuis20 = janela20.filter(v => v.mult < 2.0).length / (janela20.length || 1);
  const densAzuis50 = janela50.filter(v => v.mult < 2.0).length / (janela50.length || 1);

  let azuisSeguidas = 0;
  for (const item of historyData) {
    if (item.mult < 2.0) azuisSeguidas++;
    else break;
  }

  const ultimas8 = historyData.slice(0, 8);
  let alternancias = 0;
  for (let i = 0; i < ultimas8.length - 1; i++) {
    const a = classificarVela(ultimas8[i].mult);
    const b = classificarVela(ultimas8[i + 1].mult);
    if (a !== b) alternancias++;
  }
  const volatilidadeCurta = alternancias / Math.max(1, ultimas8.length - 1);

  const indicesAltos = [];
  historyData.forEach((v, idx) => {
    if (v.mult >= 10.0) indicesAltos.push(idx);
  });
  let intervaloMedioPicos = null;
  if (indicesAltos.length >= 2) {
    let soma = 0;
    for (let i = 0; i < indicesAltos.length - 1; i++) {
      soma += (indicesAltos[i + 1] - indicesAltos[i]);
    }
    intervaloMedioPicos = soma / (indicesAltos.length - 1);
  }

  const rodadasDesdeUltimoPico = historyData.findIndex(v => v.mult >= 10.0);
  const desdeUltimoPico = rodadasDesdeUltimoPico === -1 ? historyData.length : rodadasDesdeUltimoPico;

  return {
    densAzuis10,
    densAzuis20,
    densAzuis50,
    azuisSeguidas,
    volatilidadeCurta,
    intervaloMedioPicos,
    desdeUltimoPico,
    ambientePoluido: densAzuis10 >= 0.60 || azuisSeguidas >= 4 || volatilidadeCurta >= 0.75
  };
}

// ====================== CAMADA 2: MEMÓRIA DE PADRÕES SEMELHANTES ======================

function buscarPadroesSemelhantes(historyData, tamanhoJanela = 8, minimoSimilaridade = 0.75) {
  if (historyData.length < tamanhoJanela + 20) {
    return { amostras: 0, taxaPagou2x: null, taxaQuebrou: null, confiancaEmpirica: 0 };
  }

  const vetorAtual = vetorizarSequencia(historyData, tamanhoJanela);
  let amostrasUteis = 0;
  let pagou2x = 0;
  let quebrou = 0;

  // Limite de segurança para varredura de histórico (evita overhead)
  const limiteBusca = Math.min(historyData.length - tamanhoJanela - 1, 150);

  for (let i = tamanhoJanela; i < limiteBusca; i++) {
    const fatiaPassada = historyData.slice(i, i + tamanhoJanela);
    const vetorPassado = fatiaPassada.map(v => classificarVela(v.mult));
    const sim = calcularSimilaridade(vetorAtual, vetorPassado);

    if (sim >= minimoSimilaridade) {
      // Correção estrutural: no array ordenado decrescente (0 = recente), 
      // a vela que aconteceu imediatamente após o bloco no passado está no índice (i - 1)
      const indexApos = i - 1;
      if (indexApos >= 0 && historyData[indexApos]) {
        amostrasUteis++;
        const velaApos = historyData[indexApos];
        if (velaApos.mult >= 2.0) pagou2x++;
        else quebrou++;
      }
    }
  }

  if (amostrasUteis < 3) {
    return { amostras: amostrasUteis, taxaPagou2x: null, taxaQuebrou: null, confiancaEmpirica: 0 };
  }

  const taxaPagou2x = pagou2x / amostrasUteis;
  const taxaQuebrou = quebrou / amostrasUteis;
  const confiancaEmpirica = Math.min(0.95, (amostrasUteis / 15) * Math.abs(taxaPagou2x - 0.5) * 2);

  return {
    amostras: amostrasUteis,
    taxaPagou2x,
    taxaQuebrou,
    confiancaEmpirica
  };
}

// ====================== CAMADA 3: PESO REAL DAS TEORIAS ======================

function obterWinRateTeoria(nomeTeoria) {
  const t = desempenhoTeorias[nomeTeoria];
  if (!t) return 0.5;
  const total = t.acertos + t.erros;
  if (total < 4) return 0.55; 
  return t.acertos / total;
}

function escolherMelhorTeoria(stats, padraoSimilar) {
  const candidatos = [];

  if (stats.azuisSeguidas >= 2 && stats.azuisSeguidas <= 4 && !stats.ambientePoluido) {
    candidatos.push({ nome: 'respiroControladoPosAzuis', pesoBase: 1.15 });
  }
  if (stats.densAzuis20 >= 0.55 && stats.densAzuis10 < 0.45) {
    candidatos.push({ nome: 'cicloLimpoAposExaustao', pesoBase: 1.20 });
  }
  if (stats.volatilidadeCurta < 0.45 && stats.densAzuis10 < 0.40) {
    candidatos.push({ nome: 'fluxoHarmonicoTatico', pesoBase: 1.10 });
  }

  if (candidatos.length === 0) {
    const teorias = Object.keys(desempenhoTeorias);
    let melhor = teorias[0];
    let melhorWR = obterWinRateTeoria(melhor);
    for (const t of teorias) {
      const wr = obterWinRateTeoria(t);
      if (wr > melhorWR) {
        melhorWR = wr;
        melhor = t;
      }
    }
    return { nome: melhor, winRate: melhorWR, bonus: 1.0 };
  }

  let escolhido = candidatos[0];
  let melhorScore = obterWinRateTeoria(escolhido.nome) * escolhido.pesoBase;

  for (const c of candidatos) {
    const score = obterWinRateTeoria(c.nome) * c.pesoBase;
    if (score > melhorScore) {
      melhorScore = score;
      escolhido = c;
    }
  }

  const wr = obterWinRateTeoria(escolhido.nome);
  let bonus = 1.0;
  if (wr >= 0.70) bonus = 1.18;
  else if (wr >= 0.58) bonus = 1.08;
  else if (wr < 0.42) bonus = 0.72; 

  return { nome: escolhido.nome, winRate: wr, bonus };
}

// ====================== FUNÇÃO PRINCIPAL ======================

function analisarHistorico(historyData) {
  if (!historyData || historyData.length < 25) {
    const jsonEsperaInicial = {
      acao: 'ESPERA',
      sinal: 'Mapeando o fluxo e a respiração inicial da mesa...',
      motivo: 'Aguardando massa crítica de dados (mínimo de 25 rodadas) para leitura segura de ciclos e padrões.',
      alvo: 'N/A',
      confianca: '0',
      reflexao: 'Aguardando contexto estrutural para iniciar autocrítica e avaliação de risco.',
      nivel_ceticismo: 'alto'
    };
    return formatarRetornoServidor(jsonEsperaInicial, historyData || [], 'nenhuma');
  }

  const ultimaVela = historyData[0];
  const penultimaVela = historyData[1];
  const antepenultimaVela = historyData[2];
  const deuBomUltimaRodada = ultimaVela.mult >= 2.0;

  let reflexaoAtual = 'Analisando fluxo natural e batimento da mesa...';

  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];

    if (ultimoSinal.tipoAcao === 'ENTRADA') {
      if (deuBomUltimaRodada) {
        if (desempenhoTeorias[ultimoSinal.teoriaUsada]) {
          desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
        }
        reflexaoAtual = `Autocrítica Positiva: Entrada validada (${ultimaVela.mult}x). A tese da teoria "${ultimoSinal.teoriaUsada}" se confirmou.`;
      } else {
        if (desempenhoTeorias[ultimoSinal.teoriaUsada]) {
          desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
        }
        reflexaoAtual = `Autocrítica de Erro: Entrada falhou (${ultimaVela.mult}x). Elevando ceticismo e revisando peso da teoria "${ultimoSinal.teoriaUsada}".`;
      }
    } else {
      if (deuBomUltimaRodada) {
        reflexaoAtual = `Reflexão Tática: Fiquei de fora e a mesa pagou ${ultimaVela.mult}x. Oportunidade escapou, mas preservação de capital prevaleceu.`;
      } else {
        reflexaoAtual = `Reflexão Tática: Excelente leitura! Evitei ciclo poluído/armadilha (${ultimaVela.mult}x).`;
      }
    }

    historicoReflexoes.push({ rodada: historyData.length, texto: reflexaoAtual });
    if (historicoReflexoes.length > 12) historicoReflexoes.shift();

    if (deuBomUltimaRodada) {
      if (ultimaVela.mult >= 10.0) {
        indiceCeticismo = Math.min(1.28, indiceCeticismo + 0.05);
      } else {
        indiceCeticismo = Math.max(0.82, indiceCeticismo - 0.035);
      }
    } else {
      indiceCeticismo = Math.min(1.38, indiceCeticismo + 0.07);
    }
  }

  const stats = calcularEstatisticasBasicas(historyData);
  const padrao = buscarPadroesSemelhantes(historyData, 8, 0.75);
  const teoriaEscolhida = escolherMelhorTeoria(stats, padrao);

  let acaoDecidida = 'ENTRADA';
  let teoriaUtilizada = teoriaEscolhida.nome;
  let sinalTexto = 'Oportunidade tática identificada após leitura de ciclo e padrão.';
  let motivoTexto = 'Contexto estatístico e similaridade histórica alinhados com preservação de capital.';
  let alvoTexto = '2.00x ~ 3.50x';
  let confiancaNumerica = 72;
  let nivelCeticismoStr = 'moderado';

  // Bloqueios rígidos de preservação de capital
  if (stats.ambientePoluido) {
    acaoDecidida = 'ESPERA';
    teoriaUtilizada = 'nenhuma';
    sinalTexto = 'Mesa poluída / alta densidade de azuis ou volatilidade excessiva.';
    motivoTexto = 'Excesso de velas baixas ou alternância abrupta. Prefiro capital seguro a forçar entrada.';
    alvoTexto = 'N/A';
    confiancaNumerica = 32;
    nivelCeticismoStr = 'alto';
  } else if (penultimaVela.mult >= 15.0 || antepenultimaVela.mult >= 15.0) {
    acaoDecidida = 'ESPERA';
    teoriaUtilizada = 'nenhuma';
    sinalTexto = 'Cautela após pico alto recente.';
    motivoTexto = 'Pico elevado recente tende a gerar fase de absorção. Aguardando nova estrutura.';
    alvoTexto = 'N/A';
    confiancaNumerica = 38;
    nivelCeticismoStr = 'alto';
  } else if (penultimaVela.mult >= 10.0 && ultimaVela.mult < 2.0) {
    acaoDecidida = 'ESPERA';
    teoriaUtilizada = 'nenhuma';
    sinalTexto = 'Aguardando estabilização pós-quebra de padrão.';
    motivoTexto = 'Quebra abrupta de cadência. Prefiro ver a mesa mostrar intenção clara.';
    alvoTexto = 'N/A';
    confiancaNumerica = 42;
    nivelCeticismoStr = 'alto';
  } else {
    let scoreBase = 58;

    if (stats.azuisSeguidas <= 1) scoreBase += 12;
    if (stats.densAzuis10 < 0.40) scoreBase += 10;
    if (stats.volatilidadeCurta < 0.40) scoreBase += 8;
    if (ultimaVela.mult >= 2.0 && ultimaVela.mult < 6.0) scoreBase += 6;

    if (padrao.amostras >= 5 && padrao.taxaPagou2x !== null) {
      if (padrao.taxaPagou2x >= 0.65) {
        scoreBase += Math.round(14 * padrao.confiancaEmpirica);
        motivoTexto += ` Padrão semelhante ocorreu ${padrao.amostras}x; em ${(padrao.taxaPagou2x * 100).toFixed(0)}% pagou 2x+.`;
      } else if (padrao.taxaPagou2x <= 0.40) {
        scoreBase -= Math.round(16 * padrao.confiancaEmpirica);
        motivoTexto += ` Padrão semelhante ocorreu ${padrao.amostras}x; taxa de pagamento baixa (${(padrao.taxaPagou2x * 100).toFixed(0)}%).`;
      }
    }

    scoreBase = Math.round(scoreBase * teoriaEscolhida.bonus);

    let confFinal = Math.round((scoreBase / indiceCeticismo) * 0.94);
    confiancaNumerica = Math.min(Math.max(confFinal, 22), 91);

    // Trava de segurança extra para padrões empiricamente péssimos
    if (padrao.amostras >= 5 && padrao.taxaPagou2x !== null && padrao.taxaPagou2x < 0.35) {
      acaoDecidida = 'ESPERA';
      teoriaUtilizada = 'nenhuma';
      sinalTexto = 'Memória histórica aponta alta probabilidade de quebra.';
      motivoTexto = `Histórico de padrões semelhantes indica apenas ${(padrao.taxaPagou2x * 100).toFixed(0)}% de sucesso. Ficando de fora.`;
      alvoTexto = 'N/A';
      confiancaNumerica = Math.min(confiancaNumerica, 40);
      nivelCeticismoStr = 'alto';
    } else if (teoriaEscolhida.winRate < 0.40 && teoriaEscolhida.bonus < 0.85) {
      acaoDecidida = 'ESPERA';
      teoriaUtilizada = 'nenhuma';
      sinalTexto = 'Teoria sob suspeita no regime atual da mesa.';
      motivoTexto = `A teoria "${teoriaEscolhida.nome}" está com win rate baixo (${(teoriaEscolhida.winRate * 100).toFixed(0)}%). Preferindo ficar de fora.`;
      alvoTexto = 'N/A';
      confiancaNumerica = Math.min(confiancaNumerica, 45);
      nivelCeticismoStr = 'alto';
    } else if (confiancaNumerica < 60) {
      acaoDecidida = 'ESPERA';
      teoriaUtilizada = 'nenhuma';
      sinalTexto = 'Cenário ambíguo; mantendo postura defensiva.';
      motivoTexto = 'Quando a leitura não entrega vantagem clara, o protocolo é aguardar. Capital primeiro.';
      alvoTexto = 'N/A';
      nivelCeticismoStr = 'alto';
    } else {
      nivelCeticismoStr = indiceCeticismo > 1.12 ? 'moderado' : 'baixo';
      if (padrao.amostras >= 5 && padrao.taxaPagou2x !== null) {
        reflexaoAtual += ` | Memória: ${padrao.amostras} padrões semelhantes → ${(padrao.taxaPagou2x * 100).toFixed(0)}% pagaram 2x+.`;
      }
      reflexaoAtual += ` | Teoria ativa: ${teoriaEscolhida.nome} (WR ${(teoriaEscolhida.winRate * 100).toFixed(0)}%).`;
    }
  }

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

// ====================== ESTATÍSTICAS DE FAIXAS ======================

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

// ====================== FORMATAÇÃO DE RETORNO ======================

function formatarRetornoServidor(jsonDecisao, historyData, teoriaUsada = 'nenhuma') {
  ultimosSinaisEmitidos.push({
    tipoAcao: jsonDecisao.acao,
    teoriaUsada: teoriaUsada,
    timestamp: Date.now()
  });
  if (ultimosSinaisEmitidos.length > 35) ultimosSinaisEmitidos.shift();

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

  let historyComFeedback = historyData.map((vela) => ({
    ...vela,
    statusFeedback: vela.statusFeedback || 'neutro'
  }));

  let acertosGlobais = 0;
  let totalAmostras = Math.min(40, historyData.length);
  for (let i = 0; i < totalAmostras; i++) {
    if (historyData[i].mult >= 2.00) acertosGlobais++;
  }
  let winRateCalculado = totalAmostras > 0 ? (acertosGlobais / totalAmostras) * 100 : 65.0;
  const taxaAcertoFormatada = `${winRateCalculado.toFixed(1)}%`;

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