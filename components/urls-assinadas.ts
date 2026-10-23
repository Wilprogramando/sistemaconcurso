'use client';

import { useEffect, useState } from 'react';
import { useSessao } from '@/components/sessao';

export const BUCKET = 'anotacoes';

/**
 * Assina as URLs dos arquivos do bucket privado `anotacoes`.
 * Guarda o que já assinou, então a lista pode mudar sem reassinar tudo.
 */
export function useUrlsAssinadas(caminhos: string[]) {
  const { supabase } = useSessao();
  const [urls, setUrls] = useState<Record<string, string>>({});

  const chave = caminhos.join('|');

  useEffect(() => {
    const lista = chave ? chave.split('|') : [];
    const faltando = lista.filter((c) => c && !urls[c]);
    if (!faltando.length) return;

    let cancelado = false;
    (async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrls(faltando, 3600);
      if (cancelado || !data) return;
      const novas: Record<string, string> = {};
      for (const item of data) {
        if (item.signedUrl && item.path) novas[item.path] = item.signedUrl;
      }
      if (Object.keys(novas).length) setUrls((u) => ({ ...u, ...novas }));
    })();

    return () => {
      cancelado = true;
    };
    // `urls` fica de fora de propósito: só a lista de caminhos dispara a assinatura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, supabase]);

  return urls;
}
