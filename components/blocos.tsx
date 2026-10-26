import { AlertTriangle, BookMarked, Lightbulb, ScrollText } from 'lucide-react';

export type Bloco =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[] | null; rows: string[][] }
  | { type: 'callout'; variant: 'edital' | 'atencao' | 'dica' | 'mnemonico'; title: string; body: string };

const CALLOUT = {
  edital: {
    icon: ScrollText,
    box: 'border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40',
    title: 'text-sky-900 dark:text-sky-200',
  },
  atencao: {
    icon: AlertTriangle,
    box: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40',
    title: 'text-amber-900 dark:text-amber-200',
  },
  dica: {
    icon: Lightbulb,
    box: 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40',
    title: 'text-emerald-900 dark:text-emerald-200',
  },
  mnemonico: {
    icon: BookMarked,
    box: 'border-violet-300 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40',
    title: 'text-violet-900 dark:text-violet-200',
  },
} as const;

/**
 * Destaca referencias legais e numeros, que e exatamente o que a banca troca
 * nas pegadinhas — ver a diferenca em negrito ajuda a fixar.
 */
function realce(texto: string) {
  const partes = texto.split(
    /((?:arts?\.|§§?|incisos?|Súmula|Lei|LC|Decreto|Portaria)\s*[\wº°.,/§-]*(?:\s*n\.?[º°]?\s*[\d./-]+)?|\b\d+(?:\.\d{3})*(?:\s*(?:anos?|meses|dias|horas))\b)/gi
  );
  return partes.map((p, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-brand-700 dark:text-brand-200">
        {p}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <div className="space-y-5">
      {blocos.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return (
              <h3
                key={i}
                className="border-l-4 border-brand-500 pt-2 pl-3 text-lg leading-snug font-bold text-slate-900 dark:text-slate-100"
              >
                {b.text}
              </h3>
            );

          case 'paragraph':
            return (
              <p key={i} className="text-[0.975rem] leading-7 text-slate-700 dark:text-slate-300">
                {realce(b.text)}
              </p>
            );

          case 'list':
            return (
              <ul key={i} className="space-y-2.5">
                {b.items.map((item, j) => (
                  <li
                    key={j}
                    className="flex gap-3 text-[0.975rem] leading-7 text-slate-700 dark:text-slate-300"
                  >
                    <span
                      aria-hidden
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"
                    />
                    <span>{realce(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case 'table':
            return (
              <div
                key={i}
                className="-mx-1 overflow-x-auto rounded-xl ring-1 ring-slate-200 dark:ring-slate-700"
              >
                <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                  {b.head && (
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800">
                        {b.head.map((c, j) => (
                          <th
                            key={j}
                            className="px-3 py-2.5 font-semibold text-slate-700 dark:text-slate-200"
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr
                        key={j}
                        className="border-t border-slate-200 align-top even:bg-slate-50/70 dark:border-slate-700 dark:even:bg-slate-800/40"
                      >
                        {row.map((c, k) => (
                          <td
                            key={k}
                            className={`px-3 py-2.5 leading-6 ${
                              k === 0
                                ? 'font-medium text-slate-900 dark:text-slate-100'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {realce(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'callout': {
            const estilo = CALLOUT[b.variant] ?? CALLOUT.edital;
            const Icone = estilo.icon;
            return (
              <aside key={i} className={`rounded-xl border p-4 ${estilo.box}`}>
                <p className={`flex items-center gap-2 text-sm font-semibold ${estilo.title}`}>
                  <Icone size={15} />
                  {b.title}
                </p>
                <p className="mt-2 text-[0.95rem] leading-7 text-slate-700 dark:text-slate-300">
                  {realce(b.body)}
                </p>
              </aside>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
