/**
 * Esqueleto exibido enquanto a página busca os dados no servidor.
 * Sem ele a navegação parecia travada: o clique não dava retorno visual
 * nenhum até a resposta chegar.
 */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-5" aria-busy aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-full max-w-md rounded bg-slate-200/70 dark:bg-slate-800/70" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-white ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/70"
          >
            <div className="flex gap-3 p-4">
              <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200/80 dark:bg-slate-900 dark:ring-slate-700/70">
        <div className="mb-4 h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 flex-1 rounded bg-slate-200/80 dark:bg-slate-800/80" />
              <div className="h-2.5 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
