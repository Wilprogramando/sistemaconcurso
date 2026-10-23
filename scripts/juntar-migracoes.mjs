/**
 * Emenda as migrações numa única consulta, para colar de uma vez no SQL
 * Editor ao montar um projeto do zero. A ordem é a do nome do arquivo.
 *
 * Uso: node scripts/juntar-migracoes.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const pasta = 'supabase/migrations';
const arquivos = readdirSync(pasta)
  .filter((f) => /^\d{4}_.*\.sql$/.test(f))
  .sort();

let saida =
  '-- =====================================================================\n' +
  `-- Schema completo — as migrações ${arquivos[0].slice(0, 4)} a ` +
  `${arquivos.at(-1).slice(0, 4)} emendadas, na ordem.\n` +
  '-- Gerado por scripts/juntar-migracoes.mjs; não edite à mão: mexa na\n' +
  '-- migração correspondente e gere de novo.\n' +
  '-- =====================================================================\n\n';

for (const f of arquivos) {
  saida += `\n-- ============================ ${f} ============================\n\n`;
  saida += readFileSync(join(pasta, f), 'utf8').trimEnd() + '\n';
}

writeFileSync('supabase/schema-completo.sql', saida);
console.log(`${arquivos.length} migrações → supabase/schema-completo.sql`);
