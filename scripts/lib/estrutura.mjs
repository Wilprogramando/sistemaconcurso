/**
 * Converte o texto de um topico da apostila (saida do `pdftotext -layout`)
 * em blocos estruturados, para o app renderizar com tipografia de verdade
 * em vez de um bloco monoespacado.
 *
 * Blocos produzidos:
 *   { type: 'heading',   text }
 *   { type: 'paragraph', text }
 *   { type: 'list',      items: [text] }
 *   { type: 'table',     head: [col], rows: [[cel]] }
 *   { type: 'callout',   variant: 'edital'|'atencao'|'dica'|'mnemonico', title, body }
 */

const CALLOUTS = {
  'NO EDITAL': 'edital',
  ATENÇÃO: 'atencao',
  'DICA DE PROVA': 'dica',
  MNEMÔNICO: 'mnemonico',
  'PEGADINHA DA BANCA': 'atencao',
};

const vazia = (l) => !l || !l.trim();
const indent = (l) => l.length - l.trimStart().length;

/** Colunas em que TODAS as linhas do bloco tem espaco — candidatas a separador. */
function colunasDeGap(linhas) {
  const largura = Math.max(...linhas.map((l) => l.length));
  const gaps = [];
  for (let c = 0; c < largura; c++) {
    if (linhas.every((l) => c >= l.length || l[c] === ' ')) gaps.push(c);
  }
  return gaps;
}

/** Agrupa colunas de gap consecutivas em separadores de 2+ espacos. */
function separadores(gaps) {
  const blocos = [];
  let inicio = null;
  let anterior = null;
  for (const c of gaps) {
    if (inicio === null) {
      inicio = c;
    } else if (c !== anterior + 1) {
      blocos.push([inicio, anterior]);
      inicio = c;
    }
    anterior = c;
  }
  if (inicio !== null) blocos.push([inicio, anterior]);
  return blocos.filter(([a, b]) => b - a >= 1 && a > 0);
}

/** Tenta ler um conjunto de linhas como tabela de largura fixa. */
function tentaTabela(linhas) {
  if (linhas.length < 2) return null;

  const seps = separadores(colunasDeGap(linhas));
  if (!seps.length) return null;

  // pontos de corte: inicio de cada coluna
  const cortes = [0, ...seps.map(([, fim]) => fim + 1)];
  if (cortes.length < 2 || cortes.length > 6) return null;

  const fatia = (linha) =>
    cortes.map((ini, i) => {
      const fim = i + 1 < cortes.length ? cortes[i + 1] : linha.length;
      return linha.slice(ini, fim).trim();
    });

  const brutas = linhas.map(fatia);

  // Monta as linhas tratando quebra de texto dentro da celula: o PDF quebra
  // tanto a 1a coluna ("Irretroatividade da lei mais" / "gravosa") quanto as
  // demais. E continuacao quando a 1a coluna esta vazia, ou quando a linha tem
  // uma unica celula preenchida e a anterior tinha mais de uma.
  const rows = [];
  for (const celulas of brutas) {
    const preenchidas = celulas.filter((c) => c).length;
    if (!preenchidas) continue;

    const anterior = rows[rows.length - 1];
    const continuacao =
      anterior &&
      (!celulas[0] || (preenchidas === 1 && anterior.filter((c) => c).length > 1));

    if (continuacao) {
      celulas.forEach((c, i) => {
        if (c) anterior[i] = (anterior[i] ? anterior[i] + ' ' : '') + c;
      });
    } else {
      rows.push(celulas);
    }
  }

  if (rows.length < 2) return null;
  // precisa de pelo menos duas colunas com conteudo em mais de uma linha
  const colunasUteis = rows[0].map((_, i) => rows.filter((r) => r[i]).length);
  if (colunasUteis.filter((n) => n >= 2).length < 2) return null;

  const head = rows[0];
  const corpo = rows.slice(1);
  // cabecalho plausivel: curto e sem ponto final
  const pareceCabecalho = head.every((c) => c.length <= 40 && !/[.;]$/.test(c));

  return pareceCabecalho
    ? { type: 'table', head, rows: corpo }
    : { type: 'table', head: null, rows };
}

