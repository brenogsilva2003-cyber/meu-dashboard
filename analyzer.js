/**
 * Motor Avançado de Análise Tática e Preditiva - Mentalidade de Trader (Aviator/Spribe)
 * Versão Auto-Adaptativa: Memória Persistente, Anti-Repetição de Erros, Teto Dinâmico,
 * Trolagem (8x-9.99x), Ciclos (Exaustão/Respiro/Poluição), Adaptação por Métricas e Foco em Rosas/Roxas.
 */

const fs = require('fs');
const path = require('path');

const CAMINHO_ESTADO = path.join(__dirname, 'estado_aprendizado.json');

const ESTADO_PADRAO = {
  desempenhoTeorias: {
    cicloLimpoAposExaustao: { acertos: 5, erros: 2, peso: 1.0 },
    respiroControladoPosAzuis: { acertos: 5, erros: 2, peso: 1.0 },
    fluxoHarmonicoTatico: { acertos: 5, erros: 2, peso: 1.0 },
    gatilhoRosaEstrutural: { acertos: 5, erros: 2, peso: 1.0 },
    surfeTetoDinamico: { acertos: 5, erros: 2, peso: 1.0 }
  },
  indiceCeticismo: 1.0,
  errosConsecutivos: 0,
  acertosConsecutivos: 0,
  esperasConsecutivas: 0,
  assinaturasErros: []
};

function carregarEstado() {
  try {
    if (fs.existsSync(CAMINHO_ESTADO)) {
      const bruto = fs.readFileSync(CAMINHO_ESTADO, 'utf8');
      const parsed = JSON.parse(bruto);
      return {
        desempenhoTeorias: {
          ...ESTADO_PADRAO.desempenhoTeorias,
          ...(parsed.desempenhoTeorias || {})
        },
        indiceCeticismo: typeof parsed.indiceCeticismo === 'number' ? parsed.indiceCeticismo : 1.0,
        errosConsecutivos: typeof parsed.errosConsecutivos === 'number' ? parsed.errosConsecutivos : 0,
        acertosConsecutivos: typeof parsed.acertosConsecutivos === 'number' ? parsed.acertosConsecutivos : 0,
        esperasConsecutivas: typeof parsed.esperasConsecutivas === 'number' ? parsed.esperasConsecutivas : 0,
        assinaturasErros: Array.isArray(parsed.assinaturasErros) ? parsed.assinaturasErros.slice(-40) : []
      };
    }
  } catch (_) {}

  return JSON.parse(JSON.stringify(ESTADO_PADRAO));
}

function salvarEstado(estado) {
  try {
    fs.writeFileSync(CAMINHO_ESTADO, JSON.stringify(estado, null, 2), 'utf8');
  } catch (_) {
    // Em ambientes com filesystem restrito/efêmero, mantém em memória sem quebrar
  }
}

let estadoAprendizado = carregarEstado();
let desempenhoTeorias = estadoAprendizado.desempenhoTeorias;
let ultimosSinaisEmitidos = [];
let ultimoContextoEntrada = null;
let indiceCeticismo = estadoAprendizado.indiceCeticismo;
let historicoReflexoes = [];
let errosConsecutivos = estadoAprendizado.errosConsecutivos;
let acertosConsecutivos = estadoAprendizado.acertosConsecutivos;
let esperasConsecutivas = estadoAprendizado.esperasConsecutivas;
let assinaturasErros = estadoAprendizado.assinaturasErros;

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

function media(valores) {
  if (!valores.length) return 0;
  return valores.reduce((acc, n) => acc + n, 0) / valores.length;
}

function clamp(valor, min, max) {
  return Math.max(min, Math.min(max, valor));
}

function gerarAssinaturaContexto(stats, tetos, buscarRosa) {
  const bAzuis = Math.round(stats.densAzuis10 * 10);
  const bVol = Math.round(stats.volatilidadeCurta * 10);
  const bTeto = Math.round(tetos.mediaRoxa25);
  return `${buscarRosa ? 'ROSA' : 'ROXA'}|az10:${bAzuis}|vol:${bVol}|teto:${bTeto}`;
}

