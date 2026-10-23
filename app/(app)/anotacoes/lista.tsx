'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  ImageIcon,
  Link2,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
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
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [reordenando, setReordenando] = useState(false);
  /** id da anotação sendo arrastada e a que está embaixo do cursor */
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const { supabase } = useSessao();
  const router = useRouter();

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return notas.filter((n) => {
      if (filtroTag !== 'todas' && n.tag !== filtroTag) return false;
      if (!termo) return true;
      return n.title.toLowerCase().includes(termo) || n.body.toLowerCase().includes(termo);
    });
  }, [notas, busca, filtroTag]);

  function alternar(id: string) {
    setAbertas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

  /** Grava a ordem do grupo inteiro em 1..n, sem depender das posições antigas. */
  async function gravarOrdem(ordem: NotaComContexto[]) {
    setReordenando(true);
    await Promise.all(
      ordem.map((n, i) => supabase.from('notes').update({ position: i + 1 }).eq('id', n.id)),
    );
    setReordenando(false);
    router.refresh();
  }

  /** Troca a anotação de lugar com a vizinha — é o caminho do celular. */
  async function mover(grupo: NotaComContexto[], indice: number, passo: -1 | 1) {
    const destino = indice + passo;
    if (destino < 0 || destino >= grupo.length || reordenando) return;

    const ordem = [...grupo];
    [ordem[indice], ordem[destino]] = [ordem[destino], ordem[indice]];
    await gravarOrdem(ordem);
  }

  /** Solta a anotação arrastada na posição da que está embaixo do cursor. */
  async function soltar(grupo: NotaComContexto[], alvoId: string) {
    const de = grupo.findIndex((n) => n.id === arrastando);
    const para = grupo.findIndex((n) => n.id === alvoId);
    setArrastando(null);
    setSobre(null);
    if (de === -1 || para === -1 || de === para || reordenando) return;

    const ordem = [...grupo];
    const [movida] = ordem.splice(de, 1);
    ordem.splice(para, 0, movida);
    await gravarOrdem(ordem);
  }

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of notas) c[n.tag] = (c[n.tag] ?? 0) + 1;
    return c;
  }, [notas]);

  const fixadas = filtradas.filter((n) => n.pinned);
  const demais = filtradas.filter((n) => !n.pinned);

  // reordenar só faz sentido vendo a lista inteira: com filtro, as setas
  // mexeriam em vizinhas que estão escondidas
  const podeOrdenar = !busca.trim() && filtroTag === 'todas';

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

      {/* ---------------- filtros ---------------- */}
      {notas.length > 0 && (
        <div className="space-y-2.5">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nas anotações"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3 pl-9 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-900"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Chip ativo={filtroTag === 'todas'} onClick={() => setFiltroTag('todas')}>
              Todas ({notas.length})
            </Chip>
            {ORDEM_TAGS.filter((t) => contagem[t]).map((t) => {
              const info = TAGS[t];
              const IconeTag = info.icone;
              return (
                <Chip key={t} ativo={filtroTag === t} onClick={() => setFiltroTag(t)}>
                  <IconeTag size={12} /> {info.label} ({contagem[t]})
                </Chip>
              );
            })}
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
              <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <Pin size={12} /> Fixadas
              </h3>
              <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {fixadas.map((n, i) => (
                  <Cartao
                    key={n.id}
                    nota={n}
                    disciplinas={disciplinas}
                    editando={editando === n.id}
                    abrir={() => setEditando(n.id)}
                    fechar={() => setEditando(null)}
                    aberta={abertas.has(n.id)}
                    alternar={() => alternar(n.id)}
                    podeArrastar={podeOrdenar}
                    arrastando={arrastando === n.id}
                    alvo={sobre === n.id && arrastando !== n.id}
                    iniciarArrasto={() => setArrastando(n.id)}
                    passarPorCima={() => setSobre(n.id)}
                    soltar={() => void soltar(fixadas, n.id)}
                    encerrarArrasto={() => {
                      setArrastando(null);
                      setSobre(null);
                    }}
                    podeSubir={podeOrdenar && i > 0}
                    podeDescer={podeOrdenar && i < fixadas.length - 1}
                    subir={() => void mover(fixadas, i, -1)}
                    descer={() => void mover(fixadas, i, 1)}
                  />
                ))}
              </div>
            </section>
          )}

          {demais.length > 0 && (
            <section className="space-y-2">
              {fixadas.length > 0 && (
                <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Demais anotações
                </h3>
              )}
              <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {demais.map((n, i) => (
                  <Cartao
                    key={n.id}
                    nota={n}
                    disciplinas={disciplinas}
                    editando={editando === n.id}
                    abrir={() => setEditando(n.id)}
                    fechar={() => setEditando(null)}
                    aberta={abertas.has(n.id)}
                    alternar={() => alternar(n.id)}
                    podeArrastar={podeOrdenar}
                    arrastando={arrastando === n.id}
                    alvo={sobre === n.id && arrastando !== n.id}
                    iniciarArrasto={() => setArrastando(n.id)}
                    passarPorCima={() => setSobre(n.id)}
                    soltar={() => void soltar(demais, n.id)}
                    encerrarArrasto={() => {
                      setArrastando(null);
                      setSobre(null);
                    }}
                    podeSubir={podeOrdenar && i > 0}
                    podeDescer={podeOrdenar && i < demais.length - 1}
                    subir={() => void mover(demais, i, -1)}
                    descer={() => void mover(demais, i, 1)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        ativo
          ? 'bg-brand-600 text-white'
          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function Cartao({
  nota,
  disciplinas,
  editando,
  abrir,
  fechar,
  aberta,
  alternar,
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
}: {
  nota: NotaComContexto;
  disciplinas: Opcao[];
  editando: boolean;
  abrir: () => void;
  fechar: () => void;
  /** card expandido: mostra o corpo, os anexos e a data */
  aberta: boolean;
  alternar: () => void;
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
}) {
  const info = TAGS[nota.tag];
  const Icone = info.icone;
  const { supabase } = useSessao();
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  /** a pegada do arrasto está sendo segurada */
  const [pegou, setPegou] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setExcluindo(true);
    await supabase.from('notes').delete().eq('id', nota.id);
    setExcluindo(false);
    setConfirmando(false);
    router.refresh();
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
      className={`rounded-2xl bg-white p-4 ring-1 transition dark:bg-slate-900 ${
        arrastando
          ? 'opacity-40 ring-brand-400'
          : alvo
            ? 'ring-2 ring-brand-500'
            : 'ring-slate-200 hover:ring-brand-300 dark:ring-slate-700'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {podeArrastar && (
          <span
            title="Arraste daqui para mudar a ordem"
            aria-hidden
            onMouseDown={() => setPegou(true)}
            onMouseUp={() => setPegou(false)}
            onTouchStart={() => setPegou(true)}
            onTouchEnd={() => setPegou(false)}
            className="-ml-1 cursor-grab text-slate-300 transition hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
          >
            <GripVertical size={15} />
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${info.classe}`}
        >
          <Icone size={12} /> {info.label}
        </span>

        {nota.topicoRef && nota.disciplinaSlug && (
          <Link
            href={`/materias/${nota.disciplinaSlug}/${nota.topicoRef}`}
            className="truncate text-xs text-brand-600 hover:underline dark:text-brand-300"
          >
            {nota.topicoRef} {nota.topicoTitulo}
          </Link>
        )}

        {nota.pinned && <Pin size={13} className="text-brand-500" />}

        <div className="ml-auto flex items-center gap-1">
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
            onClick={alternar}
            aria-expanded={aberta}
            title={aberta ? 'Esconder a anotação' : 'Ver a anotação'}
            aria-label={aberta ? 'Esconder a anotação' : 'Ver a anotação'}
            className={`rounded-lg p-1.5 transition ${
              aberta
                ? 'bg-brand-600 text-white'
                : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {aberta ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <button
            type="button"
            onClick={abrir}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-slate-800"
          >
            Editar
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
            disabled={excluindo}
            className="rounded-lg px-2.5 py-1 font-medium text-slate-600 transition hover:bg-white disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={excluir}
            disabled={excluindo}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            <Trash2 size={12} /> {excluindo ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      )}

      {/* fechado mostra só o título; o olho abre o conteúdo */}
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberta}
        className="mt-2 flex w-full items-center gap-2 text-left"
      >
        <h3 className="min-w-0 flex-1 font-semibold text-slate-900 dark:text-slate-100">
          {nota.title || 'Sem título'}
        </h3>
        {!aberta && <Marcas nota={nota} />}
      </button>

      {aberta && (
        <>
          <CorpoNota html={nota.body_html} texto={nota.body} className="mt-1.5" />

          {nota.images?.length > 0 && (
            <div className="mt-3">
              <ImagensDaNota caminhos={nota.images} somenteLeitura />
            </div>
          )}

          {nota.attachments?.length > 0 && (
            <div className="mt-3">
              <AnexosDaNota anexos={nota.attachments} somenteLeitura />
            </div>
          )}

          <p className="mt-2 text-xs text-slate-400">
            {new Date(nota.updated_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </>
      )}
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