/** Junta linhas quebradas pelo PDF em um paragrafo so. */
function juntaLinhas(linhas) {
  return linhas
    .map((l) => l.trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dentro de um grupo indentado, cada item comeca com maiuscula/numero e o
 * anterior terminou com pontuacao forte — e assim que a apostila lista topicos.
 */
function quebraEmItens(linhas) {
  const base = Math.min(...linhas.map(indent));
  const itens = [];
  let atual = [];
  for (const l of linhas) {
    // item numerado ("1. Advertência —") sempre abre um item novo
    const numerado = indent(l) <= base + 2 && /^\d{1,2}[.)]\s+\S/.test(l.trim());
    const novo =
      numerado ||
      (indent(l) <= base + 1 &&
        /^[A-ZÀ-Ü0-9§"“(]/.test(l.trim()) &&
        (!atual.length || /[.;:!?)]$/.test(atual[atual.length - 1].trim())));
    if (novo && atual.length) {
      itens.push(juntaLinhas(atual));
      atual = [l];
    } else {
      atual.push(l);
    }
  }
  if (atual.length) itens.push(juntaLinhas(atual));
  return itens.filter(Boolean);
}

/**
 * O PDF quebra paginas no meio de uma frase, e o rodape removido deixa uma
 * linha em branco ali. Isso faz um bloco comecar em minuscula, no meio da
 * oracao. Esta passagem costura esses pedacos de volta no bloco anterior.
 */
function costurar(blocos) {
  const texto = (b) =>
    b.type === 'paragraph' ? b.text : b.type === 'list' ? b.items[0] : b.type === 'callout' ? b.body : '';

  const out = [];
  for (const bloco of blocos) {
    const anterior = out[out.length - 1];
    const inicio = texto(bloco).trim();
    const continua =
      anterior &&
      inicio &&
      /^[a-zà-ÿ]/.test(inicio) &&
      (bloco.type === 'paragraph' || bloco.type === 'list') &&
      (anterior.type === 'paragraph' || anterior.type === 'list');

    // lista numerada partida em dois blocos ("1. ... 2. ..." / "3. ... 4. ...")
    if (anterior?.type === 'list' && bloco.type === 'list') {
      const ultimo = anterior.items[anterior.items.length - 1].match(/^(\d{1,2})[.)]/);
      const primeiro = bloco.items[0].match(/^(\d{1,2})[.)]/);
      if (ultimo && primeiro && Number(primeiro[1]) === Number(ultimo[1]) + 1) {
        anterior.items.push(...bloco.items);
        continue;
      }
    }

    if (!continua) {
      out.push(bloco);
      continue;
    }

    const pedaco = bloco.type === 'paragraph' ? bloco.text : bloco.items[0];
    if (anterior.type === 'paragraph') anterior.text += ' ' + pedaco;
    else anterior.items[anterior.items.length - 1] += ' ' + pedaco;

    if (bloco.type === 'list' && bloco.items.length > 1) {
      out.push({ type: 'list', items: bloco.items.slice(1) });
    }
  }
  return out;
}

export function estruturar(texto) {
  const linhas = texto.split('\n');
  const blocos = [];

  let i = 0;
  while (i < linhas.length) {
    if (vazia(linhas[i])) {
      i++;
      continue;
    }

    const bruta = linhas[i];
    const titulo = bruta.trim();

    // --- destaque (NO EDITAL, ATENÇÃO, DICA DE PROVA...) ---
    const variante = CALLOUTS[titulo.toUpperCase()];
    if (variante && titulo.length <= 24) {
      const corpo = [];
      i++;
      // o corpo do destaque fica recuado; ele termina quando o recuo volta a
      // diminuir, que e como a apostila fecha a caixa
      let baseCorpo = null;
      while (i < linhas.length) {
        if (vazia(linhas[i])) {
          const proxima = linhas.slice(i + 1).find((l) => !vazia(l));
          if (!proxima) break;
          if (baseCorpo !== null && indent(proxima) < baseCorpo) break;
          i++;
          continue;
        }
        if (CALLOUTS[linhas[i].trim().toUpperCase()]) break;
        if (baseCorpo === null) baseCorpo = indent(linhas[i]);
        else if (indent(linhas[i]) < baseCorpo) break;
        corpo.push(linhas[i]);
        i++;
      }
      if (corpo.length) {
        blocos.push({
          type: 'callout',
          variant: variante,
          title: titulo,
          body: juntaLinhas(corpo),
        });
      }
      continue;
    }

    // --- junta o bloco contiguo de linhas nao vazias ---
    const grupo = [];
    while (i < linhas.length && !vazia(linhas[i])) {
      if (CALLOUTS[linhas[i].trim().toUpperCase()]) break;
      grupo.push(linhas[i]);
      i++;
    }
    if (!grupo.length) continue;

    // --- subtitulos colados no conteudo seguinte ---
    // A apostila escreve "Conceitos centrais" recuado 2 e os itens recuados 4,
    // sem linha em branco entre eles; sem isso o titulo some dentro do paragrafo.
    while (grupo.length > 1) {
      const primeira = grupo[0].trim();
      if (
        indent(grupo[0]) < indent(grupo[1]) &&
        primeira.length <= 70 &&
        !/[.;:,]$/.test(primeira) &&
        /^[A-ZÀ-Ü0-9]/.test(primeira)
      ) {
        blocos.push({ type: 'heading', text: primeira });
        grupo.shift();
      } else break;
    }
    if (!grupo.length) continue;

    // --- tabela? ---
    const tabela = tentaTabela(grupo);
    if (tabela) {
      blocos.push(tabela);
      continue;
    }

    // --- subtitulo isolado? ---
    if (
      grupo.length === 1 &&
      grupo[0].trim().length <= 70 &&
      !/[.;:]$/.test(grupo[0].trim()) &&
      /^[A-ZÀ-Ü0-9]/.test(grupo[0].trim())
    ) {
      blocos.push({ type: 'heading', text: grupo[0].trim() });
      continue;
    }

    // --- lista ou paragrafo ---
    const itens = quebraEmItens(grupo);
    if (itens.length > 1) blocos.push({ type: 'list', items: itens });
    else blocos.push({ type: 'paragraph', text: juntaLinhas(grupo) });
  }

  // Costura em passadas: a primeira cola os fragmentos de quebra de pagina e
  // so entao as listas numeradas ficam adjacentes para serem unidas.
  let atual = costurar(blocos);
  for (let p = 0; p < 3; p++) {
    const proxima = costurar(atual);
    if (proxima.length === atual.length) return proxima;
    atual = proxima;
  }
  return atual;
}
