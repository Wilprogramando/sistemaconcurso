'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Pin, Plus, Search } from 'lucide-react';
import EditorNota, { type Opcao } from '@/components/editor-nota';
import { Card, Empty } from '@/components/ui';
import ImagensDaNota from '@/components/imagens-nota';
import { ORDEM_TAGS, TAGS, type Nota, type Tag } from '@/lib/notas';

type NotaComContexto = Nota & {
  disciplinaNome: string | null;
  disciplinaSlug: string | null;
  topicoRef: string | null;
  topicoTitulo: string | null;
};

export default function ListaDeNotas({
  notas,
  disciplinas,
}: {
  notas: NotaComContexto[];
  disciplinas: Opcao[];
}) {
  const [busca, setBusca] = useState('');
  const [filtroTag, setFiltroTag] = useState<Tag | 'todas'>('todas');
  const [filtroDisciplina, setFiltroDisciplina] = useState<number | 'todas'>('todas');
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return notas.filter((n) => {
      if (filtroTag !== 'todas' && n.tag !== filtroTag) return false;
      if (filtroDisciplina !== 'todas' && n.discipline_id !== filtroDisciplina) return false;
      if (!termo) return true;
      return (
        n.title.toLowerCase().includes(termo) ||
        n.body.toLowerCase().includes(termo) ||
        (n.disciplinaNome ?? '').toLowerCase().includes(termo)
      );
    });
  }, [notas, busca, filtroTag, filtroDisciplina]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const n of notas) c[n.tag] = (c[n.tag] ?? 0) + 1;
    return c;
  }, [notas]);

  const fixadas = filtradas.filter((n) => n.pinned);
  const demais = filtradas.filter((n) => !n.pinned);

  return (
    <div className="space-y-4">
      {/* ---------------- nova anotação ---------------- */}
      {criando ? (
        <Card title="Nova anotação">
          <EditorNota
            disciplinas={disciplinas}
            onFechar={() => setCriando(false)}
          />
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setCriando(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-500"
        >
          <Plus size={17} /> Nova anotação
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
              const Icone = info.icone;
              return (
                <Chip key={t} ativo={filtroTag === t} onClick={() => setFiltroTag(t)}>
                  <Icone size={12} /> {info.label} ({contagem[t]})
                </Chip>
              );
            })}
          </div>

          {disciplinas.length > 0 && (
            <select
              value={filtroDisciplina}
              onChange={(e) =>
                setFiltroDisciplina(e.target.value === 'todas' ? 'todas' : Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 sm:w-auto dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="todas">Todas as matérias</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ---------------- lista ---------------- */}
      {!filtradas.length ? (
        <Card>
          <Empty>
            {notas.length
              ? 'Nenhuma anotação com esses filtros.'
              : 'Nenhuma anotação ainda. Crie a primeira acima, ou use o botão Anotações dentro de um tópico.'}
          </Empty>
        </Card>
      ) : (
        <div className="space-y-4">
          {fixadas.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                <Pin size={12} /> Fixadas
              </h2>
              {fixadas.map((n) => (
                <Cartao
                  key={n.id}
                  nota={n}
                  disciplinas={disciplinas}
                  editando={editando === n.id}
                  abrir={() => setEditando(n.id)}
                  fechar={() => setEditando(null)}
                />
              ))}
            </section>
          )}

          {demais.length > 0 && (
            <section className="space-y-2">
              {fixadas.length > 0 && (
                <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  Demais anotações
                </h2>
              )}
              {demais.map((n) => (
                <Cartao
                  key={n.id}
                  nota={n}
                  disciplinas={disciplinas}
                  editando={editando === n.id}
                  abrir={() => setEditando(n.id)}
                  fechar={() => setEditando(null)}
                />
              ))}
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
}: {
  nota: NotaComContexto;
  disciplinas: Opcao[];
  editando: boolean;
  abrir: () => void;
  fechar: () => void;
}) {
  const info = TAGS[nota.tag];
  const Icone = info.icone;

  if (editando) {
    return (
      <Card>
        <EditorNota nota={nota} disciplinas={disciplinas} onFechar={fechar} />
      </Card>
    );
  }

  return (
    <article className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-brand-300 dark:bg-slate-900 dark:ring-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${info.classe}`}
        >
          <Icone size={12} /> {info.label}
        </span>

        {nota.disciplinaNome && nota.disciplinaSlug && (
          <Link
            href={`/materias/${nota.disciplinaSlug}`}
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            {nota.disciplinaNome}
          </Link>
        )}

        {nota.topicoRef && nota.disciplinaSlug && (
          <Link
            href={`/materias/${nota.disciplinaSlug}/${nota.topicoRef}`}
            className="truncate text-xs text-brand-600 hover:underline dark:text-brand-300"
          >
            {nota.topicoRef} {nota.topicoTitulo}
          </Link>
        )}

        {nota.pinned && <Pin size={13} className="text-brand-500" />}

        <button
          type="button"
          onClick={abrir}
          className="ml-auto rounded-lg px-2.5 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-slate-800"
        >
          Editar
        </button>
      </div>

      {nota.title && (
        <h3 className="mt-2 font-semibold text-slate-900 dark:text-slate-100">{nota.title}</h3>
      )}
      {nota.body && (
        <p className="mt-1 text-sm leading-7 whitespace-pre-wrap text-slate-700 dark:text-slate-300">
          {nota.body}
        </p>
      )}

      {nota.images?.length > 0 && (
        <div className="mt-3">
          <ImagensDaNota caminhos={nota.images} somenteLeitura />
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
    </article>
  );
}
