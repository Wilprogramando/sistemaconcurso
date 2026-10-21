# Sistema de Estudo — PM SC 2026 (Soldado QPPM)

App de estudo construído sobre a **Apostila Completa PM SC 2026 — Soldado QPPM** (Edital nº 002/CCP/2026, Instituto AOCP).
Next.js 15 + Supabase (Postgres + Auth), pronto para deploy na Vercel.

## O que o sistema faz

| Área | Descrição |
| --- | --- |
| **Painel** | Meta diária, revisões vencidas, projeção de nota na objetiva (acurácia × peso de cada disciplina), contagem de dias até a prova e alerta de disciplinas zeradas (zerar uma elimina). |
| **Matérias** | 78 tópicos de teoria extraídos da apostila, por capítulo, com marcação de *lendo / lido / revisar*. |
| **Questões** | 92 questões comentadas (Certo/Errado e discursivas curtas) com o fundamento legal, por disciplina, aleatórias ou focadas nos seus erros. |
| **Revisão** | Revisão espaçada (SM-2 simplificado): acertou → 3, 7, 16+ dias; errou → volta amanhã. |
| **Simulado** | O simulado final de 30 questões da apostila (60 min) e um simulado ponderado de 60 questões que respeita a Tabela 8.1 do edital (120 min). Gabarito só no fim. |
| **Caderno de erros** | Toda questão errada entra automaticamente; você anota o motivo do erro e marca como resolvido. |
| **Plano** | Cronogramas da apostila (12 semanas e reta final de 30 dias) com check-off por dia, mais o mapa de pegadinhas da AOCP. |
| **Estatísticas** | Acerto geral, questões dominadas, sequência de dias, histórico de sessões e onde investir o tempo (pior acerto × maior peso). |

Peso real de cada disciplina (Tabela 8.1): Institucional 10, Constitucional 8, Português 8, Penal 6, Processo Penal 6, Penal Militar 6, Legislação Especial 6, Trânsito 5, Informática 5 = 60 questões + 20 pontos de redação.

## Stack

- **Next.js 15** (App Router, Server Components, TypeScript)
- **Tailwind CSS 4**
- **Supabase**: Postgres com RLS + Auth por e-mail/senha
- **Vercel** para hospedagem

## Passo a passo do setup

### 1. Supabase

1. Crie um projeto em <https://supabase.com/dashboard>.
2. Abra **SQL Editor → New query**, cole todo o conteúdo de `supabase/migrations/0001_init.sql` e rode.
   Isso cria as tabelas, as políticas de RLS, o trigger que cria o perfil no cadastro e a view de desempenho.
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (só local, para o seed)
4. Em **Authentication → Providers → Email**, deixe *Email* habilitado.
   Para testar sem caixa de entrada, desligue **Confirm email**.

### 2. Rodar local

```bash
cp .env.example .env.local   # preencha as 3 variáveis
npm install
npm run seed                 # carrega disciplinas, tópicos e questões no Supabase
npm run dev                  # http://localhost:3000
```

O login aceita usuário simples (sem `@`): o app completa com um domínio interno (`adm` → `adm@pmsc.local`),
que nunca recebe e-mail. Um e-mail completo também funciona. O perfil é criado pelo trigger no primeiro acesso.

### 3. Deploy na Vercel

1. <https://vercel.com/new> → importe o repositório `Wilprogramando/sistemaconcurso`.
2. Framework: **Next.js** (detectado automaticamente). Nada a mudar em build/output.
3. Em **Environment Variables**, adicione **apenas**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

   > Não coloque a `SUPABASE_SERVICE_ROLE_KEY` na Vercel — ela ignora o RLS e só é usada no seed local.
4. Deploy. Depois, em **Supabase → Authentication → URL Configuration**, ponha a URL da Vercel em *Site URL* e em *Redirect URLs*.

## Atualizar o conteúdo da apostila

O conteúdo vem de um PDF e é versionado como texto e JSON:

```bash
pdftotext -layout -enc UTF-8 Apostila_PMSC_2026_Soldado.pdf content/apostila.txt
npm run parse   # content/apostila.txt -> content/apostila.json
npm run seed    # envia para o Supabase (upsert, não duplica)
```

Sem a `service_role` em mãos? `npm run seed:sql` gera `supabase/seed.sql` (~330 KB) com o mesmo
conteúdo em INSERTs idempotentes, para colar direto no SQL Editor do Supabase.

O parser (`scripts/parse-apostila.mjs`) separa capítulos, tópicos `N.M`, as questões comentadas de cada
disciplina e o simulado final com o gabarito.

## Estrutura

```
app/
  (app)/            páginas autenticadas (painel, matérias, questões, revisão, simulado, erros, plano, estatísticas)
  login/            cadastro e login
components/         UI compartilhada + motor de questões (question-runner)
lib/
  supabase/         clients de browser e server (@supabase/ssr)
  srs.ts            revisão espaçada
  plans.ts          cronogramas e dicas de banca da apostila
  types.ts          tipos do domínio
content/            apostila.txt (extraída do PDF) e apostila.json (estruturada)
scripts/            parse-apostila.mjs, seed.mjs
supabase/migrations/0001_init.sql
```

## Modelo de dados

- Conteúdo (leitura para qualquer usuário logado): `disciplines`, `topics`, `questions`
- Por usuário (RLS restrita ao dono): `profiles`, `attempts`, `reviews`, `exam_sessions`, `error_notes`, `topic_progress`, `study_days`
- `v_discipline_stats`: respondidas, acertos e acurácia por disciplina e usuário

---

Material de estudo pessoal, transcrito da apostila do edital 002/CCP/2026.
