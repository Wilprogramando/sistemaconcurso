'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  CaseUpper,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Palette,
  Strikethrough,
  Underline,
} from 'lucide-react';
import { sanitizarHtml } from '@/lib/html-nota';

const CORES_TEXTO = [
  { nome: 'Padrão', valor: 'inherit' },
  { nome: 'Vermelho', valor: '#dc2626' },
  { nome: 'Laranja', valor: '#ea580c' },
  { nome: 'Verde', valor: '#15803d' },
  { nome: 'Azul', valor: '#1d4ed8' },
  { nome: 'Roxo', valor: '#7e22ce' },
];

/**
 * Tom de cada cor de texto no modo noturno.
 *
 * O contentEditable grava a cor embutida no HTML, então o que vale enquanto
 * se digita é este tom. Depois o saneador troca a cor por classe e o CSS
 * cuida dos dois modos — as duas versões caem na mesma classe.
 */
const TEXTO_NOTURNO: Record<string, string> = {
  '#0f172a': '#e2e8f0',
  '#dc2626': '#f87171',
  '#ea580c': '#fb923c',
  '#15803d': '#4ade80',
  '#1d4ed8': '#93b4fb',
  '#7e22ce': '#c084fc',
};

const CORES_FUNDO = [
  { nome: 'Amarelo', valor: '#fef08a' },
  { nome: 'Verde', valor: '#bbf7d0' },
  { nome: 'Azul', valor: '#bfdbfe' },
  { nome: 'Rosa', valor: '#fbcfe8' },
  { nome: 'Laranja', valor: '#fed7aa' },
  { nome: 'Tirar', valor: 'transparent' },
];

/**
 * Editor de texto rico da anotação: negrito, itálico, sublinhado, riscado,
 * cor da letra, marca-texto, link, listas e imagem no meio do texto.
 *
 * Guarda HTML já saneado. O Ctrl+V entra pelo `onPaste`: o HTML copiado passa
 * pelo saneador em vez de ser colado cru, então o texto não desconfigura e
 * nem traz lixo do site de origem.
 */
