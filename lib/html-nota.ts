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
  p: ['style'],
  div: ['style'],
  br: [],
  b: [],
  strong: [],
  i: [],
  em: [],
  u: [],
  s: [],
  strike: [],
  mark: ['style'],
  span: ['style'],
  font: ['color'],
  code: [],
  pre: [],
  blockquote: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  ul: [],
  ol: [],
  li: ['style'],
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

const escaparTexto = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escaparAtributo = (s: string) =>
  escaparTexto(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** aceita só cores em hex, rgb(a) e nomes simples */
const corValida = (v: string) =>
  /^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\(\s*[\d.\s,%]+\)$/i.test(v) || /^[a-z]+$/i.test(v);

function limparStyle(valor: string) {
  const partes: string[] = [];
  for (const regra of valor.split(';')) {
    const [bruta, ...resto] = regra.split(':');
    if (!bruta || !resto.length) continue;
    const prop = bruta.trim().toLowerCase();
    const v = resto.join(':').trim();
    if (!PROPS_STYLE.has(prop) || !v) continue;
    if (/url\(|expression|var\(|\\/i.test(v)) continue;
    if ((prop === 'color' || prop === 'background-color' || prop === 'background') && !corValida(v))
      continue;
    if (prop === 'font-weight' && !/^(bold|[1-9]00)$/i.test(v)) continue;
    if (prop === 'text-decoration' && !/^(underline|line-through)$/i.test(v)) continue;
    partes.push(`${prop}: ${v}`);
  }
  return partes.join('; ');
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
  let m: RegExpExecArray | null;
  ATRIBUTO.lastIndex = 0;
  while ((m = ATRIBUTO.exec(bruto))) {
    const nome = m[1].toLowerCase();
    let valor = (m[2] ?? '').replace(/^["']|["']$/g, '');
    if (!ok.includes(nome)) continue;

    if (nome === 'style') {
      valor = limparStyle(valor);
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
