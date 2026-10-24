'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Network, Plus, Search, X } from 'lucide-react';
import { useSessao } from '@/components/sessao';
import { TAGS, type Tag } from '@/lib/notas';

type Resumo = { id: string; title: string; tag: Tag };

/**
 * Vínculos da anotação com outras anotações: busca pelo título, escolhe, e a
 * outra passa a aparecer como atalho na janela desta (e esta, na dela, em
 * "citada em"). O vínculo é guardado só deste lado, em `linked_ids`.
 */
export default function VinculosDaNota({
  ids,
  onChange,
  proprioId,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
  /** a anotação em edição não pode se vincular a si mesma */
  proprioId?: string;
}) {
  const { userId, supabase } = useSessao();
  const [vinculadas, setVinculadas] = useState<Resumo[]>([]);
  const [busca, setBusca] = useState('');
  const [achadas, setAchadas] = useState<Resumo[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const chave = useMemo(() => ids.join(','), [ids]);

  // títulos das já vinculadas
  useEffect(() => {
    if (!ids.length) {
      setVinculadas([]);
      return;
    }
    let vivo = true;
    void supabase
      .from('notes')
      .select('id, title, tag')
      .in('id', ids)
      .is('deleted_at', null)
      .then(({ data }) => {
        if (!vivo) return;
        const mapa = new Map((data ?? []).map((n) => [n.id as string, n as Resumo]));
        // mantém a ordem em que foram vinculadas
        setVinculadas(ids.map((id) => mapa.get(id)).filter((n): n is Resumo => !!n));
      });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, supabase]);

  // busca por título, com um respiro entre as teclas
  useEffect(() => {
    if (!aberto) return;
    setBuscando(true);
    const timer = setTimeout(async () => {
      let q = supabase
        .from('notes')
        .select('id, title, tag')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(8);
      const termo = busca.replace(/[%_,()"\\*]/g, ' ').trim();
      if (termo) q = q.ilike('title', `%${termo}%`);
      const { data, error } = await q;
      setBuscando(false);
      if (error) {
        setErro(error.message);
        return;
      }
      setErro(null);
      setAchadas(
        ((data ?? []) as Resumo[]).filter((n) => n.id !== proprioId && !ids.includes(n.id)),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [busca, aberto, chave, proprioId, supabase, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const adicionar = (n: Resumo) => {
    onChange([...ids, n.id]);
    setBusca('');
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <Network size={15} className="text-slate-400" />
        <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Anotações vinculadas
        </p>
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-slate-300 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-600"
        >
          {aberto ? <X size={13} /> : <Plus size={13} />} {aberto ? 'Fechar busca' : 'Vincular'}
        </button>
      </div>

      {vinculadas.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {vinculadas.map((n) => {
            const info = TAGS[n.tag] ?? TAGS.nota;
            return (
              <li
                key={n.id}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 py-1 pr-1 pl-2.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${info.barra}`} />
                <span className="min-w-0 truncate">{n.title || 'Sem título'}</span>
                <button
                  type="button"
                  onClick={() => onChange(ids.filter((i) => i !== n.id))}
                  aria-label={`Desfazer vínculo com ${n.title}`}
                  className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                >
                  <X size={12} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {aberto && (
        <div className="space-y-1.5">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-slate-400"
            />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
              placeholder="Procurar anotação pelo título"
              className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pr-8 pl-8 text-sm outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            {buscando && (
              <Loader2
                size={14}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 animate-spin text-slate-400"
              />
            )}
          </div>

          {erro && (
            <p className="text-xs text-red-600 dark:text-red-400">
              Não consegui buscar: {erro}
            </p>
          )}

          {!erro && !buscando && achadas.length === 0 && (
            <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
              Nenhuma anotação encontrada.
            </p>
          )}

          <ul className="max-h-48 space-y-0.5 overflow-y-auto">
            {achadas.map((n) => {
              const info = TAGS[n.tag] ?? TAGS.nota;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => adicionar(n)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-800 transition hover:bg-brand-50 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${info.barra}`} />
                    <span className="min-w-0 flex-1 truncate">{n.title || 'Sem título'}</span>
                    <span className="shrink-0 text-xs text-slate-400">{info.label}</span>
                    <Plus size={14} className="shrink-0 text-brand-600 dark:text-brand-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
