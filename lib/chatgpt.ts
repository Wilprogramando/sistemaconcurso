/**
 * Atalho para pedir ao ChatGPT a explicação de um trecho da apostila.
 *
 * O ChatGPT aceita a pergunta pela própria URL (`?q=`), então o trecho
 * selecionado chega já escrito na conversa — o candidato não precisa copiar,
 * trocar de aba e colar. O contexto do concurso vai no texto porque sem ele a
 * resposta vem genérica: o que interessa é como a AOCP cobra o assunto na
 * prova de Soldado da PMSC.
 */

/** limite de segurança: URL muito longa é cortada por navegador e servidor */
const MAX_TRECHO = 1200;

export function promptExplicar(trecho: string): string {
  const limpo = trecho.replace(/\s+/g, ' ').trim().slice(0, MAX_TRECHO);

  return [
    `Explique de forma direta, em português do Brasil, este trecho que eu estou estudando para o concurso de Soldado da Polícia Militar de Santa Catarina (edital 2026, banca Instituto AOCP):`,
    '',
    `"${limpo}"`,
    '',
    'Na resposta:',
    '1. Diga em uma frase o que isso significa.',
    '2. Explique com um exemplo prático de ocorrência policial.',
    '3. Aponte o detalhe que a banca costuma trocar para derrubar o candidato (prazo, número, competência, palavra invertida).',
    '4. Termine com uma pergunta de certo ou errado para eu testar se entendi.',
  ].join('\n');
}

/** Endereço do ChatGPT já com a pergunta escrita. */
export function linkChatGPT(trecho: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(promptExplicar(trecho))}`;
}
