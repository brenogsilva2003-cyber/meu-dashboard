/**
 * Motor Avançado de Análise Preditiva - Aviator com Teorias e Validação Humana
 * Simula raciocínio analítico: testa teorias de comportamento de mesa e só executa se houver rentabilidade recente.
 */

// Memória de desempenho das "Teorias" do apostador simulado (taxa de acerto hipotética recente)
let desempenhoTeorias = {
  teoriaRespiroPosBaixas: { acertos: 5, erros: 2 }, // Ex: Entrar após sequência de azuis quebrada
  teoriaCicloMinuto:      { acertos: 5, erros: 2 }, // Ex: Entrar em minutos quentes recorrentes
  teoriaFluxoRoxo:        { acertos: 5, erros: 2 }  // Ex: Entrar quando o bloco de velas curtas estabiliza
};

// Histórico de auditoria para feedback loop
let ultimosSinaisEmitidos = [];

function analisarHistorico(historyData) {
  if (!historyData || historyData.length < 25) {
    return {
      signal: '⚪ AGUARDAR',
      sinal: '⚪ AGUARDAR',
      motivo: 'Formulando hipóteses e coletando dados da mesa (mín. 25 rodadas)...',
      alvo: 'N/A',
      confianca: '0%',
      taxaAcerto: '0.0%'
    };
  }

  // -------------------------------------------------------------------------
  // 0. AUTO-AVALIAÇÃO HUMANA (FEEDBACK LOOP DE RESULTADOS REAIS)
  // -------------------------------------------------------------------------
  if (ultimosSinaisEmitidos.length > 0) {
    const ultimoSinal = ultimosSinaisEmitidos[ultimosSinaisEmitidos.length - 1];
    const deuBom = historyData[0].mult >= 2.0; // Consideramos vitória se bateu 2x ou mais

    // O apostador humano ajusta a confiança na teoria que usou com base no resultado real
    if (deuBom) {
      if (desempenhoTeorias[ultimoSinal.teoriaUsada]) {
        desempenhoTeorias[ultimoSinal.teoriaUsada].acertos++;
      }
    } else {
      if (desempenhoTeorias[ultimoSinal.teoriaUsada]) {
        desempenhoTeorias[ultimoSinal.teoriaUsada].erros++;
      }
    }
  }

  const ultimaVela = historyData[0];
  const penultimaVela = historyData[1];
  
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
  winRateCalculado = Math.min(Math.max(winRateCalculado, 40.0), 92.0);
  const winRateFormatado = `${winRateCalculado.toFixed(1)}%`;

  // -------------------------------------------------------------------------
  // 2. FORMULAÇÃO DE TEORIAS (O HUMANO OBSERVANDO PADRÕES)
  // -------------------------------------------------------------------------
  // Analisando comportamento das últimas 15 velas
  const janela15 = historyData.slice(0, 15);
  let azuisSeguidos = 0;
  for (let item of historyData) {
    if (item.mult < 2.0) azuisSeguidos++;
    else break;
  }

  let qRoxasJanela = janela15.filter(i => i.mult >= 2.0 && i.mult < 10).length;
  let qAzuisJanela = janela15.filter(i => i.mult < 2.0).length;

  // Teoria 1: O Respiro (Mesa estagnada em azuis exaustivos tende a dar uma esticada moderada)
  const scoreTeoriaRespiro = (azuisSeguidos >= 3 && azuisSeguidos <= 6) ? 75 : 40;

  // Teoria 2: Ciclo de Minutagem (Repetição comportamental nos minutos)
  const rosasRecentes = historyData.filter(item => item.mult >= 10);
  let ocorrenciasNesteDigito = 0;
  rosasRecentes.forEach(item => {
    if (item.time) {
      const min = item.time.split(':')[1];
      if (min && parseInt(min.slice(-1)) === digitoMinutoAtual) ocorrenciasNesteDigito++;
    }
  });
  const scoreTeoriaMinuto = ocorrenciasNesteDigito >= 2 ? 80 : 50;

  // Teoria 3: Fluxo Respirando (Equilíbrio saudável entre velas roxas e baixas)
  const scoreTeoriaFluxo = (qRoxasJanela >= 5 && qAzuisJanela <= 10) ? 70 : 45;

  // -------------------------------------------------------------------------
  // 3. AVALIAÇÃO DE RENTABILIDADE DAS TEORIAS (BACKTESTING RÁPIDO)
  // -------------------------------------------------------------------------
  // Função para calcular a taxa de acerto de uma teoria específica no histórico recente
  function calcularRentabilidadeTeorias(nomeTeoria) {
    const t = desempenhoTeorias[nomeTeoria];
    const total = t.acertos + t.erros;
    return total > 0 ? (t.acertos / total) * 100 : 50;
  }

  const rentabilidadeRespiro = calcularRentabilidadeTeorias('teoriaRespiroPosBaixas');
  const rentabilidadeMinuto = calcularRentabilidadeTeorias('teoriaCicloMinuto');
  const rentabilidadeFluxo = calcularRentabilidadeTeorias('teoriaFluxoRoxo');

  // Seleciona qual "teoria" está gerando rendimento positivo neste exato momento da mesa
  let melhorTeoria = 'Nenhuma';
  let maiorScore = 0;
  let teoriaAtivaKey = '';

  if (scoreTeoriaRespiro > maiorScore && rentabilidadeRespiro >= 50) {
    maiorScore = scoreTeoriaRespiro;
    melhorTeoria = 'Teoria do Respiro Pós-Exaustão Azul';
    teoriaAtivaKey = 'teoriaRespiroPosBaixas';
  }
  if (scoreTeoriaMinuto > maiorScore && rentabilidadeMinuto >= 50) {
    maiorScore = scoreTeoriaMinuto;
    melhorTeoria = 'Teoria de Sincronia de Minutagem';
    teoriaAtivaKey = 'teoriaCicloMinuto';
  }
  if (scoreTeoriaFluxo > maiorScore && rentabilidadeFluxo >= 50) {
    maiorScore = scoreTeoriaFluxo;
    melhorTeoria = 'Teoria de Fluxo e Estabilidade Local';
    teoriaAtivaKey = 'teoriaFluxoRoxo';
  }

  // Se nenhuma teoria estiver com rendimento positivo comprovado, o "humano" decide ficar de fora
  if (maiorScore < 60 || !teoriaAtivaKey) {
    return registrarSinalESair(
      '🔴 CAUTELA / TEORIAS INVALIDADAS',
      `O apostador simulado testou as teorias atuais, mas o rendimento estatístico recente está abaixo de 50%. Aguardando cenário limpo.`,
      'N/A',
      '20%',
      winRateFormatado,
      'ESPERA',
      'nenhuma'
    );
  }

  // -------------------------------------------------------------------------
  // 4. FILTROS DE PROTEÇÃO (EVITAR ENTRADAS EM "RESSACA")
  // -------------------------------------------------------------------------
  if (penultimaVela && penultimaVela.mult >= 20 && ultimaVela.mult < 1.3) {
    return registrarSinalESair(
      '🔴 MODO DEFESA / RESSACA PÓS-PRÊMIO',
      `O operador humano identificou crash logo após vela muito alta. Risco alto de mesa travada.`,
      'N/A',
      '15%',
      winRateFormatado,
      'ESPERA',
      teoriaAtivaKey
    );
  }

  // -------------------------------------------------------------------------
  // 5. DECISÃO FINAL BASEADA NA HIPÓTESE VALIDADA
  // -------------------------------------------------------------------------
  let confiancaFinal = Math.round(maiorScore * 0.9);

  if (confiancaFinal >= 70) {
    return registrarSinalESair(
      '🟢 ENTRADA COM BASE EM HIPÓTESE VALIDADA',
      `Teoria Ativa: "${melhorTeoria}" com histórico de rendimento positivo recente.`,
      '2.00x a 4.50x',
      `${confiancaFinal}%`,
      winRateFormatado,
      'ENTRADA',
      teoriaAtivaKey
    );
  }

  return registrarSinalESair(
    '🟡 OPORTUNIDADE TÁTICA EM OBSERVAÇÃO',
    `Teoria "${melhorTeoria}" em teste, mas exigindo cautela e alvos baixos.`,
    '1.50x a 2.00x',
    `${confiancaFinal}%`,
    winRateFormatado,
    'ENTRADA',
    teoriaAtivaKey
  );
}

// Função auxiliar para registrar histórico e atualizar o ciclo de aprendizado humanizado
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