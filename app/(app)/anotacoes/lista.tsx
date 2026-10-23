'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Folder,
  GripVertical,
  ImageIcon,
  Link2,
  NotebookPen,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import EditorNota, { type Opcao } from '@/components/editor-nota';
import { useSessao } from '@/components/sessao';
import { Card, Empty } from '@/components/ui';
import ImagensDaNota from '@/components/imagens-nota';
import AnexosDaNota from '@/components/anexos-nota';
import CorpoNota from '@/components/corpo-nota';
import { visualDe } from '@/lib/disciplinas-visual';
import { ORDEM_TAGS, TAGS, type Nota, type Tag } from '@/lib/notas';

type NotaComContexto = Nota & {
  disciplinaNome: string | null;
  disciplinaSlug: string | null;
  topicoRef: string | null;
  topicoTitulo: string | null;
};

export type Materia = { id: number; nome: string; slug: string };

/** chave da matéria selecionada: id da disciplina, ou `sem` para as soltas */
type Selecao = number | 'sem' | null;

export default function ListaDeNotas({
  notas,
  disciplinas,
}: {
  notas: NotaComContexto[];
  disciplinas: Materia[];
}) {
  const [selecao, setSelecao] = useState<Selecao>(null);

  const opcoes: Opcao[] = useMemo(
    () => disciplinas.map((d) => ({ id: d.id, nome: d.nome })),
    [disciplinas],
  );

  /** quantas anotações cada matéria tem e quando foi a última */
  const resumo = useMemo(() => {
    const m = new Map<number | 'sem', { total: number; ultima: string | null; fixadas: number }>();
    for (const n of notas) {
      const chave: number | 'sem' = n.discipline_id ?? 'sem';
      const e = m.get(chave) ?? { total: 0, ultima: null, fixadas: 0 };
      e.total += 1;
      if (n.pinned) e.fixadas += 1;
      if (!e.ultima || n.updated_at > e.ultima) e.ultima = n.updated_at;
      m.set(chave, e);
    }
    return m;
  }, [notas]);

  if (selecao === null) {
    return (
      <Grade
        disciplinas={disciplinas}
        opcoes={opcoes}
        resumo={resumo}
        total={notas.length}
        onAbrir={setSelecao}
      />
    );
  }

  const daMateria = notas.filter((n) => (n.discipline_id ?? 'sem') === selecao);
  const materia = typeof selecao === 'number' ? disciplinas.find((d) => d.id === selecao) : null;

  return (
    <Detalhe
      titulo={materia?.nome ?? 'Sem matéria'}
      slug={materia?.slug ?? null}
      notas={daMateria}
      disciplinas={opcoes}
      disciplinaFixa={typeof selecao === 'number' ? selecao : null}
      voltar={() => setSelecao(null)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* grade de matérias                                                   */
/* ------------------------------------------------------------------ */

function Grade({
  disciplinas,
  opcoes,
  resumo,
  total,
  onAbrir,
}: {
  disciplinas: Materia[];
  opcoes: Opcao[];
  resumo: Map<number | 'sem', { total: number; ultima: string | null; fixadas: number }>;
  total: number;
  onAbrir: (s: Selecao) => void;
}) {
  const soltas = resumo.get('sem');
  const [criando, setCriando] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-slate-500 dark:text-slate-400">
          {total
            ? `${total} ${total === 1 ? 'anotação' : 'anotações'} no caderno. Clique numa matéria para ver as suas.`
            : 'Escolha uma matéria para começar a anotar.'}
        </p>
        {!criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <Plus size={16} /> Nova anotação
          </button>
        )}
      </div>

      {criando && (
        <Card title="Nova anotação">
          <EditorNota disciplinas={opcoes} onFechar={() => setCriando(false)} />
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {disciplinas.map((d) => {
          const info = resumo.get(d.id);
          const visual = visualDe(d.slug);
          const Icone = visual.icone;

          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onAbrir(d.id)}
              className="flex h-full flex-col items-start rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700"
            >
              <div className="flex w-full items-start gap-3">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${visual.tile}`}
                >
                  <Icone size={21} />
                </span>
                <h2 className="min-w-0 flex-1 text-sm leading-snug font-bold text-slate-900 dark:text-slate-100">
                  {d.nome}
                </h2>
                {!!info?.fixadas && <Pin size={14} className="shrink-0 text-brand-500" />}
              </div>

              <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
                {info?.total ?? 0}
                <span className="ml-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {(info?.total ?? 0) === 1 ? 'anotação' : 'anotações'}
                </span>
              </p>

              <p className="mt-0.5 text-xs text-slate-400">
                {info?.ultima
                  ? `Última em ${new Date(info.ultima).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}`
                  : 'Nenhuma anotação ainda'}
              </p>
            </button>
          );
        })}

        {!!soltas && (
          <button
            type="button"
            onClick={() => onAbrir('sem')}
            className="flex h-full flex-col items-start rounded-2xl bg-white p-4 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700"
          >
            <div className="flex w-full items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-500 text-white">
                <NotebookPen size={21} />
              </span>
              <h2 className="min-w-0 flex-1 text-sm leading-snug font-bold text-slate-900 dark:text-slate-100">
                Sem matéria
              </h2>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums dark:text-slate-100">
              {soltas.total}
              <span className="ml-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {soltas.total === 1 ? 'anotação' : 'anotações'}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">Anotações soltas, sem amarração</p>
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* anotações de uma matéria                                            */
/* ------------------------------------------------------------------ */

function Detalhe({
  titulo,
  slug,
  notas,
  disciplinas,
  disciplinaFixa,
  voltar,
}: {
  titulo: string;
  slug: string | null;
  notas: NotaComContexto[];
  disciplinas: Opcao[];
  disciplinaFixa: number | null;
  voltar: () => void;
}) {
  const [busca, setBusca] = useState('');
  const [filtroTag, setFiltroTag] = useState<Tag | 'todas'>('todas');
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  /** id da anotação aberta na janela */
  const [vendo, setVendo] = useState<string | null>(null);
  /** id da anotação sendo arrastada e a que está embaixo do cursor */
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  /** ordem já aplicada na tela, antes de o banco confirmar */
  const [posLocal, setPosLocal] = useState<Record<string, number>>({});
  /** ids já excluídos na tela, antes de o banco confirmar */
  const [removidas, setRemovidas] = useState<Set<string>>(new Set());
  const { supabase } = useSessao();

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return notas.filter((n) => {
      if (removidas.has(n.id)) return false;
      if (filtroTag !== 'todas' && n.tag !== filtroTag) return false;
      if (!termo) return true;
      return n.title.toLowerCase().includes(termo) || n.body.toLowerCase().includes(termo);
    });
  }, [notas, busca, filtroTag, removidas]);

  function esquecer(id: string) {
    setRemovidas((atual) => new Set(atual).add(id));
  }

  /**
   * A tela assume a nova ordem na hora e o banco é avisado depois, numa só
   * chamada. Sem `router.refresh()`: refazer a página no servidor a cada
   * troca era o que travava o arrasto.
   */
  function gravarOrdem(ordem: NotaComContexto[]) {
    setPosLocal((atual) => {
      const nova = { ...atual };
      ordem.forEach((n, i) => {
        nova[n.id] = i + 1;
      });
      return nova;
    });

    const ids = ordem.map((n) => n.id);
    void (async () => {
      const { error } = await supabase.rpc('reordenar_notas', { p_ids: ids });
      // banco sem a migração 0008: cai no update por anotação
      if (error) {
        await Promise.all(
          ids.map((id, i) => supabase.from('notes').update({ position: i + 1 }).eq('id', id)),
        );
      }
    })();
  }

  /** Troca a anotação de lugar com a vizinha — é o caminho do celular. */
  function mover(grupo: NotaComContexto[], indice: number, passo: -1 | 1) {
    const destino = indice + passo;
    if (destino < 0 || destino >= grupo.length) return;

    const ordem = [...grupo];
    [ordem[indice], ordem[destino]] = [ordem[destino], ordem[indice]];
    gravarOrdem(ordem);
  }

  /** Solta a anotação arrastada na posição da que está embaixo do cursor. */
  function soltar(grupo: NotaComContexto[], alvoId: string) {
    const de = grupo.findIndex((n) => n.id === arrastando);
    const para = grupo.findIndex((n) => n.id === alvoId);
    setArrastando(null);
    setSobre(null);
    if (de === -1 || para === -1 || de === para) return;

    const ordem = [...grupo];
    const [movida] = ordem.splice(de, 1);
    ordem.splice(para, 0, movida);
    gravarOrdem(ordem);
  }

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of notas) c[n.tag] = (c[n.tag] ?? 0) + 1;
    return c;
  }, [notas]);

  // a ordem local manda enquanto o banco não responde
  const ordenadas = useMemo(() => {
    if (!Object.keys(posLocal).length) return filtradas;
    return [...filtradas].sort(
      (a, b) => (posLocal[a.id] ?? a.position) - (posLocal[b.id] ?? b.position),
    );
  }, [filtradas, posLocal]);

  const fixadas = ordenadas.filter((n) => n.pinned);
  const demais = ordenadas.filter((n) => !n.pinned);

  // reordenar só faz sentido vendo a lista inteira: com filtro, as setas
  // mexeriam em vizinhas que estão escondidas
  const podeOrdenar = !busca.trim() && filtroTag === 'todas';

  const notaAberta = vendo ? (filtradas.find((n) => n.id === vendo) ?? null) : null;

  const visual = slug ? visualDe(slug) : null;
  const Icone = visual?.icone ?? NotebookPen;

  return (
    <div className="space-y-4">
      {/* ---------------- cabeçalho da matéria ---------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={voltar}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={16} /> Matérias
        </button>

        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
            visual?.tile ?? 'bg-slate-500 text-white'
          }`}
        >
          <Icone size={19} />
        </span>

        <div className="min-w-0">
          <h2 className="text-lg leading-tight font-bold text-slate-900 dark:text-slate-100">
            {titulo}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {notas.length} {notas.length === 1 ? 'anotação' : 'anotações'}
          </p>
        </div>

        {slug && (
          <Link
            href={`/materias/${slug}`}
            className="ml-auto text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            Abrir a matéria
          </Link>
        )}
      </div>

      {/* ---------------- nova anotação ---------------- */}
      {criando ? (
        <Card title="Nova anotação">
          <EditorNota
            disciplinas={disciplinas}
            disciplinaFixa={disciplinaFixa}
            onFechar={() => setCriando(false)}
          />
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500"
        >
          <Plus size={17} /> Nova anotação em {titulo}
        </button>
      )}

      {/* ---------------- filtros: chips à esquerda, busca à direita ---------------- */}
      {notas.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Chip ativo={filtroTag === 'todas'} onClick={() => setFiltroTag('todas')}>
              <NotebookPen size={13} /> Todas ({notas.length})
            </Chip>
            {ORDEM_TAGS.filter((t) => contagem[t]).map((t) => {
              const info = TAGS[t];
              const IconeTag = info.icone;
              return (
                <Chip key={t} ativo={filtroTag === t} onClick={() => setFiltroTag(t)}>
                  <IconeTag size={13} /> {info.label} ({contagem[t]})
                </Chip>
              );
            })}
          </div>

          <div className="relative ml-auto w-full sm:w-72">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar anotações…"
              className="w-full rounded-full border border-slate-300 bg-white py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-emerald-500 dark:focus:ring-emerald-900/50"
            />
          </div>
        </div>
      )}

      {podeOrdenar && filtradas.length > 1 && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <GripVertical size={13} /> Arraste o card pela pegada para mudar a ordem. No celular, use
          as setas.
        </p>
      )}

      {/* ---------------- lista ---------------- */}
      {!filtradas.length ? (
        <Card>
          <Empty>
            {notas.length
              ? 'Nenhuma anotação com esses filtros.'
              : 'Nenhuma anotação nesta matéria ainda. Crie a primeira acima.'}
          </Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {fixadas.length > 0 && (
            <section className="space-y-2">
              <Secao icone={Pin} destaque>
                Fixadas
              </Secao>
              <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {fixadas.map((n, i) => (
                  <Cartao
                    key={n.id}
                    nota={n}
                    disciplinas={disciplinas}
                    editando={editando === n.id}
                    abrir={() => setEditando(n.id)}
                    fechar={() => setEditando(null)}
                    ver={() => setVendo(n.id)}
                    podeArrastar={podeOrdenar}
                    arrastando={arrastando === n.id}
                    alvo={sobre === n.id && arrastando !== n.id}
                    iniciarArrasto={() => setArrastando(n.id)}
                    passarPorCima={() => setSobre(n.id)}
                    soltar={() => soltar(fixadas, n.id)}
                    encerrarArrasto={() => {
                      setArrastando(null);
                      setSobre(null);
                    }}
                    podeSubir={podeOrdenar && i > 0}
                    podeDescer={podeOrdenar && i < fixadas.length - 1}
                    subir={() => mover(fixadas, i, -1)}
                    descer={() => mover(fixadas, i, 1)}
                    aoExcluir={() => esquecer(n.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {demais.length > 0 && (
            <section className="space-y-2">
              {fixadas.length > 0 && <Secao icone={NotebookPen}>Demais anotações</Secao>}
              <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {demais.map((n, i) => (
                  <Cartao
                    key={n.id}
                    nota={n}
                    disciplinas={disciplinas}
                    editando={editando === n.id}
                    abrir={() => setEditando(n.id)}
                    fechar={() => setEditando(null)}
                    ver={() => setVendo(n.id)}
                    podeArrastar={podeOrdenar}
                    arrastando={arrastando === n.id}
                    alvo={sobre === n.id && arrastando !== n.id}
                    iniciarArrasto={() => setArrastando(n.id)}
                    passarPorCima={() => setSobre(n.id)}
                    soltar={() => soltar(demais, n.id)}
                    encerrarArrasto={() => {
                      setArrastando(null);
                      setSobre(null);
                    }}
                    podeSubir={podeOrdenar && i > 0}
                    podeDescer={podeOrdenar && i < demais.length - 1}
                    subir={() => mover(demais, i, -1)}
                    descer={() => mover(demais, i, 1)}
                    aoExcluir={() => esquecer(n.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {notaAberta && (
        <JanelaNota
          nota={notaAberta}
          fechar={() => setVendo(null)}
          editar={() => {
            setVendo(null);
            setEditando(notaAberta.id);
          }}
        />
      )}
    </div>
  );
}

/**
 * Anotação inteira numa janela sobre a tela, com o fundo embaçado: título,
 * corpo formatado, imagens, PDFs e de onde ela veio. Fecha no Esc, no X ou
 * clicando fora.
 */
function JanelaNota({
  nota,
  fechar,
  editar,
}: {
  nota: NotaComContexto;
  fechar: () => void;
  editar: () => void;
}) {
  const info = TAGS[nota.tag];
  const Icone = info.icone;

  // Esc fecha, e a página atrás não rola enquanto a janela está aberta
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = rolagem;
    };
  }, [fechar]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-8 dark:bg-slate-950/70"
      onClick={fechar}
      role="dialog"
      aria-modal="true"
      aria-label={nota.title || 'Anotação'}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
      >
        <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${info.barra}`} />

        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200 py-3 pr-3 pl-6 dark:border-slate-700">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${info.solido}`}
          >
            <Icone size={12} /> {info.label}
          </span>
          {nota.pinned && <Pin size={13} className="text-brand-500 dark:text-emerald-400" />}

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={editar}
              title="Editar anotação"
              aria-label="Editar anotação"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-brand-50 hover:text-brand-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={fechar}
              title="Fechar"
              aria-label="Fechar"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-4">
          <h2 className="text-lg leading-snug font-bold text-slate-900 dark:text-slate-100">
            {nota.title || 'Sem título'}
          </h2>

          <CorpoNota html={nota.body_html} texto={nota.body} className="mt-2" />

          {nota.images?.length > 0 && (
            <div className="mt-4">
              <ImagensDaNota caminhos={nota.images} somenteLeitura />
            </div>
          )}

          {nota.attachments?.length > 0 && (
            <div className="mt-4">
              <AnexosDaNota anexos={nota.attachments} somenteLeitura />
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-6 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <Folder size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
          {nota.topicoRef && nota.disciplinaSlug ? (
            <Link
              href={`/materias/${nota.disciplinaSlug}/${nota.topicoRef}`}
              className="truncate hover:underline"
            >
              {nota.disciplinaNome ?? 'Sem matéria'} · {nota.topicoRef} {nota.topicoTitulo}
            </Link>
          ) : (
            <span className="truncate">{nota.disciplinaNome ?? 'Sem matéria'}</span>
          )}
          <span className="ml-auto shrink-0">
            {new Date(nota.updated_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </footer>
      </div>
    </div>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
        ativo
          ? 'bg-brand-600 text-white shadow-sm dark:bg-emerald-600 dark:text-white dark:shadow-[0_0_18px_-4px_#10b981]'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900/70 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

/** Cabeçalho de seção: ícone, nome e um fio que atravessa a largura. */
function Secao({
  icone: Icone,
  destaque = false,
  children,
}: {
  icone: LucideIcon;
  /** a seção das fixadas vem com a cor de destaque */
  destaque?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icone
        size={15}
        className={
          destaque
            ? 'shrink-0 text-brand-600 dark:text-emerald-400'
            : 'shrink-0 text-slate-400 dark:text-emerald-500/70'
        }
      />
      <h3
        className={`shrink-0 text-xs font-bold tracking-[0.12em] uppercase ${
          destaque
            ? 'text-brand-700 dark:text-emerald-300'
            : 'text-slate-500 dark:text-slate-300'
        }`}
      >
        {children}
      </h3>
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700/70" />
    </div>
  );
}

function Cartao({
  nota,
  disciplinas,
  editando,
  abrir,
  fechar,
  ver,
  podeArrastar,
  arrastando,
  alvo,
  iniciarArrasto,
  passarPorCima,
  soltar,
  encerrarArrasto,
  podeSubir,
  podeDescer,
  subir,
  descer,
  aoExcluir,
}: {
  nota: NotaComContexto;
  disciplinas: Opcao[];
  editando: boolean;
  abrir: () => void;
  fechar: () => void;
  /** abre a anotação inteira na janela sobre a tela */
  ver: () => void;
  podeArrastar: boolean;
  /** este card é o que está sendo arrastado */
  arrastando: boolean;
  /** o card arrastado está em cima deste */
  alvo: boolean;
  iniciarArrasto: () => void;
  passarPorCima: () => void;
  soltar: () => void;
  encerrarArrasto: () => void;
  podeSubir: boolean;
  podeDescer: boolean;
  subir: () => void;
  descer: () => void;
  /** tira o card da tela antes de o banco responder */
  aoExcluir: () => void;
}) {
  const info = TAGS[nota.tag];
  const Icone = info.icone;
  const { supabase } = useSessao();
  const [confirmando, setConfirmando] = useState(false);
  /** a pegada do arrasto está sendo segurada */
  const [pegou, setPegou] = useState(false);

  /** o card sai da tela na hora; o banco é avisado em seguida */
  function excluir() {
    setConfirmando(false);
    aoExcluir();
    void supabase.from('notes').delete().eq('id', nota.id);
  }

  if (editando) {
    // em edição o card ocupa a largura toda da grade: o editor precisa de espaço
    return (
      <div className="sm:col-span-2 xl:col-span-3">
        <Card>
          <EditorNota nota={nota} disciplinas={disciplinas} onFechar={fechar} />
        </Card>
      </div>
    );
  }

  return (
    <article
      // o arrasto só liga quando a pegada é segurada: assim o texto do card
      // aberto continua selecionável
      draggable={podeArrastar && pegou}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        // o Firefox só começa o arrasto com algum dado no pacote
        e.dataTransfer.setData('text/plain', nota.id);
        iniciarArrasto();
      }}
      onDragOver={(e) => {
        if (!podeArrastar) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        passarPorCima();
      }}
      onDrop={(e) => {
        if (!podeArrastar) return;
        e.preventDefault();
        soltar();
      }}
      onDragEnd={() => {
        setPegou(false);
        encerrarArrasto();
      }}
      className={`relative overflow-hidden rounded-2xl p-4 pl-5 ring-1 transition ${
        nota.pinned
          ? 'bg-brand-50/70 ring-brand-200 dark:bg-gradient-to-br dark:from-emerald-950/70 dark:via-slate-900 dark:to-slate-900 dark:ring-emerald-800/60'
          : 'bg-white ring-slate-200 dark:bg-slate-900/80 dark:ring-slate-700/70'
      } ${
        arrastando
          ? 'opacity-40 ring-brand-400'
          : alvo
            ? 'ring-2 ring-brand-500 dark:ring-emerald-400'
            : 'hover:ring-brand-300 hover:shadow-sm dark:hover:ring-slate-600'
      }`}
    >
      {/* faixa de cor da etiqueta na lateral esquerda */}
      <span aria-hidden className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${info.barra}`} />

      {nota.pinned && (
        <Pin
          size={13}
          aria-label="Fixada"
          className="absolute top-3 right-3 text-brand-500 dark:text-emerald-400"
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {podeArrastar && (
          <span
            title="Arraste daqui para mudar a ordem"
            aria-hidden
            onMouseDown={() => setPegou(true)}
            onMouseUp={() => setPegou(false)}
            onTouchStart={() => setPegou(true)}
            onTouchEnd={() => setPegou(false)}
            className="-ml-1.5 cursor-grab text-slate-300 transition hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
          >
            <GripVertical size={15} />
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${info.solido}`}
        >
          <Icone size={12} /> {info.label}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={subir}
            disabled={!podeSubir}
            title="Subir na lista"
            aria-label="Subir na lista"
            className="rounded-lg sm:hidden p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <ChevronUp size={15} />
          </button>
          <button
            type="button"
            onClick={descer}
            disabled={!podeDescer}
            title="Descer na lista"
            aria-label="Descer na lista"
            className="rounded-lg sm:hidden p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <ChevronDown size={15} />
          </button>
          <button
            type="button"
            onClick={ver}
            title="Ver a anotação"
            aria-label="Ver a anotação"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            onClick={abrir}
            title="Editar anotação"
            aria-label="Editar anotação"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-slate-800 dark:hover:text-emerald-300"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            title="Excluir anotação"
            aria-label="Excluir anotação"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {confirmando && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <span className="min-w-0 flex-1">Excluir esta anotação? Não dá para desfazer.</span>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="rounded-lg px-2.5 py-1 font-medium text-slate-600 transition hover:bg-white disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={excluir}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 size={12} /> Excluir
          </button>
        </div>
      )}

      {/* o card mostra só o título; o olho abre a anotação inteira na janela */}
      <button
        type="button"
        onClick={ver}
        title="Ver a anotação"
        className="mt-2.5 flex w-full items-start gap-2 text-left"
      >
        <h3 className="min-w-0 flex-1 leading-snug font-semibold text-slate-900 dark:text-slate-100">
          {nota.title || 'Sem título'}
        </h3>
        <Marcas nota={nota} />
      </button>

      {/* rodapé: de onde a anotação veio */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Folder size={13} className="shrink-0 text-slate-400 dark:text-slate-500" />
        {nota.topicoRef && nota.disciplinaSlug ? (
          <Link
            href={`/materias/${nota.disciplinaSlug}/${nota.topicoRef}`}
            className="truncate hover:underline"
          >
            {nota.disciplinaNome ?? 'Sem matéria'} · {nota.topicoRef} {nota.topicoTitulo}
          </Link>
        ) : (
          <span className="truncate">{nota.disciplinaNome ?? 'Sem matéria'}</span>
        )}
      </div>
    </article>
  );
}

/** Pistas do que tem dentro da anotação enquanto o card está fechado. */
function Marcas({ nota }: { nota: NotaComContexto }) {
  const temImagem = nota.images?.length > 0 || /<img[\s>/]/i.test(nota.body_html ?? '');
  const temPdf = nota.attachments?.length > 0;
  const temLink = /<a\s/i.test(nota.body_html ?? '');

  if (!temImagem && !temPdf && !temLink) return null;

  return (
    <span className="flex shrink-0 items-center gap-1.5 text-slate-400">
      {temLink && (
        <span title="tem link">
          <Link2 size={13} />
        </span>
      )}
      {temImagem && (
        <span title="tem imagem">
          <ImageIcon size={13} />
        </span>
      )}
      {temPdf && (
        <span title="tem PDF">
          <FileText size={13} />
        </span>
      )}
    </span>
  );
}
