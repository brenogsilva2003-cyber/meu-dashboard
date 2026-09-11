/**
 * Motor Avançado de Análise Preditiva para Aviator
 * Avalia confluências de minutagem, intervalos de casas, saúde do mercado e padrões.
 */

function analisarHistorico(historyData) {
  // Padrão de saída para poucas rodadas
  if (!historyData || historyData.length < 15) {
    return {
      sinal: '⚪ AGUARDAR',
      motivo: 'Aguardando mais dados históricos para análise (mínimo 15 rodadas)...',
      alvo: 'N/A',
      confianca: '0%'
    };
  }

  const ultimaVela = historyData[0];
  const agora = new Date();
  const minutoAtualStr = agora.getMinutes().toString();
  const digitoMinutoAtual = parseInt(minutoAtualStr.slice(-1)); // Último dígito do minuto atual (0-9)

  // -------------------------------------------------------------
  // 1. ANÁLISE DE INTERVALO (CASAS DESDE A ÚLTIMA ROSA)
  // -------------------------------------------------------------
  let casasDesdeUltimaRosa = 0;
  for (let i = 0; i < historyData.length; i++) {
    if (historyData[i].mult >= 10) {
      casasDesdeUltimaRosa = i;
      break;
    }
  }

  // -------------------------------------------------------------
  // 2. FREQUÊNCIA DE MINUTAGEM NOS ÚLTIMOS 20 MINUTOS
  // -------------------------------------------------------------
  const vinteMinutosMs = 20 * 60 * 1000;
  const agoraMs = agora.getTime();

  const rosasRecentes = historyData.filter(item => {
    const eRosa = item.mult >= 10;
    const dentroJanela = item.timestamp ? (agoraMs - item.timestamp) <= vinteMinutosMs : true;
    return eRosa && dentroJanela;
  });

  const contagemDigitos = Array(10).fill(0);
  rosasRecentes.forEach(item => {
    if (item.time) {
      const min = item.time.split(':')[1];
      if (min) {
        const digito = parseInt(min.slice(-1));
        contagemDigitos[digito]++;
      }
    }
  });

  const pesoMinutoAtual = contagemDigitos[digitoMinutoAtual] || 0;

  // -------------------------------------------------------------
  // 3. SAÚDE DO MERCADO DA ÚLTIMA HORA (PORCENTAGENS)
  // -------------------------------------------------------------
  const umaHoraMs = 60 * 60 * 1000;
  const velasHora = historyData.filter(i => i.timestamp && (agoraMs - i.timestamp) <= umaHoraMs);
  const totalHora = velasHora.length || historyData.length;

  const qRoxaERosa = velasHora.filter(i => i.mult >= 2).length;
  const pctPagamentoHora = totalHora > 0 ? (qRoxaERosa / totalHora) * 100 : 0;

  // Sequência de Azuis Atual
  let azuisSeguidos = 0;
  for (let item of historyData) {
    if (item.mult < 2) azuisSeguidos++;
    else break;
  }

  // -------------------------------------------------------------
  // 4. SISTEMA DE PONTUAÇÃO MULTICRITÉRIO (0 a 100)
  // -------------------------------------------------------------
  let pontuacao = 0;

  // A) Pontos por Minuto Quente (Até 35 pontos)
  if (pesoMinutoAtual >= 2) pontuacao += 35;
  else if (pesoMinutoAtual === 1) pontuacao += 20;

  // B) Pontos por Intervalo de Casas (Até 30 pontos)
  if (casasDesdeUltimaRosa >= 3 && casasDesdeUltimaRosa <= 10) {
    pontuacao += 30; // ZONA IDEAL DE REPETIÇÃO
  } else if (casasDesdeUltimaRosa > 10 && casasDesdeUltimaRosa <= 18) {
    pontuacao += 20; // MATURAÇÃO DE ROSA
  } else if (casasDesdeUltimaRosa === 1) {
    pontuacao += 15; // POSSÍVEL ROSA DUPLA
  }

  // C) Pontos por Saúde do Mercado (Até 25 pontos)
  if (pctPagamentoHora >= 55) pontuacao += 25;
  else if (pctPagamentoHora >= 45) pontuacao += 15;

  // D) Fator de Tendência Atual (Até 10 pontos)
  if (ultimaVela.mult >= 2 && ultimaVela.mult < 10) pontuacao += 10;

  // -------------------------------------------------------------
  // 5. REGRAS DE RECUO E FILTROS DE SEGURANÇA
  // -------------------------------------------------------------
  // Se houver 3 ou mais azuis seguidos (Mercado em recolhimento)
  if (azuisSeguidos >= 3) {
    return {
      sinal: '🔴 RECUAR / ALERTA',
      motivo: `Sequência de ${azuisSeguidos} azuis seguidos. Mercado em fase de recolhimento.`,
      alvo: 'N/A',
      confianca: '15%'
    };
  }

  // Se o mercado da última hora estiver muito abaixo do normal (< 38% pagando)
  if (pctPagamentoHora < 38) {
    return {
      sinal: '🔴 RECUAR / MERCADO FRIO',
      motivo: `Apenas ${pctPagamentoHora.toFixed(0)}% de velas roxas/rosas na última hora.`,
      alvo: 'N/A',
      confianca: '20%'
    };
  }

  // -------------------------------------------------------------
  // 6. GERAÇÃO DO SINAL E TARGET SUGERIDO
  // -------------------------------------------------------------
  // Cálculo de Média Móvel para Sugestão de Alvo
  const ultimasRosas = historyData.filter(i => i.mult >= 10).slice(0, 10);
  const mediaRosa = ultimasRosas.length > 0 
    ? (ultimasRosas.reduce((acc, c) => acc + c.mult, 0) / ultimasRosas.length) 
    : 10;

  if (pontuacao >= 70) {
    const alvoSugerido = mediaRosa >= 15 ? '3.00x a 10.00x' : '2.00x a 5.00x';
    return {
      sinal: '🟢 ENTRAR CONFIRMADO',
      motivo: `Confluência forte! Minuto ${digitoMinutoAtual} aquecido e casa ${casasDesdeUltimaRosa} favorável.`,
      alvo: alvoSugerido,
      confianca: `${Math.min(pontuacao, 95)}%`
    };
  } 
  
  if (pontuacao >= 45) {
    return {
      sinal: '🟡 ENTRADA MODERADA',
      motivo: `Padrão moderado. Ponderação na casa ${casasDesdeUltimaRosa}. Busque proteção em 2.00x.`,
      alvo: '1.50x a 2.00x',
      confianca: `${pontuacao}%`
    };
  }

  return {
    sinal: '⚪ AGUARDAR / NEUTRO',
    motivo: `Aguardando melhor momento (Casa ${casasDesdeUltimaRosa} sem padrão claro de minutagem).`,
    alvo: 'N/A',
    confianca: `${pontuacao}%`
  };
}

module.exports = { analisarHistorico };