export default function EditorRico({
  valor,
  onChange,
  onInserirImagem,
  placeholder,
  autoFocus = false,
}: {
  /** HTML inicial, já com as URLs das imagens resolvidas */
  valor: string;
  onChange: (html: string) => void;
  /** sobe os arquivos e devolve o HTML da imagem para entrar no texto */
  onInserirImagem?: (arquivos: File[]) => Promise<string[]>;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalo = useRef<Range | null>(null);
  const [menu, setMenu] = useState<'texto' | 'fundo' | 'link' | null>(null);
  const [urlLink, setUrlLink] = useState('');
  const [enviando, setEnviando] = useState(false);
  /** quantos trechos estão marcados com Ctrl, só para mostrar na barra */
  const [marcados, setMarcados] = useState(0);

  // o conteúdo é escrito direto no DOM; só semeia na montagem para não
  // embaralhar o cursor a cada tecla
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== valor) ref.current.innerHTML = valor;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  /**
   * Fim do arrasto, ouvido no documento: com Ctrl, o trecho vai para a lista;
   * sem Ctrl, as marcas antigas caem. O `mouseup` da própria caixa não serve,
   * porque quem seleciona até o fim da linha solta o botão fora dela.
   */
  const aoSoltarRef = useRef<(e: MouseEvent) => void>(() => {});
  const aoApertarRef = useRef<(e: MouseEvent) => void>(() => {});
  useEffect(() => {
    const aoSoltar = (e: MouseEvent) => aoSoltarRef.current(e);
    const aoApertar = (e: MouseEvent) => aoApertarRef.current(e);
    document.addEventListener('mouseup', aoSoltar);
    document.addEventListener('mousedown', aoApertar);
    return () => {
      document.removeEventListener('mouseup', aoSoltar);
      document.removeEventListener('mousedown', aoApertar);
    };
  }, []);

  const avisar = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  /** guarda onde estava o cursor antes de clicar num botão de menu */
  function guardarIntervalo() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && ref.current?.contains(sel.anchorNode)) {
      intervalo.current = sel.getRangeAt(0).cloneRange();
    }
  }

  /**
   * O intervalo é guardado a cada mudança de seleção, no documento inteiro.
   *
   * Antes isso só acontecia no `mouseup` de dentro da caixa de texto — e quem
   * arrasta até o fim da linha costuma soltar o botão fora dela. O intervalo
   * ficava velho e o negrito ia parar no lugar errado, ou em lugar nenhum.
   */
  useEffect(() => {
    const aoMudarSelecao = () => {
      const sel = document.getSelection();
      if (!sel || !sel.rangeCount) return;
      if (!ref.current?.contains(sel.anchorNode)) return;
      intervalo.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', aoMudarSelecao);
    return () => document.removeEventListener('selectionchange', aoMudarSelecao);
  }, []);

  function restaurarIntervalo() {
    const sel = window.getSelection();

    // seleção viva dentro da caixa manda mais do que a guardada: repor uma
    // cópia velha por cima era o que fazia o negrito cair no vazio
    const viva =
      sel && sel.rangeCount && !sel.isCollapsed && ref.current?.contains(sel.anchorNode);
    if (viva) {
      ref.current?.focus();
      return;
    }

    if (!sel || !intervalo.current) {
      ref.current?.focus();
      return;
    }
    ref.current?.focus();
    sel.removeAllRanges();
    sel.addRange(intervalo.current);
  }

  /* ---------------- seleção de vários trechos (Ctrl) ---------------- */

  /** marcas vivas no texto, na ordem em que aparecem */
  const marcas = () => [...(ref.current?.querySelectorAll<HTMLElement>('[data-trecho]') ?? [])];

  /**
   * Tira as marcas e devolve o texto para onde estava.
   *
   * Pegadinha: quando a seleção cobre a marca inteira, o Chrome aplica o
   * negrito no próprio elemento da marca, em vez de embrulhar o conteúdo.
   * Desmanchar o elemento jogava fora justamente o estilo recém-aplicado —
   * era por isso que o negrito "não pegava". Então, se a marca ficou com
   * style, ela vira um span comum em vez de sumir.
   */
  const limparMarcas = useCallback(() => {
    for (const marca of marcas()) {
      const pai = marca.parentNode;
      if (!pai) continue;

      if (marca.getAttribute('style')) {
        marca.removeAttribute('data-trecho');
        marca.classList.remove('trecho-marcado');
        if (!marca.className) marca.removeAttribute('class');
        continue;
      }

      while (marca.firstChild) pai.insertBefore(marca.firstChild, marca);
      pai.removeChild(marca);
      pai.normalize();
    }
    setMarcados(0);
  }, []);

  /**
   * Guarda o trecho selecionado como mais um da lista. O Chrome só aceita
   * uma seleção por vez, então cada trecho vira um `<span data-trecho>`
   * destacado — é ele que segura o lugar até o comando ser aplicado.
   */
  function marcarTrecho() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // Ctrl + clique sem arrastar: pega a palavra inteira debaixo do cursor
    if (sel.isCollapsed) {
      const comModify = sel as Selection & {
        modify?: (alter: string, direction: string, granularity: string) => void;
      };
      if (!comModify.modify) return;
      comModify.modify('move', 'backward', 'word');
      comModify.modify('extend', 'forward', 'word');
    }
    if (sel.isCollapsed || !sel.toString().trim()) return;

    const intervaloAtual = sel.getRangeAt(0);
    // não deixa marcar dentro de uma marca que já existe
    const dentro = (no: Node | null) =>
      no instanceof Element ? no.closest('[data-trecho]') : no?.parentElement?.closest('[data-trecho]');
    if (dentro(intervaloAtual.startContainer) || dentro(intervaloAtual.endContainer)) return;

    const marca = document.createElement('span');
    marca.setAttribute('data-trecho', '');
    marca.className = 'trecho-marcado';
    try {
      marca.append(intervaloAtual.extractContents());
      intervaloAtual.insertNode(marca);
    } catch {
      return; // seleção atravessando blocos: ignora em vez de quebrar o texto
    }
    sel.removeAllRanges();
    setMarcados(marcas().length);
  }

  /**
   * Onde a seleção está, em caracteres desde o começo do texto. Os comandos
   * (negrito, CAIXA ALTA, lista…) reescrevem o DOM e o navegador costuma
   * largar a seleção no caminho; a posição em caracteres sobrevive a isso.
   */
  function posicaoDaSelecao(): { ini: number; fim: number } | null {
    const sel = window.getSelection();
    const caixa = ref.current;
    if (!sel || !sel.rangeCount || sel.isCollapsed || !caixa) return null;
    const r = sel.getRangeAt(0);
    if (!caixa.contains(r.commonAncestorContainer)) return null;

    const ate = document.createRange();
    ate.selectNodeContents(caixa);
    ate.setEnd(r.startContainer, r.startOffset);
    const ini = ate.toString().length;
    return { ini, fim: ini + r.toString().length };
  }

  /** devolve a seleção à posição guardada, se o comando a tiver desfeito */
  function repor(posicao: { ini: number; fim: number } | null) {
    const sel = window.getSelection();
    const caixa = ref.current;
    if (!posicao || !sel || !caixa) return;
    if (
      sel.rangeCount &&
      !sel.isCollapsed &&
      caixa.contains(sel.getRangeAt(0).commonAncestorContainer)
    ) {
      return; // o navegador manteve a seleção
    }

    const r = document.createRange();
    const caminhante = document.createTreeWalker(caixa, NodeFilter.SHOW_TEXT);
    let visto = 0;
    let iniciou = false;
    for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
      const tam = no.nodeValue?.length ?? 0;
      if (!iniciou && posicao.ini < visto + tam) {
        r.setStart(no, posicao.ini - visto);
        iniciou = true;
      }
      if (iniciou && posicao.fim <= visto + tam) {
        r.setEnd(no, posicao.fim - visto);
        sel.removeAllRanges();
        sel.addRange(r);
        return;
      }
      visto += tam;
    }
  }

  /**
   * Roda o comando em cada trecho marcado, um por vez. Sem trechos marcados,
   * vale a seleção comum.
   *
   * A seleção (ou as marcas azuis, no caso de vários trechos) continua depois
   * do comando, para empilhar outro em seguida: negrito, depois cor, depois
   * marca-texto. As marcas só caem num clique comum dentro do texto.
   */
  function emCadaTrecho(acao: () => void) {
    const lista = marcas();
    if (!lista.length) {
      restaurarIntervalo();
      const posicao = posicaoDaSelecao();
      acao();
      repor(posicao);
      avisar();
      return;
    }

    ref.current?.focus();
    const sel = window.getSelection();
    for (const marca of lista) {
      if (!sel || !marca.isConnected) continue;
      const intervaloDaMarca = document.createRange();
      intervaloDaMarca.selectNodeContents(marca);
      sel.removeAllRanges();
      sel.addRange(intervaloDaMarca);
      acao();
    }
    sel?.removeAllRanges();
    setMarcados(marcas().length);
    avisar();
  }

  function comando(nome: string, argumento?: string) {
    emCadaTrecho(() => {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand(nome, false, argumento);
    });
  }

  function inserirHtml(html: string) {
    restaurarIntervalo();
    document.execCommand('insertHTML', false, html);
    avisar();
  }

  /**
   * CAIXA ALTA no trecho selecionado, mantendo negrito, cor e links. Se o
   * trecho já estiver todo em maiúsculas, volta para minúsculas — o mesmo
   * botão faz a ida e a volta.
   */
  function alternarCaixa() {
    emCadaTrecho(caixaNaSelecao);
  }

  function caixaNaSelecao() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;

    const intervaloAtual = sel.getRangeAt(0);
    const texto = sel.toString();
    if (!texto.trim()) return;

    const temMinuscula = texto !== texto.toUpperCase();
    const transformar = (t: string) => (temMinuscula ? t.toUpperCase() : t.toLowerCase());

    // mexe só nos nós de texto: as tags de formatação ficam onde estão
    const fragmento = intervaloAtual.cloneContents();
    const caminhante = document.createTreeWalker(fragmento, NodeFilter.SHOW_TEXT);
    let no = caminhante.nextNode();
    while (no) {
      no.nodeValue = transformar(no.nodeValue ?? '');
      no = caminhante.nextNode();
    }

    const caixa = document.createElement('div');
    caixa.append(fragmento);
    document.execCommand('insertHTML', false, sanitizarHtml(caixa.innerHTML));
  }

  function aplicarLink() {
    const bruto = urlLink.trim();
    if (!bruto) return;
    const url = /^(https?:|mailto:|tel:|\/|#)/i.test(bruto) ? bruto : `https://${bruto}`;
    restaurarIntervalo();
    const sel = window.getSelection();
    const textoSelecionado = sel?.toString() ?? '';
    if (textoSelecionado) {
      document.execCommand('createLink', false, url);
    } else {
      document.execCommand(
        'insertHTML',
        false,
        sanitizarHtml(`<a href="${url}">${url}</a>&nbsp;`),
      );
    }
    avisar();
    setUrlLink('');
    setMenu(null);
  }

  async function enviarImagens(arquivos: File[]) {
    if (!onInserirImagem) return;
    const imagens = arquivos.filter((f) => f.type.startsWith('image/'));
    if (!imagens.length) return;
    setEnviando(true);
    const htmls = await onInserirImagem(imagens);
    setEnviando(false);
    if (htmls.length) inserirHtml(htmls.join(''));
  }

  function aoColar(e: React.ClipboardEvent<HTMLDivElement>) {
    const arquivos = [...(e.clipboardData?.files ?? [])].filter((f) =>
      f.type.startsWith('image/'),
    );
    if (arquivos.length) {
      e.preventDefault();
      guardarIntervalo();
      void enviarImagens(arquivos);
      return;
    }

    const html = e.clipboardData?.getData('text/html');
    const texto = e.clipboardData?.getData('text/plain') ?? '';
    e.preventDefault();

    if (html) {
      const limpo = sanitizarHtml(html);
      if (limpo) {
        document.execCommand('insertHTML', false, limpo);
        avisar();
        return;
      }
    }

    // sem HTML: preserva as quebras de linha do texto copiado
    document.execCommand(
      'insertHTML',
      false,
      sanitizarHtml(
        texto
          .split(/\r?\n/)
          .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
          .join('<br />'),
      ),
    );
    avisar();
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const tecla = e.key.toLowerCase();
    const atalhos: Record<string, string> = { b: 'bold', i: 'italic', u: 'underline' };
    if (atalhos[tecla]) {
      e.preventDefault();
      guardarIntervalo();
      comando(atalhos[tecla]);
    }
  }

  /**
   * Ctrl apertado começando um novo arrasto: a seleção que ainda está na tela
   * é a anterior, e é agora ou nunca para guardá-la — no instante seguinte o
   * navegador a desfaz para começar a nova. Sem isso, o primeiro trecho se
   * perdia e o negrito só pegava no último.
   */
  aoApertarRef.current = (e: MouseEvent) => {
    const alvo = e.target as Node | null;
    if (!ref.current?.contains(alvo)) return;

    // clique comum dentro do texto desmancha o que estava marcado
    if (!(e.ctrlKey || e.metaKey)) {
      if (marcas().length) {
        limparMarcas();
        avisar();
      }
      return;
    }

    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || !ref.current.contains(sel.anchorNode)) return;
    marcarTrecho();
    avisar();
  };

  aoSoltarRef.current = (e: MouseEvent) => {
    const sel = document.getSelection();
    const dentroDaCaixa = ref.current?.contains(sel?.anchorNode ?? null);
    if (!dentroDaCaixa) return;

    if (e.ctrlKey || e.metaKey) {
      marcarTrecho();
      avisar();
    }
    // sem Ctrl não mexe nas marcas aqui: quem limpa é o clique que começa a
    // seleção nova, no mousedown
  };

  return (
    <div className="rounded-xl border border-slate-300 bg-white transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:focus-within:ring-brand-900">
      {/* ---------------- barra de ferramentas ---------------- */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 px-1.5 py-1.5 dark:border-slate-700">
        <Ferramenta titulo="Negrito (Ctrl+B)" aoClicar={() => comando('bold')} guardar={guardarIntervalo}>
          <Bold size={15} />
        </Ferramenta>
        <Ferramenta titulo="Itálico (Ctrl+I)" aoClicar={() => comando('italic')} guardar={guardarIntervalo}>
          <Italic size={15} />
        </Ferramenta>
        <Ferramenta
          titulo="Sublinhado (Ctrl+U)"
          aoClicar={() => comando('underline')}
          guardar={guardarIntervalo}
        >
          <Underline size={15} />
        </Ferramenta>
        <Ferramenta
          titulo="Riscado"
          aoClicar={() => comando('strikeThrough')}
          guardar={guardarIntervalo}
        >
          <Strikethrough size={15} />
        </Ferramenta>
        <Ferramenta
          titulo="CAIXA ALTA — selecione o texto; clicando de novo, volta ao normal"
          aoClicar={alternarCaixa}
          guardar={guardarIntervalo}
        >
          <CaseUpper size={17} />
        </Ferramenta>

        <Separador />

        <Ferramenta
          titulo="Cor da letra"
          ativo={menu === 'texto'}
          aoClicar={() => setMenu((m) => (m === 'texto' ? null : 'texto'))}
          guardar={guardarIntervalo}
        >
          <Palette size={15} />
        </Ferramenta>
        <Ferramenta
          titulo="Marca-texto"
          ativo={menu === 'fundo'}
          aoClicar={() => setMenu((m) => (m === 'fundo' ? null : 'fundo'))}
          guardar={guardarIntervalo}
        >
          <Highlighter size={15} />
        </Ferramenta>

        <Separador />

        <Ferramenta
          titulo="Inserir link"
          ativo={menu === 'link'}
          aoClicar={() => setMenu((m) => (m === 'link' ? null : 'link'))}
          guardar={guardarIntervalo}
        >
          <Link2 size={15} />
        </Ferramenta>
        <Ferramenta
          titulo="Tirar o link"
          aoClicar={() => comando('unlink')}
          guardar={guardarIntervalo}
        >
          <Link2Off size={15} />
        </Ferramenta>

        <Separador />

        <Ferramenta
          titulo="Lista com marcadores"
          aoClicar={() => comando('insertUnorderedList')}
          guardar={guardarIntervalo}
        >
          <List size={15} />
        </Ferramenta>
        <Ferramenta
          titulo="Lista numerada"
          aoClicar={() => comando('insertOrderedList')}
          guardar={guardarIntervalo}
        >
          <ListOrdered size={15} />
        </Ferramenta>

        {onInserirImagem && (
          <>
            <Separador />
            <Ferramenta
              titulo="Imagem dentro do texto"
              aoClicar={() => inputRef.current?.click()}
              guardar={guardarIntervalo}
            >
              <ImagePlus size={15} />
            </Ferramenta>
          </>
        )}

        <Separador />

        <Ferramenta
          titulo="Limpar formatação"
          aoClicar={() => comando('removeFormat')}
          guardar={guardarIntervalo}
        >
          <Eraser size={15} />
        </Ferramenta>

        {enviando ? (
          <span className="ml-auto pr-1 text-xs text-slate-500 dark:text-slate-400">
            enviando imagem…
          </span>
        ) : marcados > 0 ? (
          <span className="ml-auto pr-1 text-xs font-medium text-blue-700 dark:text-blue-300">
            {marcados} {marcados === 1 ? 'trecho marcado' : 'trechos marcados'} — clique num botão
          </span>
        ) : null}
      </div>

      {/* ---------------- paletas e campo de link ---------------- */}
      {menu === 'texto' && (
        <Paleta
          cores={CORES_TEXTO}
          aoEscolher={(v) => {
            const base = v === 'inherit' ? '#0f172a' : v;
            const noturno = document.documentElement.classList.contains('dark');
            comando('foreColor', (noturno && TEXTO_NOTURNO[base]) || base);
            setMenu(null);
          }}
        />
      )}
      {menu === 'fundo' && (
        <Paleta
          cores={CORES_FUNDO}
          aoEscolher={(v) => {
            comando('hiliteColor', v);
            setMenu(null);
          }}
        />
      )}
      {menu === 'link' && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/60">
          <input
            value={urlLink}
            onChange={(e) => setUrlLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                aplicarLink();
              }
            }}
            autoFocus
            placeholder="cole o endereço: https://…"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={aplicarLink}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => setMenu(null)}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* ---------------- área de escrita ---------------- */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Corpo da anotação"
        data-placeholder={placeholder ?? 'Escreva aqui.'}
        onInput={avisar}
        onBlur={() => {
          guardarIntervalo();
          avisar();
        }}
        onKeyUp={guardarIntervalo}
        onMouseUp={guardarIntervalo}
        onPaste={aoColar}
        onKeyDown={aoTeclar}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const arquivos = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
          if (!arquivos.length) return;
          e.preventDefault();
          guardarIntervalo();
          void enviarImagens(arquivos);
        }}
        // 18 linhas de 1.75rem: passou disso, rola por dentro em vez de
        // esticar a página
        className="nota-rica max-h-[31.5rem] min-h-40 w-full overflow-y-auto overscroll-contain px-3 py-2.5 text-sm leading-7 outline-none dark:text-slate-100"
      />

      {onInserirImagem && (
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            void enviarImagens([...(e.target.files ?? [])]);
            e.target.value = '';
          }}
        />
      )}
    </div>
  );
}

