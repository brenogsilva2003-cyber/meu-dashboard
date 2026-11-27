/**
 * Motor Avançado de Análise Tática e Preditiva - Mentalidade de Trader (Aviator/Spribe)
 * Versão Auto-Adaptativa Contínua: Memória Persistente, Histórico Completo (60+ velas),
 * Janela Tática de 18 Velas, Médias de Roxas/Azuis, Proteção < 1.50x e Evolução por Volume.
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
  assinaturasErros: [],
  parametrosAdaptativos: {
    sensibilidadeQuebra150: 1.0,
    pesoMemoriaLonga: 1.0
  }
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
        assinaturasErros: Array.isArray(parsed.assinaturasErros) ? parsed.assinaturasErros.slice(-50) : [],
        parametrosAdaptativos: {
          ...ESTADO_PADRAO.parametrosAdaptativos,
          ...(parsed.parametrosAdaptativos || {})
        }
      };
    }
  } catch (_) {}

  return JSON.parse(JSON.stringify(ESTADO_PADRAO));
}

function salvarEstado(estado) {
  try {
    fs.writeFileSync(CAMINHO_ESTADO, JSON.stringify(estado, null, 2), 'utf8');
  } catch (_) {}
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
let parametrosAdaptativos = estadoAprendizado.parametrosAdaptativos;

// ====================== HELPERS DE CLASSIFICAÇÃO & ESTATÍSTICA ======================

function normalizarHistorico(historyData) {
  if (!Array.isArray(historyData)) return [];
  return historyData
    .map((item) => {
      if (typeof item === 'number') {
        return Number.isFinite(item) && item > 0 ? { mult: item } : null;
      }
      if (!item || typeof item !== 'object') return null;
      const mult = Number(item.mult);
      if (!Number.isFinite(mult) || mult <= 0) return null;
      return {
        ...item,
        mult,
        time: typeof item.time === 'string' ? item.time : '',
        timestamp: typeof item.timestamp === 'number' ? item.timestamp : null
      };
    })
    .filter(Boolean);
}

function classificarVela(mult) {
  if (mult < 2.0) return 'azul';
  if (mult >= 10.0) return 'alta';
  return 'roxa';
}

function classificarDetalhado(mult) {
  if (mult < 1.5) return 'queda_forte';
  if (mult < 2.0) return 'azul_leve';
  if (mult >= 10.0) return 'rosa';
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
  const bAzuis18 = Math.round(stats.densAzuis18 * 10);
  const bRoxa18 = Math.round(clamp(stats.mediaRoxa18, 2, 8));
  const bTeto = Math.round(tetos.mediaRoxa25);
  return `${buscarRosa ? 'ROSA' : 'ROXA'}|az18:${bAzuis18}|rx18:${bRoxa18}|teto:${bTeto}`;
}

function avaliarMemoriaErros(assinaturaAtual) {
  if (!assinaturasErros.length) return { penalidade: 0, ocorrencias: 0 };
  const ocorrencias = assinaturasErros.filter(item => item === assinaturaAtual).length;
  if (ocorrencias === 0) return { penalidade: 0, ocorrencias: 0 };
  return {
    penalidade: Math.min(20, ocorrencias * 6),
    ocorrencias
  };
}

function calcularTaxaAcertoGlobal() {
  let totalAcertos = 0;
  let totalErros = 0;
  Object.values(desempenhoTeorias).forEach((t) => {
    totalAcertos += Number(t?.acertos || 0);
    totalErros += Number(t?.erros || 0);
  });
  const total = totalAcertos + totalErros;
  if (total <= 0) return '0.0%';
  return `${((totalAcertos / total) * 100).toFixed(1)}%`;
}

function formatarRetornoServidor(payload, historyData, teoriaUsada) {
  return {
    ...payload,
    confianca: `${clamp(Math.round(Number(payload.confianca) || 0), 0, 99)}%`,
    taxaAcerto: calcularTaxaAcertoGlobal(),
    teoriaUsada,
    totalRodadas: historyData.length,
    reflexoesRecentes: historicoReflexoes.slice(-3)
  };
}

// ====================== JANELA DE 18 VELAS & HISTÓRICO COMPLETO ======================

function analisarJanela18(historyData) {
  const janela18 = historyData.slice(0, Math.min(18, historyData.length));
  const azuis18 = janela18.filter(v => v.mult < 2.0);
  const roxas18 = janela18.filter(v => v.mult >= 2.0 && v.mult < 10.0);

  const mediaAzul18 = azuis18.length ? media(azuis18.map(v => v.mult)) : 1.35;
  const mediaRoxa18 = roxas18.length ? media(roxas18.map(v => v.mult)) : 2.80;
  const densAzuis18 = azuis18.length / (janela18.length || 1);
  const quebrasAbaixo150_18 = janela18.filter(v => v.mult < 1.5).length;

  const metade = Math.floor(janela18.length / 2);
  const recentes = janela18.slice(0, metade);
  const anteriores = janela18.slice(metade, metade * 2);

  const taxa2xRecentes = recentes.length
    ? recentes.filter(v => v.mult >= 2.0).length / recentes.length
    : 0.5;
  const taxa2xAnteriores = anteriores.length
    ? anteriores.filter(v => v.mult >= 2.0).length / anteriores.length
    : 0.5;

  const deltaTendencia = taxa2xRecentes - taxa2xAnteriores;
  let tendencia18 = 'estavel';
  if (deltaTendencia >= 0.16) tendencia18 = 'melhorando';
  else if (deltaTendencia <= -0.20) tendencia18 = 'pressionada';

  let riscoQuebra150 = 0;
  if (quebrasAbaixo150_18 >= Math.ceil(janela18.length * 0.45)) riscoQuebra150 += 10;
  if (mediaAzul18 < 1.24) riscoQuebra150 += 8;
  if (mediaRoxa18 < 2.35 && roxas18.length >= 3) riscoQuebra150 += 6;
  if (tendencia18 === 'melhorando' && mediaRoxa18 >= 2.70) riscoQuebra150 -= 5;

  riscoQuebra150 = clamp(
    Math.round(riscoQuebra150 * parametrosAdaptativos.sensibilidadeQuebra150),
    0,
    24
  );

  return {
    tamanho: janela18.length,
    mediaAzul18,
    mediaRoxa18,
    densAzuis18,
    quebrasAbaixo150_18,
    tendencia18,
    riscoQuebra150
  };
}

function analisarHistoricoCompleto(historyData, janela18) {
  const totalVelas = historyData.length;
  const capacidadeMaturidade = clamp(totalVelas / 120, 0.25, 1.0);

  const todasAzuis = historyData.filter(v => v.mult < 2.0);
  const todasRoxas = historyData.filter(v => v.mult >= 2.0 && v.mult < 10.0);
  const todasRosas = historyData.filter(v => v.mult >= 10.0);

  const mediaGlobalAzul = todasAzuis.length ? media(todasAzuis.map(v => v.mult)) : 1.35;
  const mediaGlobalRoxa = todasRoxas.length ? media(todasRoxas.map(v => v.mult)) : 2.85;
  const taxaGlobal2x = totalVelas > 0
    ? historyData.filter(v => v.mult >= 2.0).length / totalVelas
    : 0.5;

  const tamPadrao = 6;
  let correspondencias = 0;
  let somaDistancia = 0;
  let pagou2xApos = 0;
  let quebrouAbaixo150Apos = 0;
  let pagouRosaPerto = 0;

  if (totalVelas >= tamPadrao + 12) {
    const atual = historyData.slice(0, tamPadrao).map(v => String(classificarDetalhado(v.mult) || 'roxa'));

    for (let i = tamPadrao; i < totalVelas - 1; i++) {
      const candidato = historyData.slice(i, i + tamPadrao).map(v => String(classificarDetalhado(v.mult) || 'roxa'));
      let pontos = 0;

      for (let k = 0; k < tamPadrao; k++) {
        const a = String(atual[k] || '');
        const b = String(candidato[k] || '');
        if (a === b) {
          pontos += 1;
        } else if (
          (a.startsWith('azul') && b.startsWith('azul')) ||
          (a === 'roxa' && b === 'rosa') ||
          (a === 'rosa' && b === 'roxa')
        ) {
          pontos += 0.5;
        }
      }

      const similaridade = pontos / tamPadrao;
      if (similaridade >= 0.75) {
        const velaSeguinte = historyData[i - 1]?.mult;
        if (typeof velaSeguinte === 'number' && Number.isFinite(velaSeguinte)) {
          correspondencias++;
          somaDistancia += i;
          if (velaSeguinte >= 2.0) pagou2xApos++;
          if (velaSeguinte < 1.5) quebrouAbaixo150Apos++;
          const vizinhanca = historyData.slice(Math.max(0, i - 2), Math.min(totalVelas, i + 2));
          if (vizinhanca.some(v => v.mult >= 10.0)) pagouRosaPerto++;
        }
      }
    }
  }

  const distanciaMediaHistorica = correspondencias > 0 ? Math.round(somaDistancia / correspondencias) : 0;
  const taxa2xHistorica = correspondencias >= 2 ? pagou2xApos / correspondencias : null;
  const taxaQuebra150Historica = correspondencias >= 2 ? quebrouAbaixo150Apos / correspondencias : null;
  const taxaRosaHistorica = correspondencias >= 2 ? pagouRosaPerto / correspondencias : null;

  let ajusteHistoricoGlobal = 0;
  let ajusteLongoPrazo = 0;

  if (correspondencias >= 2 && taxa2xHistorica !== null) {
    if (taxa2xHistorica >= 0.65 && (taxaQuebra150Historica ?? 0) <= 0.25) {
      ajusteLongoPrazo += 8;
    } else if ((taxaQuebra150Historica ?? 0) >= 0.55 || taxa2xHistorica <= 0.35) {
      ajusteLongoPrazo -= 8;
    }
  }

  if (janela18.mediaRoxa18 >= mediaGlobalRoxa * 0.95 && janela18.mediaAzul18 >= mediaGlobalAzul * 0.95) {
    ajusteHistoricoGlobal += 4;
  }

  const pesoEfetivo = clamp(
    capacidadeMaturidade * parametrosAdaptativos.pesoMemoriaLonga,
    0.25,
    1.35
  );

  const impactoScoreTotal = clamp(
    Math.round((ajusteLongoPrazo + ajusteHistoricoGlobal) * pesoEfetivo),
    -14,
    14
  );

  return {
    totalVelas,
    capacidadeMaturidade,
    mediaGlobalAzul,
    mediaGlobalRoxa,
    taxaGlobal2x,
    totalRosasBase: todasRosas.length,
    correspondencias,
    distanciaMediaHistorica,
    taxa2xHistorica,
    taxaQuebra150Historica,
    taxaRosaHistorica,
    impactoScoreTotal
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

  const qtdRosas60 = rosas60.length;
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
    qtdRosas60,
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
    armadilhaDetectada: severidade >= 46,
    severidade,
    motivos
  };
}

function calcularEstatisticasBasicas(historyData, janela18) {
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

  const mesaSaudavel =
    (mediaAzul20 >= 1.32 && proporcao2xMais50 >= 0.40) ||
    (janela18.mediaRoxa18 >= 2.75 && janela18.tendencia18 !== 'pressionada');

  const limiteDensAzuis10 = mesaSaudavel ? 0.78 : 0.68;
  const limiteVolatilidade = mesaSaudavel ? 0.92 : 0.84;

  const faseExaustao =
    (densAzuis10 >= 0.78 && quebrasSecas10 >= 3) ||
    (azuisSeguidas >= 5) ||
    (densAzuis20 >= 0.75 && roxasMediasAltas20 <= 1 && !mesaSaudavel);

  const faseRespiro =
    !faseExaustao &&
    densAzuis10 <= 0.52 &&
    roxasMediasAltas20 >= 3 &&
    volatilidadeCurta <= 0.82;

  const ambientePoluido =
    densAzuis10 >= limiteDensAzuis10 ||
    azuisSeguidas >= 4 ||
    quebrasSecas10 >= 4 ||
    volatilidadeCurta >= limiteVolatilidade;

  return {
    densAzuis10,
    densAzuis20,
    densAzuis50,
    densAzuis18: janela18.densAzuis18,
    mediaAzul20,
    mediaRoxa18: janela18.mediaRoxa18,
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

  const limiteBusca = Math.min(historyData.length - tamanhoJanela - 1, 240);

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

function avaliarEstrategiaRosaVsRoxa(stats, padrao, armadilha, tetos, memoriaLonga) {
  const bloqueioEstruturalRosa =
    stats.ambientePoluido ||
    stats.faseExaustao ||
    armadilha.armadilhaDetectada ||
    tetos.trolagemRosaAtiva;

  let scoreRosa = 0;
  const sinaisRosa = [];

  const alvoMedia = stats.intervaloMedioPicos ? Math.round(stats.intervaloMedioPicos) : 22;
  const inicioJanela = Math.max(18, Math.min(24, alvoMedia - 3));
  const fimJanela = Math.max(30, alvoMedia + 12);

  if (!bloqueioEstruturalRosa && stats.desdeUltimoPico >= inicioJanela) {
    if (stats.desdeUltimoPico <= fimJanela) {
      scoreRosa += 32;
      sinaisRosa.push(`janela madura (${stats.desdeUltimoPico} velas sem 10x+)`);
    } else if (stats.desdeUltimoPico <= fimJanela + 14) {
      scoreRosa += 24;
      sinaisRosa.push(`janela esticada (${stats.desdeUltimoPico} velas sem 10x+)`);
    }

    if (stats.faseRespiro) {
      scoreRosa += 20;
      sinaisRosa.push('respiro da mesa');
    }

    if (stats.roxasMediasAltas20 >= 3 && stats.densAzuis10 <= 0.45) {
      scoreRosa += 18;
      sinaisRosa.push('base de roxas ativa');
    }

    if (
      (padrao.amostras >= 5 && padrao.taxaRosa10x !== null && padrao.taxaRosa10x >= 0.40) ||
      (memoriaLonga.correspondencias >= 3 && memoriaLonga.taxaRosaHistorica !== null && memoriaLonga.taxaRosaHistorica >= 0.35)
    ) {
      scoreRosa += 16;
      sinaisRosa.push('histórico favorável a rosa');
    }
  }

  const buscarRosa = !bloqueioEstruturalRosa && scoreRosa >= 70 && sinaisRosa.length >= 2;

  const baseRoxa = (tetos.mediaRoxa25 * 0.5) + (stats.mediaRoxa18 * 0.3) + (memoriaLonga.mediaGlobalRoxa * 0.2);
  const tetoRoxaCalibrado = Math.max(2.0, Math.min(6.5, Number((baseRoxa * 1.12).toFixed(2))));
  const pisoRoxaCalibrado = Math.max(1.8, Math.min(tetoRoxaCalibrado - 0.5, Number((baseRoxa * 0.85).toFixed(2))));

  let alvoRosa = '10.00x ~ 15.00x (parcial 3.00x)';
  if (tetos.qtdRosas60 >= 3 && tetos.mediaRosa60 && tetos.mediaRosa60 >= 28 && tetos.maiorRoxa25 >= 5.0) {
    alvoRosa = '15.00x+ (parcial 4.00x~5.00x)';
  }

  return {
    buscarRosa,
    scoreRosa: Math.max(0, Math.min(82, scoreRosa)),
    motivoRosa: sinaisRosa.join(' + '),
    alvoRosa,
    alvoRoxa: `${pisoRoxaCalibrado.toFixed(2)}x ~ ${tetoRoxaCalibrado.toFixed(2)}x`
  };
}

function escolherMelhorTeoria(stats, padrao, estrategiaRosa, janela18) {
  const candidatos = [];

  if (estrategiaRosa.buscarRosa) {
    candidatos.push({ nome: 'gatilhoRosaEstrutural', pesoBase: 1.25 });
  }
  if (stats.faseRespiro && stats.azuisSeguidas >= 1 && stats.azuisSeguidas <= 3) {
    candidatos.push({ nome: 'respiroControladoPosAzuis', pesoBase: 1.15 });
  }
  if (stats.densAzuis20 >= 0.52 && stats.densAzuis10 < 0.48 && !stats.faseExaustao) {
    candidatos.push({ nome: 'cicloLimpoAposExaustao', pesoBase: 1.20 });
  }
  if ((stats.volatilidadeCurta < 0.58 && stats.densAzuis10 < 0.52) || janela18.tendencia18 === 'melhorando') {
    candidatos.push({ nome: 'fluxoHarmonicoTatico', pesoBase: 1.14 });
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
    return { nome: melhor, winRate: melhorWR, bonus: clamp(pesoAprendido, 0.72, 1.35) };
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
  if (wr >= 0.70) bonus *= 1.10;
  else if (wr >= 0.58) bonus *= 1.04;
  else if (wr < 0.42) bonus *= 0.88;

  return { nome: escolhido.nome, winRate: wr, bonus: clamp(bonus, 0.72, 1.38) };
}

// ====================== FUNÇÃO PRINCIPAL ======================

function analisarHistorico(rawHistory) {
  const historyData = normalizarHistorico(rawHistory);

  if (historyData.length < 25) {
    const jsonEsperaInicial = {
      acao: 'ESPERA',
      sinal: 'Mapeando o fluxo, tetos e respiração inicial da mesa...',
      motivo: 'Aguardando massa crítica de dados (mínimo de 25 rodadas) para leitura segura de ciclos e padrões.',
      alvo: 'N/A',
      confianca: '0',
      reflexao: 'Aguardando contexto estrutural para iniciar autocrítica e avaliação de risco.',
      nivel_ceticismo: 'alto'
    };
    return formatarRetornoServidor(jsonEsperaInicial, historyData, 'nenhuma');
  }

  const ultimaVela = historyData[0];
  const deuBomUltimaRodada = ultimaVela.mult >= 2.0;
  const caiuAbaixo150 = ultimaVela.mult < 1.5;

  let reflexaoAtual = 'Analisando fluxo natural, janela de 18 velas e histórico completo...';

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
            0.72,
            1.38
          );
        }
        parametrosAdaptativos.sensibilidadeQuebra150 = clamp(
          parametrosAdaptativos.sensibilidadeQuebra150 * 0.98,
          0.75,
          1.35
        );
        reflexaoAtual = `Autocrítica Positiva: Entrada validada (${ultimaVela.mult.toFixed(2)}x) [${acertosConsecutivos} acerto(s) seguido(s)]. Reforçando "${ultimoSinal.teoriaUsada}".`;
      } else {
        errosConsecutivos++;
        acertosConsecutivos = 0;
        if (desempenhoTeorias[ultimoSinal.teoriaUsada]) {
          desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
          desempenhoTeorias[ultimoSinal.teoriaUsada].peso = clamp(
            (desempenhoTeorias[ultimoSinal.teoriaUsada].peso ?? 1.0) * (errosConsecutivos >= 2 ? 0.90 : 0.95),
            0.72,
            1.38
          );
        }
        if (caiuAbaixo150) {
          parametrosAdaptativos.sensibilidadeQuebra150 = clamp(
            parametrosAdaptativos.sensibilidadeQuebra150 * 1.06,
            0.75,
            1.35
          );
        }
        if (ultimoContextoEntrada) {
          assinaturasErros.push(ultimoContextoEntrada);
          if (assinaturasErros.length > 50) assinaturasErros.shift();
        }
        reflexaoAtual = `Autocrítica de Erro: Entrada falhou (${ultimaVela.mult.toFixed(2)}x) [${errosConsecutivos} erro(s) seguido(s)]. Ajustando pesos e cautela para < 1.50x.`;
      }
    } else {
      esperasConsecutivas++;
      if (deuBomUltimaRodada) {
        if (esperasConsecutivas >= 6) {
          indiceCeticismo = Math.max(0.86, indiceCeticismo - 0.045);
          parametrosAdaptativos.sensibilidadeQuebra150 = clamp(
            parametrosAdaptativos.sensibilidadeQuebra150 * 0.97,
            0.75,
            1.35
          );
        }
        reflexaoAtual = `Reflexão Tática: Fiquei em espera e saiu ${ultimaVela.mult.toFixed(2)}x (esperas seguidas: ${esperasConsecutivas}).`;
      } else {
        reflexaoAtual = `Reflexão Tática: Boa leitura defensiva! Evitei pressão ou quebra (${ultimaVela.mult.toFixed(2)}x).`;
      }
    }

    historicoReflexoes.push({ rodada: historyData.length, texto: reflexaoAtual });
    if (historicoReflexoes.length > 12) historicoReflexoes.shift();

    if (deuBomUltimaRodada) {
      if (ultimaVela.mult >= 10.0) {
        indiceCeticismo = Math.min(1.22, indiceCeticismo + 0.02);
      } else {
        const alivio = acertosConsecutivos >= 2 ? 0.05 : 0.035;
        indiceCeticismo = Math.max(0.84, indiceCeticismo - alivio);
      }
    } else {
      const penalidadeErro = errosConsecutivos >= 2 ? 0.09 : 0.05;
      indiceCeticismo = Math.min(1.32, indiceCeticismo + penalidadeErro);
    }

    salvarEstado({
      desempenhoTeorias,
      indiceCeticismo,
      errosConsecutivos,
      acertosConsecutivos,
      esperasConsecutivas,
      assinaturasErros,
      parametrosAdaptativos
    });
  }

  const janela18 = analisarJanela18(historyData);
  const memoriaLonga = analisarHistoricoCompleto(historyData, janela18);
  const stats = calcularEstatisticasBasicas(historyData, janela18);
  const tetos = analisarTetosETrolagem(historyData);
  const armadilha = detectarArmadilhasEFalsosPagamentos(historyData, tetos);
  const padrao = buscarPadroesSemelhantes(historyData, 8, 0.75);
  const estrategiaRosa = avaliarEstrategiaRosaVsRoxa(stats, padrao, armadilha, tetos, memoriaLonga);
  const teoriaEscolhida = escolherMelhorTeoria(stats, padrao, estrategiaRosa, janela18);
  const assinaturaAtual = gerarAssinaturaContexto(stats, tetos, estrategiaRosa.buscarRosa);
  const memoriaErro = avaliarMemoriaErros(assinaturaAtual);

  let acaoDecidida = 'ENTRADA';
  let teoriaUtilizada = teoriaEscolhida.nome;
  let sinalTexto = `Oportunidade tática em roxa (18v roxa média: ${janela18.mediaRoxa18.toFixed(2)}x | azul média: ${janela18.mediaAzul18.toFixed(2)}x).`;
  let motivoTexto = `Janela de 18v em tendência ${janela18.tendencia18} (azuis: ${(janela18.densAzuis18 * 100).toFixed(0)}%; <1.50x: ${janela18.quebrasAbaixo150_18}/${janela18.tamanho}). Base histórica: ${memoriaLonga.totalVelas} velas.`;
  let alvoTexto = estrategiaRosa.alvoRoxa;
  let confiancaNumerica = 72;
  let nivelCeticismoStr = 'moderado';

  if (estrategiaRosa.buscarRosa) {
    teoriaUtilizada = 'gatilhoRosaEstrutural';
    alvoTexto = estrategiaRosa.alvoRosa;
    sinalTexto = `Oportunidade tática para ROSA (${estrategiaRosa.motivoRosa || 'janela estrutural'}).`;
    confiancaNumerica = 76;
  }

  if (armadilha.armadilhaDetectada) {
    acaoDecidida = 'ESPERA';
    teoriaUtilizada = 'nenhuma';
    sinalTexto = 'Armadilha ou falso pagamento detectado na leitura atual.';
    motivoTexto = `Alerta: ${armadilha.motivos.join('; ')}. Preservando banca até estabilização.`;
    alvoTexto = 'N/A';
    confiancaNumerica = Math.max(24, 44 - Math.round(armadilha.severidade * 0.16));
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
    confiancaNumerica = 32;
    nivelCeticismoStr = 'alto';
  } else if (memoriaErro.ocorrencias >= 4) {
    acaoDecidida = 'ESPERA';
    teoriaUtilizada = 'nenhuma';
    sinalTexto = 'Contexto já falhou repetidamente — evitando repetição de erro.';
    motivoTexto = `Assinatura de contexto (${assinaturaAtual}) já falhou ${memoriaErro.ocorrencias}x. Aguardando mudança de fluxo.`;
    alvoTexto = 'N/A';
    confiancaNumerica = 36;
    nivelCeticismoStr = 'alto';
  } else {
    let scoreBase = estrategiaRosa.buscarRosa ? 64 : 58;

    if (stats.azuisSeguidas <= 1) scoreBase += 9;
    if (janela18.densAzuis18 < 0.45) scoreBase += 8;
    if (janela18.mediaRoxa18 >= 2.85) scoreBase += 7;
    if (janela18.tendencia18 === 'melhorando') scoreBase += 8;
    if (stats.faseRespiro) scoreBase += 10;
    if (stats.mesaSaudavel) scoreBase += 6;
    if (ultimaVela.mult >= 2.0 && ultimaVela.mult < 8.0) scoreBase += 5;

    if (janela18.riscoQuebra150 > 0) {
      scoreBase -= janela18.riscoQuebra150;
      motivoTexto += ` Risco <1.50x na janela de 18v (-${janela18.riscoQuebra150} pts).`;
    }

    if (ultimaVela.mult >= 35.0) {
      scoreBase -= 7;
      motivoTexto += ` Pós-pico alto (${ultimaVela.mult.toFixed(2)}x) com cautela moderada.`;
    }

    if (memoriaErro.penalidade > 0) {
      scoreBase -= memoriaErro.penalidade;
      motivoTexto += ` Contexto semelhante falhou ${memoriaErro.ocorrencias}x (-${memoriaErro.penalidade} pts).`;
    }

    if (memoriaLonga.impactoScoreTotal !== 0) {
      scoreBase += memoriaLonga.impactoScoreTotal;
      if (memoriaLonga.correspondencias >= 2 && memoriaLonga.taxa2xHistorica !== null) {
        motivoTexto += ` Memória longa (${memoriaLonga.correspondencias} padrões; 2x: ${(memoriaLonga.taxa2xHistorica * 100).toFixed(0)}%; ${memoriaLonga.impactoScoreTotal > 0 ? '+' : ''}${memoriaLonga.impactoScoreTotal} pts).`;
      } else {
        motivoTexto += ` Ajuste histórico global (${memoriaLonga.impactoScoreTotal > 0 ? '+' : ''}${memoriaLonga.impactoScoreTotal} pts).`;
      }
    }

    if (padrao.amostras >= 3 && padrao.taxaPagou2x !== null) {
      const ajustePadrao = Math.round((padrao.taxaPagou2x - 0.5) * 18);
      scoreBase += ajustePadrao;
    }

    scoreBase = scoreBase * teoriaEscolhida.bonus / clamp(indiceCeticismo, 0.84, 1.32);
    confiancaNumerica = clamp(Math.round(scoreBase), 25, 96);

    if (confiancaNumerica < 52) {
      acaoDecidida = 'ESPERA';
      teoriaUtilizada = 'nenhuma';
      sinalTexto = 'Confluência insuficiente no momento — aguardando confirmação.';
      alvoTexto = 'N/A';
      nivelCeticismoStr = 'alto';
    } else if (confiancaNumerica < 65) {
      nivelCeticismoStr = 'moderado';
      sinalTexto = `Entrada moderada (${estrategiaRosa.buscarRosa ? 'ROSA' : 'ROXA'}) — gestão de risco ativa.`;
    } else {
      nivelCeticismoStr = 'baixo';
    }
  }

  if (acaoDecidida === 'ENTRADA') {
    ultimoContextoEntrada = assinaturaAtual;
  }

  ultimosSinaisEmitidos.push({
    tipoAcao: acaoDecidida,
    teoriaUsada: teoriaUtilizada,
    timestamp: Date.now()
  });
  if (ultimosSinaisEmitidos.length > 50) {
    ultimosSinaisEmitidos.shift();
  }

  return formatarRetornoServidor(
    {
      acao: acaoDecidida,
      sinal: sinalTexto,
      motivo: motivoTexto,
      alvo: alvoTexto,
      confianca: String(confiancaNumerica),
      reflexao: reflexaoAtual,
      nivel_ceticismo: nivelCeticismoStr
    },
    historyData,
    teoriaUtilizada
  );
}

module.exports = {
  analisarHistorico
};