function avaliarMemoriaErros(assinaturaAtual) {
  if (!assinaturasErros.length) return { penalidade: 0, ocorrencias: 0 };
  const ocorrencias = assinaturasErros.filter(item => item === assinaturaAtual).length;
  if (ocorrencias === 0) return { penalidade: 0, ocorrencias: 0 };
  return {
    penalidade: Math.min(28, ocorrencias * 9),
    ocorrencias
  };
}

// ====================== CAMADA 1: TETO, TROLAGEM, CICLOS & ARMADILHAS ======================

function analisarTetosETrolagem(historyData) {
  const janela25 = historyData.slice(0, Math.min(25, historyData.length));
  const janela60 = historyData.slice(0, Math.min(60, historyData.length));

  const roxas25 = janela25.filter(v => v.mult >= 2.0 && v.mult < 10.0).map(v => v.mult);
  const roxas60 = janela60.filter(v => v.mult >= 2.0 && v.mult < 10.0).map(v => v.mult);
  const rosas60 = janela60.filter(v => v.mult >= 10.0).map(v => v.mult);

  const maiorRoxa25 = roxas25.length ? Math.max(...roxas25) : 2.5;
  const mediaRoxa25 = roxas25.length ? media(roxas25) : 2.6;
  const mediaRoxa60 = roxas60.length ? media(roxas60) : mediaRoxa25;

  const maiorRosa60 = rosas60.length ? Math.max(...rosas60) : null;
  const mediaRosa60 = rosas60.length ? media(rosas60) : null;

  const quaseRosas15 = historyData.slice(0, 15).filter(v => v.mult >= 8.0 && v.mult < 10.0).length;
  const quaseRosas30 = historyData.slice(0, 30).filter(v => v.mult >= 8.0 && v.mult < 10.0).length;
  const ultimaQuaseRosa = historyData.slice(0, 3).some(v => v.mult >= 8.0 && v.mult < 10.0);

  const v0 = historyData[0]?.mult ?? 0;
  const trolagemRosaAtiva = (ultimaQuaseRosa && v0 < 2.0) || quaseRosas15 >= 2 || quaseRosas30 >= 3;

  return {
    maiorRoxa25,
    mediaRoxa25,
    mediaRoxa60,
    maiorRosa60,
    mediaRosa60,
    quaseRosas15,
    quaseRosas30,
    ultimaQuaseRosa,
    trolagemRosaAtiva
  };
}

function detectarArmadilhasEFalsosPagamentos(historyData, tetos) {
  const v0 = historyData[0]?.mult ?? 0;
  const v1 = historyData[1]?.mult ?? 0;
  const v2 = historyData[2]?.mult ?? 0;
  const v3 = historyData[3]?.mult ?? 0;

  const janela12 = historyData.slice(0, 12);
  const roxasCurtasRecentes = janela12.filter(v => v.mult >= 2.0 && v.mult < 3.0).length;
  const velasSub130Recentes = janela12.filter(v => v.mult < 1.30).length;
  const roxasNaJanela12 = janela12.filter(v => v.mult >= 2.0).length;

  const motivos = [];
  let severidade = 0;

  if (v0 < 2.0 && v1 >= 2.0 && v1 < 3.2 && v2 < 2.0) {
    severidade += 38;
    motivos.push(`falso pagamento em ${v1.toFixed(2)}x seguido de quebra em ${v0.toFixed(2)}x`);
  }

  if (v0 < 2.0 && v1 >= 2.0 && v1 < 2.6 && v2 < 2.0 && v3 < 2.0) {
    severidade += 30;
    motivos.push('isca de roxa fraca no meio de sequência baixa');
  }

  if ((v1 >= 10.0 || v2 >= 10.0) && v0 < 2.0 && roxasNaJanela12 <= 3) {
    severidade += 34;
    motivos.push('rosa isolada sem base de roxas na mesa');
  }

  if (tetos.trolagemRosaAtiva && v0 < 3.0) {
    severidade += 28;
    motivos.push(`trolagem na faixa 8x–9.99x (${tetos.quaseRosas15} em 15 rodadas)`);
  }

  if (roxasCurtasRecentes >= 4 && velasSub130Recentes >= 5) {
    severidade += 24;
    motivos.push('mesa picotada com roxas curtas e quedas < 1.30x');
  }

  severidade = Math.min(100, severidade);
  return {
    armadilhaDetectada: severidade >= 42,
    severidade,
    motivos
  };
}

