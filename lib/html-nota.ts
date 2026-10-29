/**
 * Saneamento do HTML das anotações.
 *
 * O corpo da anotação é escrito num campo contentEditable, então o que chega
 * pode vir de um Ctrl+V de site, Word ou PDF. Aqui o HTML é reescrito a partir
 * do zero: só as tags e os atributos da lista branca sobrevivem, e `style` só
 * aceita cor, fundo e decoração. Nada de script, iframe, on*, javascript:.
 *
 * É propositalmente sem DOM: roda igual no servidor (SSR do componente) e no
 * navegador.
 */

/** tags mantidas; o valor é a lista de atributos permitidos */
const PERMITIDAS: Record<string, string[]> = {
  p: ['style', 'class'],
  div: ['style', 'class'],
  br: [],
  b: [],
  strong: [],
  i: [],
  em: [],
  u: [],
  s: [],
  strike: [],
  mark: ['style', 'class'],
  span: ['style', 'class'],
  // o Chrome ainda grava <font style="background-color: …"> no marca-texto,
  // então a tag precisa aceitar style e class além do color antigo
  font: ['color', 'style', 'class'],
  code: [],
  pre: [],
  blockquote: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  ul: [],
  ol: [],
  li: ['style', 'class'],
  a: ['href', 'title'],
  img: ['src', 'alt', 'data-path', 'style'],
  hr: [],
};

/** tags que renomeamos para a forma canônica */
const RENOMEAR: Record<string, string> = { strike: 's', font: 'span', h1: 'h3', h2: 'h3' };

/** tags sem fechamento */
const VAZIAS = new Set(['br', 'img', 'hr']);

