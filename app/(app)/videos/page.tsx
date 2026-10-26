import Link from 'next/link';
import { ExternalLink, Info, Play, Search, Tv } from 'lucide-react';
import { createClient, getUserId } from '@/lib/supabase/server';
import { Badge, Card } from '@/components/ui';
import { PRIORITY_CLASS, PRIORITY_LABEL } from '@/lib/types';
import { buscaDoTopico, buscaYoutube, guiaDe } from '@/lib/videos';
import { visualDe } from '@/lib/disciplinas-visual';

export const metadata = { title: 'Vídeo-aulas — Estudo PM SC 2026' };
export const dynamic = 'force-dynamic';

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ disciplina?: string }>;
}) {
  const { disciplina } = await searchParams;
  await getUserId();
  const supabase = await createClient();

  const { data: disciplines } = await supabase
    .from('disciplines')
    .select('id, slug, name, question_count, weight, priority')
    .order('question_count', { ascending: false });

  const alvo = (disciplines ?? []).find((d) => d.slug === disciplina) ?? null;

  const { data: topics } = alvo
    ? await supabase
        .from('topics')
        .select('ref, title')
        .eq('discipline_id', alvo.id)
        .order('ord')
    : { data: null };

  // ---------------- lista de disciplinas ----------------
  if (!alvo) {
    return (
      <div className="entra space-y-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            Vídeo-aulas
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
            Cada tema abre a busca do YouTube <strong>já ordenada por número de visualizações</strong>,
            com a consulta certa — então o ranking é o do próprio YouTube, calculado na hora.
          </p>
        </div>

        <ComoFunciona />

        <div className="grid gap-3 sm:grid-cols-2">
          {(disciplines ?? []).map((d) => {
            const guia = guiaDe(d.slug);
            return (
              // a matéria entra com o ícone que ela tem no resto do app, e o
              // número de temas vira dado, não legenda
              <Link
                key={d.id}
                href={`/videos?disciplina=${d.slug}`}
                className="flex items-start gap-3.5 rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:ring-brand-400 dark:bg-slate-900 dark:ring-slate-700"
              >
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${visualDe(d.slug).tile}`}
                >
                  <Play size={18} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 font-semibold text-slate-900 dark:text-slate-100">
                      {d.name}
                    </p>
                    <Badge className={PRIORITY_CLASS[d.priority as keyof typeof PRIORITY_CLASS]}>
                      {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL].replace(
                        'Prioridade ',
                        ''
                      )}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-base font-bold text-slate-900 tabular-nums dark:text-slate-100">
                      {guia?.buscas.length ?? 0}
                    </span>{' '}
                    temas de busca
                    {guia?.indicacoes.length ? ` · ${guia.indicacoes.length} indicações` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 tabular-nums dark:text-slate-400">
                    {d.question_count
                      ? `${d.question_count} questões na prova · ${d.weight}%`
                      : 'prova de redação'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------- disciplina escolhida ----------------
  const guia = guiaDe(alvo.slug);

  return (
    <div className="entra space-y-5">
      <div>
        <Link
          href="/videos"
          className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          ← Vídeo-aulas
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          {alvo.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {alvo.question_count
            ? `${alvo.question_count} questões na prova (${alvo.weight}%)`
            : 'Prova de redação'}
        </p>
      </div>

      {guia?.nota && (
        <aside className="rounded-2xl border-l-4 border-amber-400 bg-amber-50 p-4 text-sm leading-7 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {guia.nota}
        </aside>
      )}

      {guia && guia.buscas.length > 0 && (
        <Card
          title="Mais vistos por tema"
          subtitle="Abre o YouTube com a busca pronta e ordenada por visualizações"
          icon={Play}
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {guia.buscas.map((b) => (
              <li key={b.rotulo}>
                <a
                  href={buscaYoutube(b.consulta)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-3.5 transition hover:bg-brand-50 dark:bg-slate-800/60 dark:hover:bg-slate-800"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-600 text-white">
                    <Play size={16} fill="currentColor" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      {b.rotulo}
                    </span>
                    <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                      {b.consulta}
                    </span>
                  </span>
                  <ExternalLink size={15} className="shrink-0 text-slate-400" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {topics && topics.length > 0 && (
        <Card
          title="Busca por tópico da apostila"
          subtitle="Um atalho para cada tópico que você estuda aqui"
          icon={Search}
        >
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {topics.map((t) => (
              <li key={t.ref}>
                <a
                  href={buscaDoTopico(alvo.name, t.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="shrink-0 text-xs font-bold text-slate-400 tabular-nums">
                    {t.ref}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-300">
                    {t.title}
                  </span>
                  <Play size={13} className="shrink-0 text-red-600" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {guia && guia.indicacoes.length > 0 && (
        <Card
          title="Indicações"
          subtitle="Encontradas em busca na web — confira antes, porque vídeo sai do ar e título muda"
          icon={Tv}
        >
          <ul className="space-y-2">
            {guia.indicacoes.map((i) => (
              <li key={i.url}>
                <a
                  href={i.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-600 text-white">
                    <Play size={14} fill="currentColor" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                      {i.titulo}
                    </span>
                    {i.canal && (
                      <span className="block text-xs text-slate-500 dark:text-slate-400">
                        {i.canal}
                      </span>
                    )}
                  </span>
                  <ExternalLink size={15} className="mt-1 shrink-0 text-slate-400" />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {guia && guia.canais.length > 0 && (
        <Card title="Canais que costumam cobrir esta matéria">
          <ul className="flex flex-wrap gap-2">
            {guia.canais.map((c) => (
              <li key={c}>
                <a
                  href={buscaYoutube(`${c} ${alvo.name} concurso`, false)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
                >
                  <Tv size={14} /> {c}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/materias/${alvo.slug}`}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
        >
          Ler a teoria desta matéria
        </Link>
        <Link
          href={`/questoes?disciplina=${alvo.slug}`}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Treinar questões depois do vídeo
        </Link>
      </div>

      <ComoFunciona />
    </div>
  );
}

function ComoFunciona() {
  return (
    <aside className="flex items-start gap-2.5 rounded-2xl bg-slate-100 p-4 text-xs leading-6 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
      <Info size={15} className="mt-0.5 shrink-0" />
      <p>
        <strong className="text-slate-700 dark:text-slate-300">Por que não há uma lista fixa:</strong>{' '}
        o YouTube monta a página por JavaScript, então não dá para ler visualizações e curtidas de
        fora e congelar um ranking aqui — e um ranking congelado envelheceria em poucas semanas. Em
        vez disso, cada link abre a busca do YouTube já filtrada por vídeo e ordenada por
        visualizações, com a consulta certa para o tema. O ranking é o do próprio YouTube, sempre
        atual.
      </p>
    </aside>
  );
}