function calcularEstatisticasBasicas(historyData) {
  const janela10 = historyData.slice(0, 10);
  const janela20 = historyData.slice(0, 20);
  const janela50 = historyData.slice(0, Math.min(50, historyData.length));

  const azuis20 = janela20.filter(v => v.mult < 2.0);
  const mediaAzul20 = azuis20.length ? media(azuis20.map(v => v.mult)) : 1.35;
  const proporcao2xMais50 = janela50.filter(v => v.mult >= 2.0).length / (janela50.length || 1);

  const densAzuis10 = janela10.filter(v => v.mult < 2.0).length / (janela10.length || 1);
  const densAzuis20 = azuis20.length / (janela20.length || 1);
  const densAzuis50 = janela50.filter(v => v.mult < 2.0).length / (janela50.length || 1);

  const quebrasSecas10 = janela10.filter(v => v.mult <= 1.15).length;
  const roxasMediasAltas20 = janela20.filter(v => v.mult >= 3.0 && v.mult < 10.0).length;
  const rosas20 = janela20.filter(v => v.mult >= 10.0).length;

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

  // Adapta o rigor ao momento: azuis com média saudável e boa proporção de 2x+ reduzem falso bloqueio
  const mesaSaudavel = mediaAzul20 >= 1.35 && proporcao2xMais50 >= 0.42;
  const limiteDensAzuis10 = mesaSaudavel ? 0.75 : 0.65;
  const limiteVolatilidade = mesaSaudavel ? 0.88 : 0.80;

  const faseExaustao =
    (densAzuis10 >= 0.75 && quebrasSecas10 >= 3) ||
    (azuisSeguidas >= 5) ||
    (densAzuis20 >= 0.72 && roxasMediasAltas20 <= 1 && !mesaSaudavel);

  const faseRespiro =
    !faseExaustao &&
    densAzuis10 <= 0.50 &&
    roxasMediasAltas20 >= 3 &&
    volatilidadeCurta <= 0.78;

  const ambientePoluido =
    densAzuis10 >= limiteDensAzuis10 ||
    azuisSeguidas >= 4 ||
    quebrasSecas10 >= 4 ||
    volatilidadeCurta >= limiteVolatilidade;

  return {
    densAzuis10,
    densAzuis20,
    densAzuis50,
    mediaAzul20,
    proporcao2xMais50,
    mesaSaudavel,
    quebrasSecas10,
    roxasMediasAltas20,
    rosas20,
    azuisSeguidas,
    volatilidadeCurta,
    intervaloMedioPicos,
    desdeUltimoPico,
    faseExaustao,
    faseRespiro,
    ambientePoluido
  };
}

// ====================== CAMADA 2: MEMÓRIA DE PADRÕES SEMELHANTES ======================

