'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Scissors,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { linkQConcursosGeral } from '@/lib/qconcursos';
import { linkChatGPT } from '@/lib/chatgpt';
import { useSessao } from '@/components/sessao';
import { nextReview, type ReviewState } from '@/lib/srs';
import type { Alternativa } from '@/lib/types';

type Aberto = { x: number; y: number; texto: string; editavel: boolean };

type Previa = {
  id: number;
  topic_id: number | null;
  kind: 'ce' | 'mc' | 'open';
  options: Alternativa[] | null;
  statement: string;
  answer: string | null;
  explanation: string;
  origin_label: string | null;
  year: number | null;
  banca: string | null;
};

const MIN = 2;
const MAX = 120;

/**
 * Menu do botão direito: selecionou uma palavra ou frase em qualquer tela,
 * clicou com o direito e escolheu "Pesquisar questões" — abre um pop-up com
 * as primeiras questões, sem sair da tela. O botão do pop-up leva à busca
 * completa por palavra-chave.
 *
 * Sem texto selecionado o menu do navegador continua o de sempre. Com texto,
 * este menu assume e traz também Copiar (e Recortar, nos campos de escrita);
 * colar segue no Ctrl+V.
 */
export default function MenuPesquisa() {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  /** palavra com o pop-up de resultados aberto */
  const [busca, setBusca] = useState<string | null>(null);
  const buscaAberta = useRef(false);
  buscaAberta.current = busca !== null;
  const caixa = useRef<HTMLDivElement>(null);

  const fechar = useCallback(() => setAberto(null), []);
  const fecharBusca = useCallback(() => setBusca(null), []);

  useEffect(() => {
    const aoAbrir = (e: MouseEvent) => {
      if (buscaAberta.current) return; // com o pop-up aberto, vale o menu normal
      const alvo = e.target as HTMLElement | null;
      const campo = alvo?.closest<HTMLInputElement | HTMLTextAreaElement>('input, textarea');

      let texto = '';
      if (campo && typeof campo.selectionStart === 'number') {
        texto = campo.value.slice(campo.selectionStart, campo.selectionEnd ?? campo.selectionStart);
      } else {
        texto = window.getSelection()?.toString() ?? '';
      }
      texto = texto.replace(/\s+/g, ' ').trim();
      if (texto.length < MIN) return; // sem seleção: menu normal do navegador

      e.preventDefault();
      setAberto({
        x: e.clientX,
        y: e.clientY,
        texto: texto.slice(0, MAX),
        editavel: !!campo || !!alvo?.closest('[contenteditable="true"]'),
      });
    };

    const aoFechar = (e: Event) => {
      if (e.type === 'mousedown' && caixa.current?.contains(e.target as Node)) return;
      setAberto(null);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(null);
    };

    document.addEventListener('contextmenu', aoAbrir);
    document.addEventListener('mousedown', aoFechar);
    document.addEventListener('keydown', aoTeclar);
    window.addEventListener('scroll', aoFechar, true);
    window.addEventListener('resize', aoFechar);
    return () => {
      document.removeEventListener('contextmenu', aoAbrir);
      document.removeEventListener('mousedown', aoFechar);
      document.removeEventListener('keydown', aoTeclar);
      window.removeEventListener('scroll', aoFechar, true);
      window.removeEventListener('resize', aoFechar);
    };
  }, []);

  const popup =
    busca !== null ? (
      <PopupQuestoes
        busca={busca}
        aoFechar={fecharBusca}
      />
    ) : null;

  if (!aberto) return popup;

  // não deixa o menu escapar pela borda da tela
  const largura = 288;
  // o item do ChatGPT entrou na conta: menu mais alto não pode nascer fora da tela
  const altura = aberto.editavel ? 160 : 128;
  const x = Math.max(8, Math.min(aberto.x, window.innerWidth - largura - 8));
  const y = Math.max(8, Math.min(aberto.y, window.innerHeight - altura - 8));

  const pesquisar = () => {
    setBusca(aberto.texto);
    fechar();
  };
  /**
   * Abre o ChatGPT em outra aba com a pergunta já escrita. A seleção continua
   * valendo: a aba atual não navega, então voltar não perde o lugar da leitura.
   */
  const explicar = () => {
    window.open(linkChatGPT(aberto.texto), '_blank', 'noopener,noreferrer');
    fechar();
  };
  const copiar = () => {
    void navigator.clipboard?.writeText(aberto.texto);
    fechar();
  };
  const recortar = () => {
    document.execCommand('cut');
    fechar();
  };

  return (
    <>
      {popup}
      <div
        ref={caixa}
        role="menu"
        // o clique no menu não pode desfazer a seleção de quem está lendo
        onMouseDown={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed z-[100] w-72 overflow-hidden rounded-xl bg-white py-1 text-sm shadow-xl ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600"
        style={{ left: x, top: y }}
      >
        <button
          type="button"
          role="menuitem"
          onClick={pesquisar}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-medium text-slate-900 transition hover:bg-brand-50 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <Search size={15} className="shrink-0 text-brand-600 dark:text-brand-300" />
          <span className="min-w-0 truncate">Pesquisar questões: “{aberto.texto}”</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={explicar}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left font-medium text-slate-900 transition hover:bg-brand-50 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <Sparkles size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="min-w-0 truncate">Explicar no ChatGPT</span>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={copiar}
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Copy size={15} className="shrink-0 text-slate-400" /> Copiar
        </button>
        {aberto.editavel && (
          <button
            type="button"
            role="menuitem"
            onClick={recortar}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Scissors size={15} className="shrink-0 text-slate-400" /> Recortar
          </button>
        )}
      </div>
    </>
  );
}

/** Realça a palavra buscada dentro do texto, sem diferenciar maiúsculas. */
function Realce({ texto, termo }: { texto: string; termo: string }) {
  const escapado = termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const partes = texto.split(new RegExp(`(${escapado})`, 'i'));
  return (
    <>
      {partes.map((p, i) =>
        p.toLowerCase() === termo.toLowerCase() ? (
          <mark key={i} className="rounded bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

type Estado =
  | { fase: 'carregando' }
  | { fase: 'erro' }
  | { fase: 'ok'; total: number; questoes: Previa[]; buscando: boolean };

/**
 * Pop-up com as primeiras questões da palavra. A pessoa continua na tela
 * onde estava; o botão de baixo traz mais questões para dentro do próprio
 * pop-up, que continua aberto.
 */
function PopupQuestoes({
  busca,
  aoFechar,
}: {
  busca: string;
  aoFechar: () => void;
}) {
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' });
  /** gabarito aberto sem responder (só nas discursivas) */
  const [gabaritos, setGabaritos] = useState<Set<number>>(new Set());
  /** letra marcada em cada questão respondida aqui */
  const [respostas, setRespostas] = useState<Map<number, string>>(new Map());
  const { userId, supabase } = useSessao();

  const [falhouMais, setFalhouMais] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  /** busca uma página a partir de `de`; na primeira troca o estado, nas outras soma */
  const buscar = useCallback(
    (de: number) => {
      ctl.current?.abort();
      const c = new AbortController();
      ctl.current = c;
      setFalhouMais(false);
      if (de > 0) setEstado((e) => (e.fase === 'ok' ? { ...e, buscando: true } : e));

      fetch(`/api/buscar-questoes?q=${encodeURIComponent(busca)}&de=${de}`, { signal: c.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('falha'))))
        .then((d: { total: number; questoes: Previa[] }) =>
          setEstado((e) => ({
            fase: 'ok',
            total: d.total,
            questoes: de > 0 && e.fase === 'ok' ? [...e.questoes, ...d.questoes] : d.questoes,
            buscando: false,
          })),
        )
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          if (de > 0) {
            setFalhouMais(true);
            setEstado((e) => (e.fase === 'ok' ? { ...e, buscando: false } : e));
          } else {
            setEstado({ fase: 'erro' });
          }
        });
    },
    [busca],
  );

  useEffect(() => {
    setEstado({ fase: 'carregando' });
    setGabaritos(new Set());
    setRespostas(new Map());
    buscar(0);
    return () => ctl.current?.abort();
  }, [buscar]);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = antes;
    };
  }, [aoFechar]);

  const alternar = (id: number) =>
    setGabaritos((g) => {
      const n = new Set(g);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  /**
   * Marca a alternativa e guarda o resultado como no treino: tentativa, revisão
   * espaçada e, se errou, o caderno de erros. Cada questão vale uma vez só.
   */
  async function responder(q: Previa, letra: string) {
    if (respostas.has(q.id) || !q.answer) return;
    setRespostas((r) => new Map(r).set(q.id, letra));
    const correct = letra === q.answer;

    await supabase.from('attempts').insert({
      user_id: userId,
      question_id: q.id,
      session_id: null,
      chosen: letra,
      correct,
    });

    const { data: prev } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', userId)
      .eq('question_id', q.id)
      .maybeSingle();
    const st = nextReview((prev as Partial<ReviewState> | null) ?? null, correct);
    await supabase.from('reviews').upsert(
      {
        user_id: userId,
        question_id: q.id,
        ease: st.ease,
        interval_days: st.interval_days,
        repetitions: st.repetitions,
        lapses: st.lapses,
        due_on: st.due_on,
        last_result: st.last_result,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,question_id', defaultToNull: false },
    );

    if (!correct) {
      await supabase
        .from('error_notes')
        .insert({ user_id: userId, question_id: q.id, topic_id: q.topic_id, note: '' });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-slate-900/60 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Questões com ${busca}`}
        // altura explícita: `max-h-full` não resolve dentro do grid e o rodapé
        // (com o botão "procurar mais") saía da tela
        style={{ maxHeight: 'calc(100dvh - 1.5rem)' }}
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
            <Search size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-slate-900 dark:text-slate-100">
              Questões com “{busca}”
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {estado.fase === 'carregando' && 'buscando…'}
              {estado.fase === 'erro' && 'não foi possível buscar agora'}
              {estado.fase === 'ok' &&
                (estado.total === 0
                  ? 'nenhuma questão encontrada'
                  : `${estado.total} ${estado.total === 1 ? 'questão' : 'questões'} no banco — mostrando ${estado.questoes.length}`)}
            </p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-24 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
          {estado.fase === 'carregando' && (
            <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> buscando questões…
            </p>
          )}
          {estado.fase === 'erro' && (
            <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">
              Tente de novo em instantes.
            </p>
          )}
          {estado.fase === 'ok' && estado.questoes.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-600 dark:text-slate-300">
              Nenhuma questão com “{busca}”. Tente uma palavra mais curta ou sem acento.
            </p>
          )}
          {estado.fase === 'ok' &&
            estado.questoes.map((q) => {
              const escolhida = respostas.get(q.id) ?? null;
              const respondida = escolhida !== null;
              const acertou = respondida && escolhida === q.answer;
              // certo/errado e múltipla escolha se respondem; discursiva só mostra o gabarito
              const respondivel = (q.kind === 'ce' || q.kind === 'mc') && !!q.answer;
              const aberta = respondivel ? respondida : gabaritos.has(q.id);
              const alternativas: Alternativa[] =
                q.kind === 'ce'
                  ? [
                      { letter: 'C', text: 'Certo' },
                      { letter: 'E', text: 'Errado' },
                    ]
                  : (q.options ?? []);
              return (
                <article
                  key={q.id}
                  className="rounded-xl p-3 text-sm ring-1 ring-slate-200 dark:ring-slate-700"
                >
                  {(q.origin_label || q.banca) && (
                    <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {[q.origin_label, q.banca, q.year].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="leading-6 whitespace-pre-line text-slate-800 dark:text-slate-100">
                    <Realce texto={q.statement} termo={busca} />
                  </p>
                  {respondivel && (
                    <ul
                      className={`mt-2 grid gap-1.5 ${q.kind === 'ce' ? 'grid-cols-2' : ''}`}
                    >
                      {alternativas.map((o) => {
                        const certa = o.letter === q.answer;
                        const marcada = o.letter === escolhida;
                        const tom = !respondida
                          ? 'ring-slate-200 hover:bg-brand-50 hover:ring-brand-300 dark:ring-slate-700 dark:hover:bg-slate-800'
                          : certa
                            ? 'bg-emerald-50 text-emerald-900 ring-emerald-400 dark:bg-emerald-950 dark:text-emerald-200'
                            : marcada
                              ? 'bg-red-50 text-red-900 ring-red-400 dark:bg-red-950 dark:text-red-200'
                              : 'opacity-60 ring-slate-200 dark:ring-slate-700';
                        return (
                          <li key={o.letter}>
                            <button
                              type="button"
                              disabled={respondida}
                              onClick={() => void responder(q, o.letter)}
                              className={`flex w-full gap-2 rounded-lg px-2.5 py-1.5 text-left leading-6 text-slate-800 ring-1 transition disabled:cursor-default dark:text-slate-200 ${tom}`}
                            >
                              <span className="font-semibold">
                                {q.kind === 'ce' ? '' : `${o.letter})`}
                              </span>
                              <span className="min-w-0 flex-1">{o.text}</span>
                              {respondida && certa && <Check size={16} className="mt-1 shrink-0" />}
                              {respondida && marcada && !certa && (
                                <X size={16} className="mt-1 shrink-0" />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {!respondivel && (
                    <button
                      type="button"
                      onClick={() => alternar(q.id)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                    >
                      {aberta ? <EyeOff size={13} /> : <Eye size={13} />}
                      {aberta ? 'Esconder resposta' : 'Ver resposta'}
                    </button>
                  )}
                  {aberta && (
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {respondivel && (
                        <p
                          className={`font-semibold ${
                            acertou
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {acertou ? 'Você acertou!' : `Você errou. Gabarito: ${q.kind === 'ce' ? (q.answer === 'C' ? 'Certo' : 'Errado') : q.answer}`}
                        </p>
                      )}
                      {q.explanation && <p className="mt-1 whitespace-pre-line">{q.explanation}</p>}
                      {!respondivel && !q.explanation && <p>Sem comentário para esta questão.</p>}
                    </div>
                  )}
                </article>
              );
            })}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
          {falhouMais && (
            <span className="mr-auto text-xs text-red-600 dark:text-red-400">
              Não deu certo, tente de novo.
            </span>
          )}
          <a
            href={linkQConcursosGeral()}
            target="_blank"
            rel="noopener noreferrer"
            // a palavra vai para a área de transferência: é só colar na busca do site
            onClick={() => void navigator.clipboard?.writeText(busca)}
            title={`Abre o QConcursos em outra aba (banca AOCP) e copia “${busca}” para você colar na busca do site`}
            className="mr-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-slate-800"
          >
            <ExternalLink size={14} /> Ver mais no QConcursos
          </a>
          {/* o pop-up já tem o termo: a pergunta sai pronta, sem copiar e colar */}
          <a
            href={linkChatGPT(busca)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Abre o ChatGPT em outra aba com a pergunta sobre “${busca}” já escrita`}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-slate-800"
          >
            <Sparkles size={14} /> Explicar no ChatGPT
          </a>
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
          {estado.fase === 'ok' && estado.questoes.length > 0 && (
            <button
              type="button"
              disabled={estado.buscando || estado.questoes.length >= estado.total}
              onClick={() => buscar(estado.questoes.length)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-70"
            >
              {estado.buscando ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Search size={15} />
              )}
              {estado.questoes.length >= estado.total ? (
                'Não há mais questões com essa palavra'
              ) : (
                <>
                  Procurar mais questões com “{busca}”
                  <span className="font-normal opacity-80">
                    ({estado.total - estado.questoes.length} restantes)
                  </span>
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
