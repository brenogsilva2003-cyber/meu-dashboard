// Memória local para guardar as últimas velas recebidas
let historicoVelas = [];

const CONFIG = {
  VELA_AZUL_MAX: 1.99,   // Vela baixa (< 2.00x)
  VELA_ROXA_MIN: 2.00,   // Vela média/boa (>= 2.00x)
  VELA_ROSA_MIN: 10.00,  // Vela alta (>= 10.00x)
  LIMITE_HISTORICO: 50   // Quantidade de velas mantidas para cálculo
};

/**
 * Função principal: chamada sempre que o bot.js envia uma nova vela ao servidor
 */
function analisarMercado(novaVela) {
  // novaVela = { mult: 2.35, time: "12:15:30", timestamp: 1726067730000 }
  historicoVelas.unshift(novaVela);

  if (historicoVelas.length > CONFIG.LIMITE_HISTORICO) {
    historicoVelas.pop();
  }

  // Precisa de pelo menos 5 velas para gerar análises consistentes
  if (historicoVelas.length < 5) {
    return {
      sinal: '⚪ AGUARDANDO_DADOS',
      motivo: 'Acumulando velas para análise inicial...',
      alvo: 'N/A',
      confianca: '0%'
    };
  }

  return processarEstrategia();
}

/**
 * Motor de Análise: Minutagem, Intervalos e Contagem de Casas
 */
function processarEstrategia() {
  const ultima = historicoVelas[0];
  const penultima = historicoVelas[1];

  // 1. CONTAGEM DE CASAS: Quantas velas se passaram desde a última vela boa (>= 2.00x)
  let casasSemRoxa = 0;
  for (let i = 0; i < historicoVelas.length; i++) {
    if (historicoVelas[i].mult >= CONFIG.VELA_ROXA_MIN) {
      casasSemRoxa = i;
      break;
    }
  }

  // 2. TEMPO/INTERVALO: Intervalo em segundos entre as duas últimas velas capturadas
  const intervaloSegundos = Math.round((ultima.timestamp - penultima.timestamp) / 1000);

  // 3. MINUTAGEM: Avalia a minutagem exata do momento
  const minutoAtual = new Date().getMinutes();
  const minutoPar = minutoAtual % 2 === 0;

  // --- REGRAS DE RECOMENDAÇÃO ---

  // REGRA 1: FILTRO DE SEGURANÇA (Crash Baixo Frequente)
  if (ultima.mult < 1.20) {
    return {
      sinal: '🔴 RECUAR',
      motivo: `Última vela muito baixa (${ultima.mult}x). Risco de sequência negativa.`,
      alvo: 'N/A',
      confianca: '90%',
      metricas: { casasSemRoxa, intervaloSegundos, minutoAtual }
    };
  }

  // REGRA 2: PADRÃO DE RECUPERAÇÃO (Gatilho de 3 a 5 casas sem roxa + Minuto favorável)
  if (casasSemRoxa >= 3 && casasSemRoxa <= 5 && minutoPar) {
    return {
      sinal: '🟢 ENTRAR (ALTA CONFIRMAÇÃO)',
      motivo: `Padrão de recuperação ativado em ${casasSemRoxa} casas + Minuto par (${minutoAtual}m).`,
      alvo: '1.80x - 2.10x',
      confianca: '85%',
      metricas: { casasSemRoxa, intervaloSegundos, minutoAtual }
    };
  }

  // REGRA 3: TENDÊNCIA DE SURF (Duas velas roxas/rosas seguidas)
  if (ultima.mult >= CONFIG.VELA_ROXA_MIN && penultima.mult >= CONFIG.VELA_ROXA_MIN) {
    return {
      sinal: '🟡 ENTRAR COM CAUTELA (SURF)',
      motivo: 'Sequência de velas de ganho ativada.',
      alvo: '1.50x - 1.80x',
      confianca: '65%',
      metricas: { casasSemRoxa, intervaloSegundos, minutoAtual }
    };
  }

  // REGRA 4: AGUARDAR (Mercado Neutro)
  return {
    sinal: '⚪ AGUARDAR / NEUTRO',
    motivo: 'Sem confirmação clara de padrão de minutagem ou contagem.',
    alvo: 'N/A',
    confianca: '50%',
    metricas: { casasSemRoxa, intervaloSegundos, minutoAtual }
  };
}

module.exports = { analisarMercado };