function buscarPadroesSemelhantes(historyData, tamanhoJanela = 8, minimoSimilaridade = 0.75) {
  if (historyData.length < tamanhoJanela + 20) {
    return {
      amostras: 0,
      taxaPagou2x: null,
      taxaQuebrou: null,
      taxaRosa10x: null,
      confiancaEmpirica: 0
    };
  }

  const vetorAtual = vetorizarSequencia(historyData, tamanhoJanela);
  let amostrasUteis = 0;
  let pagou2x = 0;
  let quebrou = 0;
  let pagouRosa = 0;

  const limiteBusca = Math.min(historyData.length - tamanhoJanela - 1, 180);

  for (let i = tamanhoJanela; i < limiteBusca; i++) {
    const fatiaPassada = historyData.slice(i, i + tamanhoJanela);
    const vetorPassado = fatiaPassada.map(v => classificarVela(v.mult));
    const sim = calcularSimilaridade(vetorAtual, vetorPassado);

    if (sim >= minimoSimilaridade) {
      const indexApos = i - 1;
      if (indexApos >= 0 && historyData[indexApos]) {
        amostrasUteis++;
        const velaApos = historyData[indexApos].mult;
        if (velaApos >= 2.0) pagou2x++;
        else quebrou++;

        const janelaPos = historyData.slice(Math.max(0, i - 3), i + 1);
        if (janelaPos.some(v => v.mult >= 10.0)) pagouRosa++;
      }
    }
  }

  if (amostrasUteis < 3) {
    return {
      amostras: amostrasUteis,
      taxaPagou2x: null,
      taxaQuebrou: null,
      taxaRosa10x: null,
      confiancaEmpirica: 0
    };
  }

  const taxaPagou2x = pagou2x / amostrasUteis;
  const taxaQuebrou = quebrou / amostrasUteis;
  const taxaRosa10x = pagouRosa / amostrasUteis;
  const confiancaEmpirica = Math.min(0.95, (amostrasUteis / 15) * Math.abs(taxaPagou2x - 0.5) * 2);

  return {
    amostras: amostrasUteis,
    taxaPagou2x,
    taxaQuebrou,
    taxaRosa10x,
    confiancaEmpirica
  };
}

// ====================== CAMADA 3: PESO REAL, TETO E DECISÃO ROSA vs ROXA ======================

function obterWinRateTeoria(nomeTeoria) {
  const t = desempenhoTeorias[nomeTeoria];
  if (!t) return 0.5;
  const total = t.acertos + t.erros;
  if (total < 4) return 0.55;
  return t.acertos / total;
}

function avaliarEstrategiaRosaVsRoxa(stats, padrao, armadilha, tetos) {
  const bloqueioEstruturalRosa =
    stats.ambientePoluido ||
    stats.faseExaustao ||
    armadilha.armadilhaDetectada;

  let scoreRosa = 0;
  const sinaisRosa = [];

  const alvoMedia = stats.intervaloMedioPicos ? Math.round(stats.intervaloMedioPicos) : 18;
  const inicioJanela = Math.max(8, Math.min(14, alvoMedia - 6));
  const fimJanela = Math.max(24, alvoMedia + 12);

  if (!bloqueioEstruturalRosa) {
    if (stats.desdeUltimoPico >= inicioJanela && stats.desdeUltimoPico <= fimJanela) {
      scoreRosa += 34;
      sinaisRosa.push(`janela madura (${stats.desdeUltimoPico} velas sem 10x+)`);
    } else if (stats.desdeUltimoPico > fimJanela && stats.desdeUltimoPico <= fimJanela + 14) {
      scoreRosa += 20;
      sinaisRosa.push(`janela esticada (${stats.desdeUltimoPico} velas sem 10x+)`);
    }

    if (stats.faseRespiro) {
      scoreRosa += 24;
      sinaisRosa.push('respiro da mesa');
    }

    if (stats.roxasMediasAltas20 >= 3 && stats.densAzuis10 <= 0.45) {
      scoreRosa += 18;
      sinaisRosa.push('base de roxas ativa');
    }

    if (padrao.amostras >= 4 && padrao.taxaRosa10x !== null && padrao.taxaRosa10x >= 0.35) {
      scoreRosa += 16;
      sinaisRosa.push(`padrão similar com ${(padrao.taxaRosa10x * 100).toFixed(0)}% de rosa`);
    }

    if (tetos.trolagemRosaAtiva) {
      scoreRosa -= 22;
      sinaisRosa.push('atenção a corte pré-10x (8x–9.99x)');
    }
  }

  const buscarRosa = !bloqueioEstruturalRosa && scoreRosa >= 60 && sinaisRosa.length >= 2;

  const tetoRoxaCalibrado = Math.max(2.0, Math.min(6.5, Number((tetos.mediaRoxa25 * 1.15).toFixed(2))));
  const pisoRoxaCalibrado = Math.max(1.8, Math.min(tetoRoxaCalibrado - 0.5, Number((tetos.mediaRoxa25 * 0.85).toFixed(2))));

  let alvoRosa = '10.00x+ (parcial 3.00x~5.00x)';
  if (tetos.mediaRosa60) {
    if (tetos.mediaRosa60 < 15) {
      alvoRosa = '10.00x ~ 15.00x (parcial 3.00x)';
    } else if (tetos.mediaRosa60 >= 25) {
      alvoRosa = '15.00x+ (parcial 4.00x~6.00x)';
    }
  }
  if (tetos.trolagemRosaAtiva) {
    alvoRosa = '8.00x ~ 10.00x (parcial 2.50x~3.50x)';
  }

  return {
    buscarRosa,
    scoreRosa: Math.max(0, Math.min(100, scoreRosa)),
    motivoRosa: sinaisRosa.join(' + '),
    alvoRosa,
    alvoRoxa: `${pisoRoxaCalibrado.toFixed(2)}x ~ ${tetoRoxaCalibrado.toFixed(2)}x`
  };
}