/** o conteúdo destas tags é jogado fora inteiro */
const LIXO = new Set(['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'svg', 'math']);

const PROPS_STYLE = new Set([
  'color',
  'background-color',
  'background',
  'font-weight',
  'text-decoration',
]);

/** começo de entidade HTML válida: &nbsp;, &#160;, &#xA0;, &amp; … */
const ENTIDADE = /^&(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/;

/**
 * Escapa o texto sem reescapar o que já é entidade.
 *
 * O saneador roda ao colar, ao salvar e ao exibir. Como todo "e comercial"
 * virava entidade a cada passada, um espaço fixo colado do Word ganhava um
 * "amp;" por rodada e a anotação acabava mostrando a entidade crua na tela.
 * A primeira troca desfaz o que já se acumulou nas anotações antigas.
 */
const escaparTexto = (s: string) =>
  s
    .replace(/&(?:amp;)+(?=#?[a-zA-Z0-9]{1,31};)/g, '&')
    .replace(/&/g, (_m, posicao: number, todo: string) =>
      ENTIDADE.test(todo.slice(posicao)) ? '&' : '&amp;',
    )
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escaparAtributo = (s: string) =>
  escaparTexto(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** aceita só cores em hex, rgb(a) e nomes simples */
const corValida = (v: string) =>
  /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(\s*[\d.\s,%]+\)$/i.test(v) || /^[a-z]+$/i.test(v);

/**
 * Cor em hex de seis dígitos, minúsculo, para comparar com a paleta.
 * O contentEditable grava `rgb(220, 38, 38)`; a paleta guarda `#dc2626`.
 */
function hexDaCor(valor: string): string | null {
  const v = valor.trim().toLowerCase();
  const rgb = v.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgb)
    return `#${rgb
      .slice(1, 4)
      .map((n) => Number(n).toString(16).padStart(2, '0'))
      .join('')}`;
  if (/^#[0-9a-f]{3}$/.test(v))
    return `#${v
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`;
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  return null;
}

/**
 * A cor escolhida na paleta vira classe, e não estilo embutido.
 *
 * Estilo embutido ganha de qualquer regra do CSS, então o vermelho escuro
 * continuava escuro sobre o fundo escuro do modo noturno. Virando classe,
 * cada cor tem um tom para o modo claro e outro para o noturno, definidos em
 * `app/globals.css`. Os dois tons de uma cor apontam para a mesma classe: a
 * anotação escrita no modo noturno aparece certa no modo claro, e ao contrário.
 */
const CLASSE_TEXTO: Record<string, string> = {
  '#0f172a': 'cor-padrao',
  '#e2e8f0': 'cor-padrao',
  '#dc2626': 'cor-vermelho',
  '#f87171': 'cor-vermelho',
  '#ea580c': 'cor-laranja',
  '#fb923c': 'cor-laranja',
  '#15803d': 'cor-verde',
  '#4ade80': 'cor-verde',
  '#1d4ed8': 'cor-azul',
  '#93b4fb': 'cor-azul',
  '#7e22ce': 'cor-roxo',
  '#c084fc': 'cor-roxo',
};

const CLASSE_FUNDO: Record<string, string> = {
  '#fef08a': 'grifo-amarelo',
  '#bbf7d0': 'grifo-verde',
  '#bfdbfe': 'grifo-azul',
  '#fbcfe8': 'grifo-rosa',
  '#fed7aa': 'grifo-laranja',
};

/**
 * As classes de cor que o saneador escreve e que ele precisa aceitar de volta.
 *
 * O HTML gravado não guarda mais o estilo embutido, só a classe. Como o
 * saneador roda outra vez ao abrir e ao exibir a anotação, uma classe recusada
 * apagava o grifo e a cor da letra que já estavam salvos.
 */
const CLASSES_NOSSAS = new Set([...Object.values(CLASSE_TEXTO), ...Object.values(CLASSE_FUNDO)]);

/** devolve o `style` que sobrou e as classes de cor que o substituem */
function limparStyle(valor: string): { style: string; classes: string[] } {
  const partes: string[] = [];
  const classes: string[] = [];
  for (const regra of valor.split(';')) {
    const [bruta, ...resto] = regra.split(':');
    if (!bruta || !resto.length) continue;
    const prop = bruta.trim().toLowerCase();
    const v = resto.join(':').trim();
    if (!PROPS_STYLE.has(prop) || !v) continue;
    if (/url\(|expression|var\(|\\/i.test(v)) continue;
    if (prop === 'color' || prop === 'background-color' || prop === 'background') {
      if (!corValida(v)) continue;
      const hex = hexDaCor(v);
      const classe = hex ? (prop === 'color' ? CLASSE_TEXTO[hex] : CLASSE_FUNDO[hex]) : undefined;
      if (classe) {
        if (!classes.includes(classe)) classes.push(classe);
        continue;
      }
      // fundo transparente é o botão "Tirar": não deixa grifo nenhum
      if (prop !== 'color' && /^transparent$/i.test(v)) continue;
    }
    if (prop === 'font-weight' && !/^(bold|[1-9]00)$/i.test(v)) continue;
    if (prop === 'text-decoration' && !/^(underline|line-through)$/i.test(v)) continue;
    partes.push(`${prop}: ${v}`);
  }
  return { style: partes.join('; '), classes };
}

function limparHref(valor: string) {
  const v = valor.trim();
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^(\/|#)/.test(v)) return v;
  if (/^www\./i.test(v)) return `https://${v}`;
  return null;
}

/** src de imagem: só http(s) ou data:image */
function limparSrc(valor: string) {
  const v = valor.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v)) return v;
  return null;
}

const ATRIBUTO = /([a-zA-Z_:][-\w:.]*)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

function limparAtributos(tag: string, bruto: string) {
  const ok = PERMITIDAS[tag] ?? [];
  if (!ok.length) return '';

  const saida: string[] = [];
  const classes: string[] = [];
  let m: RegExpExecArray | null;
  ATRIBUTO.lastIndex = 0;
  while ((m = ATRIBUTO.exec(bruto))) {
    const nome = m[1].toLowerCase();
    let valor = (m[2] ?? '').replace(/^["']|["']$/g, '');
    if (!ok.includes(nome)) continue;

    if (nome === 'class') {
      // só as classes da nossa paleta voltam; o resto é lixo do HTML colado
      for (const c of valor.split(/\s+/)) {
        if (CLASSES_NOSSAS.has(c) && !classes.includes(c)) classes.push(c);
      }
      continue;
    }

    if (nome === 'style') {
      const limpo = limparStyle(valor);
      for (const c of limpo.classes) if (!classes.includes(c)) classes.push(c);
      valor = limpo.style;
      if (!valor) continue;
    } else if (nome === 'href') {
      const h = limparHref(valor);
      if (!h) continue;
      valor = h;
    } else if (nome === 'src') {
      const s = limparSrc(valor);
      if (!s) continue;
      valor = s;
    } else if (nome === 'color') {
      if (!corValida(valor)) continue;
      const hex = hexDaCor(valor);
      const classe = hex ? CLASSE_TEXTO[hex] : undefined;
      if (classe) {
        if (!classes.includes(classe)) classes.push(classe);
        continue;
      }
      // <font color> vira style, já que a tag é renomeada para span
      saida.push(`style="color: ${escaparAtributo(valor)}"`);
      continue;
    } else if (nome === 'data-path') {
      if (!/^[\w./-]+$/.test(valor)) continue;
    }

    saida.push(`${nome}="${escaparAtributo(valor)}"`);
  }

  if (tag === 'a') {
    if (!saida.some((a) => a.startsWith('href='))) return null; // link sem destino: só o texto
    saida.push('target="_blank"', 'rel="noopener noreferrer nofollow"');
  }

  // as classes são nossas, não vêm do HTML colado: entram depois da limpeza
  if (classes.length) saida.push(`class="${classes.join(' ')}"`);

  return saida.length ? ` ${saida.join(' ')}` : '';
}

/** Reescreve o HTML da anotação mantendo só o que está na lista branca. */
export function sanitizarHtml(entrada: string): string {
  if (!entrada) return '';

  let saida = '';
  const pilha: string[] = [];
  let i = 0;
  let ignorarAte: string | null = null;

  while (i < entrada.length) {
    const abre = entrada.indexOf('<', i);

    if (abre === -1) {
      if (!ignorarAte) saida += escaparTexto(entrada.slice(i));
      break;
    }
    if (abre > i && !ignorarAte) saida += escaparTexto(entrada.slice(i, abre));

    const fecha = entrada.indexOf('>', abre);
    if (fecha === -1) {
      if (!ignorarAte) saida += escaparTexto(entrada.slice(abre));
      break;
    }

    const interno = entrada.slice(abre + 1, fecha);
    i = fecha + 1;

    // comentários e declarações
    if (/^[!?]/.test(interno)) continue;

    const ehFechamento = interno.startsWith('/');
    const corpo = ehFechamento ? interno.slice(1) : interno;
    const nome = (corpo.match(/^[a-zA-Z][-\w:]*/)?.[0] ?? '').toLowerCase();
    if (!nome) continue;

    if (ignorarAte) {
      if (ehFechamento && nome === ignorarAte) ignorarAte = null;
      continue;
    }

    if (LIXO.has(nome)) {
      if (!ehFechamento && !interno.endsWith('/')) ignorarAte = nome;
      continue;
    }

    if (!PERMITIDAS[nome]) continue;

    const final = RENOMEAR[nome] ?? nome;

    if (ehFechamento) {
      const pos = pilha.lastIndexOf(final);
      if (pos === -1) continue;
      // fecha tudo que ficou aberto por cima, para o HTML sair equilibrado
      for (let k = pilha.length - 1; k >= pos; k -= 1) saida += `</${pilha[k]}>`;
      pilha.length = pos;
      continue;
    }

    const atributos = limparAtributos(nome, corpo.slice(nome.length));
    if (atributos === null) continue; // <a> sem href: mantém só o conteúdo

    if (VAZIAS.has(final)) {
      saida += `<${final}${atributos} />`;
      continue;
    }

    saida += `<${final}${atributos}>`;
    pilha.push(final);
  }

  for (let k = pilha.length - 1; k >= 0; k -= 1) saida += `</${pilha[k]}>`;
  return saida.trim();
}

/** Texto puro do HTML — serve para busca, título automático e prévia. */
export function textoDoHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-4]|blockquote|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** `true` quando a anotação não tem conteúdo nenhum. */
export const htmlVazio = (html: string) => !textoDoHtml(html) && !/<img[\s>/]/i.test(html);

/** Texto simples virando HTML — usado para abrir anotações antigas no editor. */
export const textoParaHtml = (texto: string) =>
  texto
    ? texto
        .split(/\n{2,}/)
        .map((p) => `<p>${escaparTexto(p).replace(/\n/g, '<br />')}</p>`)
        .join('')
    : '';

/** Caminhos do bucket citados por imagens dentro do corpo. */
export function caminhosNoHtml(html: string): string[] {
  const achados = new Set<string>();
  for (const m of html.matchAll(/data-path="([^"]+)"/g)) achados.add(m[1]);
  return [...achados];
}

/** Troca os placeholders `data-path` pelas URLs assinadas da vez. */
export function aplicarUrls(html: string, urls: Record<string, string>): string {
  return html.replace(/<img([^>]*)data-path="([^"]+)"([^>]*)>/g, (todo, antes, caminho, depois) => {
    const url = urls[caminho as string];
    if (!url) return todo;
    const limpo = `${antes}${depois}`.replace(/\ssrc="[^"]*"/g, '');
    return `<img src="${escaparAtributo(url)}" data-path="${escaparAtributo(caminho)}"${limpo}>`;
  });
}

/**
 * Tira o `src` das imagens internas antes de gravar: a URL assinada expira em
 * uma hora, quem vale é o `data-path`.
 */
export function removerUrlsAssinadas(html: string): string {
  return html.replace(/<img([^>]*)>/g, (todo, attrs: string) =>
    /data-path="/.test(attrs) ? `<img${attrs.replace(/\ssrc="[^"]*"/g, '')}>` : todo,
  );
}