function Ferramenta({
  titulo,
  aoClicar,
  guardar,
  ativo = false,
  children,
}: {
  titulo: string;
  aoClicar: () => void;
  guardar: () => void;
  ativo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      aria-pressed={ativo}
      // o mousedown guarda o cursor e evita que o clique roube o foco do texto
      onMouseDown={(e) => {
        e.preventDefault();
        guardar();
      }}
      onClick={aoClicar}
      className={`grid h-8 w-8 place-items-center rounded-lg transition ${
        ativo
          ? 'bg-brand-600 text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

const Separador = () => <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />;

function Paleta({
  cores,
  aoEscolher,
}: {
  cores: { nome: string; valor: string }[];
  aoEscolher: (valor: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-900/60">
      {cores.map((c) => (
        <button
          key={c.valor}
          type="button"
          title={c.nome}
          aria-label={c.nome}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => aoEscolher(c.valor)}
          className="h-7 w-7 rounded-full ring-1 ring-slate-300 transition hover:scale-110 dark:ring-slate-600"
          style={{
            background:
              c.valor === 'transparent' || c.valor === 'inherit'
                ? 'repeating-linear-gradient(45deg,#fff 0 6px,#cbd5e1 6px 12px)'
                : c.valor,
          }}
        />
      ))}
    </div>
  );
}