function escolherMelhorTeoria(stats, padrao, estrategiaRosa) {
  const candidatos = [];

  if (estrategiaRosa.buscarRosa) {
    candidatos.push({ nome: 'gatilhoRosaEstrutural', pesoBase: 1.25 });
  }
  if (stats.faseRespiro && stats.azuisSeguidas >= 1 && stats.azuisSeguidas <= 3) {
    candidatos.push({ nome: 'respiroControladoPosAzuis', pesoBase: 1.15 });
  }
  if (stats.densAzuis20 >= 0.52 && stats.densAzuis10 < 0.45 && !stats.faseExaustao) {
    candidatos.push({ nome: 'cicloLimpoAposExaustao', pesoBase: 1.20 });
  }
  if (stats.volatilidadeCurta < 0.50 && stats.densAzuis10 < 0.45) {
    candidatos.push({ nome: 'fluxoHarmonicoTatico', pesoBase: 1.12 });
  }
  if (!stats.ambientePoluido && !stats.faseExaustao) {
    candidatos.push({ nome: 'surfeTetoDinamico', pesoBase: 1.08 });
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
    const pesoAprendido = desempenhoTeorias[melhor]?.peso ?? 1.0;
    return { nome: melhor, winRate: melhorWR, bonus: clamp(pesoAprendido, 0.65, 1.35) };
  }

  let escolhido = candidatos[0];
  let melhorScore = obterWinRateTeoria(escolhido.nome) * escolhido.pesoBase * (desempenhoTeorias[escolhido.nome]?.peso ?? 1.0);

  for (const c of candidatos) {
    const pesoAprendido = desempenhoTeorias[c.nome]?.peso ?? 1.0;
    const score = obterWinRateTeoria(c.nome) * c.pesoBase * pesoAprendido;
    if (score > melhorScore) {
      melhorScore = score;
      escolhido = c;
    }
  }

  const wr = obterWinRateTeoria(escolhido.nome);
  const pesoAprendido = desempenhoTeorias[escolhido.nome]?.peso ?? 1.0;
  let bonus = pesoAprendido;
  if (wr >= 0.70) bonus *= 1.12;
  else if (wr >= 0.58) bonus *= 1.05;
  else if (wr < 0.42) bonus *= 0.78;

  return { nome: escolhido.nome, winRate: wr, bonus: clamp(bonus, 0.60, 1.40) };
}

// ====================== FUNÇÃO PRINCIPAL ======================

