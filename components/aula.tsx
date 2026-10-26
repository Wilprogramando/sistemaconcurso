import { AlertTriangle, BookOpen, ListChecks, Quote, Siren } from 'lucide-react';

export type Aula = {
  /** o tópico inteiro resumido em uma frase */
  emUmaFrase: string;
  /** explicação em linguagem direta, um parágrafo por ideia */
  explicacao: string[];
  /** como isso aparece no serviço policial */
  naPratica?: string;
  /** o que a banca troca para derrubar o candidato */
  pegadinhas?: string[];
  /** o que precisa estar na cabeça na véspera */
  revisao?: string[];
};

/**
 * A aula fica ACIMA do texto da apostila: primeiro se entende, depois se lê a
 * letra da lei. Sem ela, o tópico abria direto em transcrição densa de PDF.
 */
export default function AulaDoTopico({ aula }: { aula: Aula }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white sm:p-6">
        <p className="flex items-center gap-2 text-sm font-medium text-brand-100">
          <Quote size={13} /> Em uma frase
        </p>
        <p className="mt-2 text-lg leading-8 font-semibold sm:text-xl">{aula.emUmaFrase}</p>
      </section>

      <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6 dark:bg-slate-900 dark:ring-slate-700">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <BookOpen size={14} /> Entendendo
        </h2>
        <div className="mt-3 space-y-3.5">
          {aula.explicacao.map((p, i) => (
            <p key={i} className="text-[0.975rem] leading-8 text-slate-700 dark:text-slate-300">
              {p}
            </p>
          ))}
        </div>
      </section>

      {aula.naPratica && (
        <section className="rounded-2xl border-l-4 border-emerald-500 bg-emerald-50 p-5 dark:bg-emerald-950/40">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            <Siren size={14} /> Na prática, no serviço
          </h2>
          <p className="mt-2 text-[0.95rem] leading-8 text-slate-700 dark:text-slate-200">
            {aula.naPratica}
          </p>
        </section>
      )}

      {aula.pegadinhas && aula.pegadinhas.length > 0 && (
        <section className="rounded-2xl border-l-4 border-amber-500 bg-amber-50 p-5 dark:bg-amber-950/40">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
            <AlertTriangle size={14} /> O que a banca troca
          </h2>
          <ul className="mt-2.5 space-y-2.5">
            {aula.pegadinhas.map((p, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[0.95rem] leading-7 text-slate-700 dark:text-slate-200"
              >
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {p}
              </li>
            ))}
          </ul>
        </section>
      )}

      {aula.revisao && aula.revisao.length > 0 && (
        <section className="rounded-2xl bg-slate-900 p-5 text-white dark:bg-slate-800">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300">
            <ListChecks size={14} /> Para a véspera
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {aula.revisao.map((r, i) => (
              <li
                key={i}
                className="rounded-xl bg-white/10 px-3.5 py-2.5 text-sm leading-6 tabular-nums"
              >
                {r}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
