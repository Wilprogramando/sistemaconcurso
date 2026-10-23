'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Pin, PinOff, Trash2, X } from 'lucide-react';
import { useSessao } from '@/components/sessao';
import ImagensDaNota from '@/components/imagens-nota';
import AnexosDaNota from '@/components/anexos-nota';
import EditorRico from '@/components/editor-rico';
import { BUCKET, useUrlsAssinadas } from '@/components/urls-assinadas';
import { comprimirImagem } from '@/lib/comprimir-imagem';
import {
  aplicarUrls,
  caminhosNoHtml,
  htmlVazio,
  removerUrlsAssinadas,
  sanitizarHtml,
  textoDoHtml,
  textoParaHtml,
} from '@/lib/html-nota';
import { ORDEM_TAGS, TAGS, type Anexo, type Nota, type Tag } from '@/lib/notas';

export type Opcao = { id: number; nome: string };

const extensaoDe = (tipo: string) =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[tipo] ??
  'webp';

/**
 * Formulário único para criar e editar anotação. Quando `nota` vem preenchida
 * é edição; quando não, é uma nota nova.
 */
export default function EditorNota({
  nota,
  disciplinas,
  disciplinaFixa,
  topicoFixo,
  onFechar,
}: {
  nota?: Nota;
  disciplinas: Opcao[];
  /** quando a nota nasce de dentro de um tópico, já vem amarrada a ele */
  disciplinaFixa?: number | null;
  topicoFixo?: number | null;
  onFechar?: () => void;
}) {
  const { userId, supabase } = useSessao();
  const router = useRouter();

  const htmlInicial = useMemo(
    () => sanitizarHtml(nota?.body_html || textoParaHtml(nota?.body ?? '')),
    [nota?.body_html, nota?.body],
  );

  // as imagens que já estão no meio do texto precisam de URL assinada para
  // aparecerem dentro do editor
  const caminhosIniciais = useMemo(() => caminhosNoHtml(htmlInicial), [htmlInicial]);
  const urlsIniciais = useUrlsAssinadas(caminhosIniciais);
  const prontoParaEditar = caminhosIniciais.every((c) => urlsIniciais[c]);

  const [titulo, setTitulo] = useState(nota?.title ?? '');

  // o corpo fica num ref: guardar cada tecla em `useState` fazia o formulário
  // inteiro renderizar a cada letra, e a digitação engasgava em nota grande.
  // Só o "tem conteúdo?" vira estado, com folga de 400 ms.
  const corpoRef = useRef(htmlInicial);
  const [temConteudo, setTemConteudo] = useState(!htmlVazio(htmlInicial));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aoMudarCorpo = useCallback((html: string) => {
    corpoRef.current = html;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const cheio = !htmlVazio(html);
      setTemConteudo((antes) => (antes === cheio ? antes : cheio));
    }, 400);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const [tag, setTag] = useState<Tag>(nota?.tag ?? 'nota');
  const [disciplina, setDisciplina] = useState<number | null>(
    nota?.discipline_id ?? disciplinaFixa ?? null,
  );
  const [fixada, setFixada] = useState(nota?.pinned ?? false);
  const [imagens, setImagens] = useState<string[]>(nota?.images ?? []);
  const [anexos, setAnexos] = useState<Anexo[]>(nota?.attachments ?? []);
  const [salvando, setSalvando] = useState(false);
  /** muda depois de salvar uma nota nova, para o editor nascer limpo */
  const [geracao, setGeracao] = useState(0);

  const vazia = !titulo.trim() && !temConteudo && imagens.length === 0 && anexos.length === 0;

  /** comprime, sobe a imagem e devolve a tag pronta para entrar no texto */
  async function inserirImagens(originais: File[]) {
    const htmls: string[] = [];
    for (const original of originais) {
      // redimensiona e reescreve em WebP antes de subir: print de apostila
      // sai de megabytes para algumas centenas de KB
      const { arquivo } = await comprimirImagem(original);
      const caminho = `${userId}/${crypto.randomUUID()}.${extensaoDe(arquivo.type)}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });
      if (error) continue;

      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 3600);
      if (!data?.signedUrl) continue;
      htmls.push(
        `<img src="${data.signedUrl}" data-path="${caminho}" alt="Imagem da anotação" />`,
      );
    }
    return htmls;
  }

  async function salvar() {
    if (vazia) return;
    setSalvando(true);

    // o src assinado expira em uma hora: o que fica gravado é o `data-path`
    const html = removerUrlsAssinadas(sanitizarHtml(corpoRef.current));
    const texto = textoDoHtml(html);

    const dados = {
      title: titulo.trim() || texto.split('\n')[0]?.slice(0, 60) || 'Anotação',
      body: texto,
      body_html: html || null,
      tag,
      discipline_id: disciplina,
      topic_id: nota?.topic_id ?? topicoFixo ?? null,
      pinned: fixada,
      images: imagens,
      attachments: anexos,
    };

    if (nota) {
      await supabase.from('notes').update(dados).eq('id', nota.id);
    } else {
      // a nota nova entra no topo da matéria
      const { data: primeira } = await supabase
        .from('notes')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle();

      await supabase.from('notes').insert({
        ...dados,
        user_id: userId,
        position: (primeira?.position ?? 1) - 1,
      });

      setTitulo('');
      corpoRef.current = '';
      setTemConteudo(false);
      setGeracao((g) => g + 1);
      setImagens([]);
      setAnexos([]);
    }

    setSalvando(false);
    router.refresh();
    onFechar?.();
  }

  /** vai para a lixeira, de onde dá para restaurar ou apagar de vez */
  async function excluir() {
    if (!nota) return;
    setSalvando(true);
    await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', nota.id);
    setSalvando(false);
    router.refresh();
    onFechar?.();
  }

  return (
    <div className="space-y-3" data-area-nota>
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título da anotação — é o que aparece no card"
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-900"
      />

      {prontoParaEditar ? (
        <EditorRico
          key={geracao}
          valor={aplicarUrls(htmlInicial, urlsIniciais)}
          onChange={aoMudarCorpo}
          onInserirImagem={inserirImagens}
          autoFocus={!nota}
          placeholder="Escreva aqui. Ex.: inquérito — 10 dias preso, 30 solto. O delegado NUNCA arquiva."
        />
      ) : (
        <div className="grid min-h-40 place-items-center rounded-xl border border-slate-300 dark:border-slate-600">
          <Loader2 size={18} className="animate-spin text-slate-400" />
        </div>
      )}

      <ImagensDaNota caminhos={imagens} onChange={setImagens} />

      <AnexosDaNota anexos={anexos} onChange={setAnexos} />

      <div className="flex flex-wrap gap-1.5">
        {ORDEM_TAGS.map((t) => {
          const info = TAGS[t];
          const Icone = info.icone;
          const ativo = tag === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              aria-pressed={ativo}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition ${
                ativo
                  ? info.classe
                  : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700'
              }`}
            >
              <Icone size={13} />
              {info.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {!topicoFixo && (
          <select
            value={disciplina ?? ''}
            onChange={(e) => setDisciplina(e.target.value ? Number(e.target.value) : null)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Sem matéria</option>
            {disciplinas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => setFixada((f) => !f)}
          aria-pressed={fixada}
          title={fixada ? 'Desafixar' : 'Fixar no topo'}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition ${
            fixada
              ? 'bg-brand-600 text-white ring-brand-600'
              : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600'
          }`}
        >
          {fixada ? <Pin size={14} /> : <PinOff size={14} />}
          {fixada ? 'Fixada' : 'Fixar'}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {nota && (
            <button
              type="button"
              onClick={excluir}
              disabled={salvando}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 size={14} /> Excluir
            </button>
          )}
          {onFechar && (
            <button
              type="button"
              onClick={onFechar}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X size={14} /> Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || vazia}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Check size={14} />
            {salvando ? 'Salvando…' : nota ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