function analisarHistorico(historyData) {
  if (!historyData || historyData.length < 25) {
    const jsonEsperaInicial = {
      acao: 'ESPERA',
      sinal: 'Mapeando o fluxo, tetos e respiração inicial da mesa...',
      motivo: 'Aguardando massa crítica de dados (mínimo de 25 rodadas) para leitura segura de ciclos e padrões.',
      alvo: 'N/A',
      confianca: '0',
      reflexao: 'Aguardando contexto estrutural para iniciar autocrítica e avaliação de risco.',
      nivel_ceticismo: 'alto'
    };
    return formatarRetornoServidor(jsonEsperaInicial, historyData || [], 'nenhuma');
  }

  const ultimaVela = historyData[0];
  const deuBomUltimaRodada = ultimaVela.mult >= 2.0;

  let reflexaoAtual = 'Analisando fluxo natural, tetos e batimento da mesa...';

  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];

    if (ultimoSinal.tipoAcao === 'ENTRADA') {
      esperasConsecutivas = 0;
      if (deuBomUltimaRodada) {
        acertosConsecutivos++;
        errosConsecutivos = 0;
        if (desempenhoTeorias[ultimoSinal.teoriaUsada]) {
          desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
          desempenhoTeorias[ultimoSinal.teoriaUsada].peso = clamp(
            (desempenhoTeorias[ultimoSinal.teoriaUsada].peso ?? 1.0) * 1.05,
            0.60,
            1.40
          );
        }
        reflexaoAtual = `Autocrítica Positiva: Entrada validada (${ultimaVela.mult.toFixed(2)}x) [${acertosConsecutivos} acerto(s) seguido(s)]. Reforçando peso de "${ultimoSinal.teoriaUsada}".`;
      } else {
        errosConsecutivos++;
        acertosConsecutivos = 0;
        if (desempenhoTeorias[ultimoSinal.teoriaUsada]) {
          desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
          desempenhoTeorias[ultimoSinal.teoriaUsada].peso = clamp(
            (desempenhoTeorias[ultimoSinal.teoriaUsada].peso ?? 1.0) * (errosConsecutivos >= 2 ? 0.85 : 0.92),
            0.60,
            1.40
          );
        }
        if (ultimoContextoEntrada) {
          assinaturasErros.push(ultimoContextoEntrada);
          if (assinaturasErros.length > 40) assinaturasErros.shift();
        }
        reflexaoAtual = `Autocrítica de Erro: Entrada falhou (${ultimaVela.mult.toFixed(2)}x) [${errosConsecutivos} erro(s) seguido(s)]. Reduzindo peso de "${ultimoSinal.teoriaUsada}" e registrando contexto para evitar repetição.`;
      }
    } else {
      esperasConsecutivas++;
      if (deuBomUltimaRodada) {
        if (esperasConsecutivas >= 8) {
          indiceCeticismo = Math.max(0.85, indiceCeticismo - 0.04);
        }
        reflexaoAtual = `Reflexão Tática: Fiquei em espera e saiu ${ultimaVela.mult.toFixed(2)}x (esperas seguidas: ${esperasConsecutivas}).`;
      } else {
        reflexaoAtual = `Reflexão Tática: Boa leitura defensiva! Evitei ciclo desfavorável, armadilha ou trolagem (${ultimaVela.mult.toFixed(2)}x).`;
      }
    }

    historicoReflexoes.push({ rodada: historyData.length, texto: reflexaoAtual });
    if (historicoReflexoes.length > 12) historicoReflexoes.shift();

    if (deuBomUltimaRodada) {
      if (ultimaVela.mult >= 10.0) {
        indiceCeticismo = Math.min(1.26, indiceCeticismo + 0.03);
      } else {
        const alivio = acertosConsecutivos >= 2 ? 0.05 : 0.035;
        indiceCeticismo = Math.max(0.82, indiceCeticismo - alivio);
      }
    } else {
      const penalidadeErro = errosConsecutivos >= 2 ? 0.12 : 0.07;
      indiceCeticismo = Math.min(1.42, indiceCeticismo + penalidadeErro);
    }

    salvarEstado({
      desempenhoTeorias,
      indiceCeticismo,
      errosConsecutivos,
      acertosConsecutivos,
      esperasConsecutivas,
      assinaturasErros
    });
  }

  const stats = calcularEstatisticasBasicas(historyData);
  const tetos = analisarTetosETrolagem(historyData);
  const armadilha = detectarArmadilhasEFalsosPagamentos(historyData, tetos);
  const padrao = buscarPadroesSemelhantes(historyData, 8, 0.75);
  const estrategiaRosa = avaliarEstrategiaRosaVsRoxa(stats, padrao, armadilha, tetos);
  const teoriaEscolhida = escolherMelhorTeoria(stats, padrao, estrategiaRosa);
  const assinaturaAtual = gerarAssinaturaContexto(stats, tetos, estrategiaRosa.buscarRosa);
  const memoriaErro = avaliarMemoriaErros(assinaturaAtual);

  let acaoDecidida = 'ENTRADA';
  let teoriaUtilizada = teoriaEscolhida.nome;
  let sinalTexto = `Oportunidade tática em roxa (teto médio 25v: ${tetos.mediaRoxa25.toFixed(2)}x).`;
  let motivoTexto = `Mesa com azuis em ${(stats.densAzuis10 * 100).toFixed(0)}% (média azul 20v: ${stats.mediaAzul20.toFixed(2)}x; 2x+ em 50v: ${(stats.proporcao2xMais50 * 100).toFixed(0)}%).`;
  let alvoTexto = estrategiaRosa.alvoRoxa;
  let confiancaNumerica = 72;
  let nivelCeticismoStr = 'moderado';

  if (armadilha.armadilhaDetectada) {
    acaoDecidida = 'ESPERA';
    teoriaUtilizada = 'nenhuma';
    sinalTexto = 'Armadilha ou falso pagamento detectado na leitura atual.';
    motivoTexto = `Alerta: ${armadilha.motivos.join('; ')}. Preservando banca até estabilização.`;
    alvoTexto = 'N/A';
    confiancaNumerica = Math.max(20, 42 - Math.round(armadilha.severidade * 0.2));
    nivelCeticismoStr = 'alto';
  } else if (stats.faseExaustao || stats.ambientePoluido) {
    acaoDecidida = 'ESPERA';
    teoriaUtilizada = 'nenhuma';
    sinalTexto = stats.faseExaustao
      ? 'Ciclo de exaustão na mesa — aguardando respiro real.'
      : 'Mesa poluída / alta pressão de velas baixas ou volatilidade.';
    motivoTexto = stats.faseExaustao
      ? `Exaustão detectada (${stats.azuisSeguidas} azuis seguidas; ${(stats.densAzuis10 * 100).toFixed(0)}% azuis nas últimas 10).`
      : `Mesa poluída (${(stats.densAzuis10 * 100).toFixed(0)}% azuis nas últimas 10; ${stats.quebrasSecas10}/10 quebras secas).`;
    alvoTexto = 'N/A';
    confiancaNumerica = 30;
    nivelCeticismoStr = 'alto';
  } else if (memoriaErro.ocorrencias >= 3) {
    acaoDecidida = 'ESPERA';
    teoriaUtilizada = 'nenhuma';
    sinalTexto = 'Contexto já falhou repetidamente — evitando repetição de erro.';
    motivoTexto = `Assinatura de contexto (${assinaturaAtual}) já falhou ${memoriaErro.ocorrencias}x. Aguardando mudança de fluxo.`;
    alvoTexto = 'N/A';
    confiancaNumerica = 35;
    nivelCeticismoStr = 'alto';
  } else {
    let scoreBase = 58;

    if (stats.azuisSeguidas <= 1) scoreBase += 10;
    if (stats.densAzuis10 < 0.40) scoreBase += 10;
    if (stats.faseRespiro) scoreBase += 12;
    if (stats.volatilidadeCurta < 0.50) scoreBase += 6;
    if (stats.mesaSaudavel) scoreBase += 6;
    if (ultimaVela.mult >= 2.0 && ultimaVela.mult < 8.0) scoreBase += 6;

    if (ultimaVela.mult >= 30.0) {
      scoreBase -= 10;
      motivoTexto += ` Pós-pico alto (${ultimaVela.mult.toFixed(2)}x) com cautela moderada.`;
    }

    if (memoriaErro.penalidade > 0) {
      scoreBase -= memoriaErro.penalidade;
      motivoTexto += ` Ajuste de aprendizado: contexto semelhante já falhou ${memoriaErro.ocorrencias}x (-${memoriaErro.penalidade} pts).`;
    }

    if (estrategiaRosa.buscarRosa) {
      scoreBase += 14;
      alvoTexto = estrategiaRosa.alvoRosa;
      sinalTexto = `Oportunidade de ROSA (${estrategiaRosa.scoreRosa}%): ${estrategiaRosa.motivoRosa}.`;
      motivoTexto = `Confluência para busca de rosa (${estrategiaRosa.motivoRosa}); teto de roxa recente em ${tetos.maiorRoxa25.toFixed(2)}x.`;
    } else if (tetos.trolagemRosaAtiva) {
      alvoTexto = `2.00x ~ ${Math.min(4.0, Math.max(2.2, tetos.mediaRoxa25)).toFixed(2)}x`;
      sinalTexto = `Foco em ROXA (${alvoTexto}) — evitando trolagem na trave da rosa (8x–9.99x).`;
      motivoTexto = `Mesa mostra cortes antes de 10x; buscando roxas dentro do teto real (${tetos.mediaRoxa25.toFixed(2)}x).`;
    }

    if (padrao.amostras >= 5 && padrao.taxaPagou2x !== null) {
      if (padrao.taxaPagou2x >= 0.65) {
        scoreBase += Math.round(14 * padrao.confiancaEmpirica);
        motivoTexto += ` Padrão semelhante (${padrao.amostras}x) pagou 2x+ em ${(padrao.taxaPagou2x * 100).toFixed(0)}%.`;
      } else if (padrao.taxaPagou2x <= 0.40) {
        scoreBase -= Math.round(16 * padrao.confiancaEmpirica);
        motivoTexto += ` Padrão semelhante (${padrao.amostras}x) teve baixa taxa de 2x+ (${(padrao.taxaPagou2x * 100).toFixed(0)}%).`;
      }
    }

    scoreBase = Math.round(scoreBase * teoriaEscolhida.bonus);

    let confFinal = Math.round((scoreBase / indiceCeticismo) * 0.94);
    confiancaNumerica = Math.min(Math.max(confFinal, 22), 92);

    if (padrao.amostras >= 5 && padrao.taxaPagou2x !== null && padrao.taxaPagou2x < 0.35) {
      acaoDecidida = 'ESPERA';
      teoriaUtilizada = 'nenhuma';
      sinalTexto = 'Memória histórica aponta risco elevado de quebra.';
      motivoTexto = `Padrões semelhantes pagaram 2x+ em apenas ${(padrao.taxaPagou2x * 100).toFixed(0)}%. Aguardando melhor estrutura.`;
      alvoTexto = 'N/A';
      confiancaNumerica = Math.min(confiancaNumerica, 40);
      nivelCeticismoStr = 'alto';
    } else if (teoriaEscolhida.winRate < 0.40 && teoriaEscolhida.bonus < 0.85) {
      acaoDecidida = 'ESPERA';
      teoriaUtilizada = 'nenhuma';
      sinalTexto = 'Teoria com baixo desempenho recente neste regime.';
      motivoTexto = `A teoria "${teoriaEscolhida.nome}" está com win rate baixo (${(teoriaEscolhida.winRate * 100).toFixed(0)}%). Mantendo cautela.`;
      alvoTexto = 'N/A';
      confiancaNumerica = Math.min(confiancaNumerica, 45);
      nivelCeticismoStr = 'alto';
    } else if (confiancaNumerica < 60) {
      acaoDecidida = 'ESPERA';
      teoriaUtilizada = 'nenhuma';
      sinalTexto = 'Cenário sem vantagem estatística clara no momento.';
      motivoTexto = 'Sem confluência suficiente para entrada segura; aguardando próxima leitura.';
      alvoTexto = 'N/A';
      nivelCeticismoStr = 'alto';
    } else {
      nivelCeticismoStr = indiceCeticismo > 1.12 ? 'moderado' : 'baixo';
      ultimoContextoEntrada = assinaturaAtual;
      if (padrao.amostras >= 5 && padrao.taxaPagou2x !== null) {
        reflexaoAtual += ` | Memória: ${padrao.amostras} padrões → ${(padrao.taxaPagou2x * 100).toFixed(0)}% pagaram 2x+.`;
      }
      reflexaoAtual += ` | Teoria: ${teoriaEscolhida.nome} (WR ${(teoriaEscolhida.winRate * 100).toFixed(0)}%) | Alvo: ${alvoTexto}.`;
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