# Sistema de Estudo — PM SC 2026 (Soldado QPPM)

App de estudo para o concurso de Soldado do Quadro de Praças da PMSC, **Edital nº 002/CCP/2026**
(Instituto AOCP). Next.js 15 + Supabase (Postgres + Auth), pronto para deploy na Vercel, pensado
para estudar pelo celular.

## O que tem dentro

### Conteúdo

| Fonte | O que é | Quantidade |
| --- | --- | --- |
| **Apostila PM SC 2026** | Teoria por tópico + questões comentadas + simulado final | 78 tópicos, 92 questões, 30 do simulado |
| **Prova oficial 2023 — Soldado** | Cebraspe, 27/8/2023, 5 alternativas | 45 questões |
| **Prova oficial 2023 — Oficial** | Cebraspe, 13/8/2023 — mesma legislação de SC | 47 questões |
| **Inéditas** | Múltipla escolha no estilo da banca, a partir do Anexo II do edital | 130 questões |
| | | **344 questões** |

As questões da prova oficial vêm da banca; o **gabarito é o definitivo do Cebraspe**, e as
justificativas foram escritas para este sistema (a banca publica só a letra). Questões anuladas, as
de Raciocínio Lógico (fora do edital 2026) e as que dependem de imagem do caderno ficam de fora.
Cada questão mostra sua origem — prova oficial, apostila ou inédita — para você saber o que está
treinando.

### Funcionalidades

| Área | Descrição |
| --- | --- |
| **Treino do dia** | 20 questões sorteadas por dia, com prioridade para a revisão vencida e para os seus erros, e o resto distribuído pelo peso de cada disciplina. Registra a sequência de dias. |
| **Vídeo-aulas** | Menu por matéria e por tópico que abre a busca do YouTube já ordenada por visualizações, mais indicações e canais. |
| **Painel** | Meta diária, revisões vencidas, projeção de nota na objetiva (acurácia × peso de cada disciplina), dias até a prova, etapa de hoje no plano de 30 dias e alerta de disciplina zerada. |
| **Matérias** | Guia de cada matéria: a pergunta que ela responde, o que é, para que serve, o que estudar, um exemplo concreto, como estudar, armadilhas e números-chave e de cada tópico, antes da teoria. Teoria renderizada em tipografia de verdade — tabelas, listas, destaques "No edital" / "Atenção" / "Dica de prova" — com referências legais e prazos em negrito, tempo de leitura e marcação do que já estudou. |
| **Questões** | Certo/Errado e múltipla escolha A–E. Ao errar, mostra **sua resposta, a resposta correta e o porquê**. Filtros por disciplina, só prova oficial, ou focado nos seus erros. |
| **Revisão** | Revisão espaçada (SM-2 simplificado): acertou → 3, 7, 16+ dias; errou → volta amanhã. |
| **Simulado** | Prova oficial de 2023 (2h), simulado ponderado de 60 questões na distribuição da Tabela 8.1 (2h) e o simulado da apostila (1h). Gabarito comentado só no fim, como na prova. |
| **Caderno de erros** | Toda questão errada entra automaticamente; você anota o motivo e marca como resolvido. |
| **Plano** | Cronogramas de 12 semanas e da reta final de 30 dias, com check-off, e o mapa de pegadinhas da banca. |
| **Estatísticas** | Acerto geral, questões dominadas, sequência de dias, gráfico dos últimos 14 dias, evolução por sessão e onde investir o tempo. |
| **Redação** | Tema de ordem pública sorteado, cronômetro, correção automática por cinco critérios (20 pontos), apontamentos classificados e histórico de notas. |

Peso real de cada disciplina (Tabela 8.1 do edital): Institucional 10, Constitucional 8, Português 8,
Penal 6, Processo Penal 6, Penal Militar 6, Legislação Especial 6, Trânsito 5, Informática 5 = 60
questões + 20 pontos de redação. Aprovação exige 50% do total e **nenhuma disciplina zerada**.

### Navegação

No computador, barra lateral fixa com as seções agrupadas em Estudar, Avaliar e Acompanhar, e o usuário, o tema e o sair no rodapé dela. No celular, barra inferior fixa com as seções principais, alvos de toque de 44px, tema claro/escuro com
alternância no cabeçalho, tabelas com rolagem própria e cartões no lugar de tabelas nas telas
estreitas.

## Stack

- **Next.js 15** (App Router, Server Components, TypeScript)
- **Tailwind CSS 4** + **lucide-react**
- **Supabase**: Postgres com RLS, Auth por usuário/senha
- **Vercel** para hospedagem

## Setup

### 1. Supabase

1. Crie um projeto em <https://supabase.com/dashboard>.
2. No **SQL Editor**, rode **na ordem**:
   - `supabase/migrations/0001_init.sql` — tabelas, RLS, trigger de perfil, view de desempenho
   - `supabase/migrations/0002_questoes_multipla_escolha.sql` — múltipla escolha, proveniência,
     textos de apoio, teoria em blocos e marcadores
   - `supabase/migrations/0003_redacao_e_resumos.sql` — redações, resumos didáticos e limpeza do
     índice legado de questões
   - `supabase/migrations/0004_treino_diario_e_guia.sql` — treino diário e guia das matérias
3. Em **Project Settings → API**, copie `Project URL`, a chave `anon` e a `service_role`.
4. Em **Authentication → Providers → Email**, mantenha o provedor habilitado. Como a tela de login
   não tem cadastro, crie os usuários pelo painel do Supabase e desligue
   **Allow new users to sign up** para fechar o sistema.

### 2. Rodar local

```bash
cp .env.example .env.local   # preencha as 3 variáveis
npm install
npm run conteudo             # parse + validação + seed
npm run dev                  # http://localhost:3000
```

O login aceita usuário simples, sem `@`: o app completa com um domínio interno
(`adm` → `adm@pmsc.local`), que nunca recebe e-mail. Um e-mail completo também funciona.

### 3. Deploy na Vercel

1. <https://vercel.com/new> → importe o repositório.
2. Em **Environment Variables**, adicione **apenas** `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   > A `SUPABASE_SERVICE_ROLE_KEY` nunca vai para a Vercel — ela ignora o RLS e só serve ao seed local.
3. Depois do deploy, em **Supabase → Authentication → URL Configuration**, ponha a URL da Vercel em
   *Site URL* e em *Redirect URLs*.

## Pipeline de conteúdo

```bash
npm run parse     # PDFs já extraídos em texto -> content/*.json
npm run validar   # confere gabaritos, alternativas, comentários e referências
npm run seed      # envia ao Supabase (idempotente, preserva ids e seu histórico)
npm run conteudo  # os três acima em sequência
```

Para reextrair os PDFs (precisa de `pdftotext`, do poppler):

```bash
# apostila — modo layout preserva as tabelas
pdftotext -layout -enc UTF-8 Apostila_PMSC_2026_Soldado.pdf content/apostila.txt

# provas oficiais de 2023, direto do CDN da banca — modo raw respeita as duas colunas
curl -sL -o sold.pdf https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/862_PMSC_SOLDADO_001_01.PDF
curl -sL -o soldgab.pdf https://cdn.cebraspe.org.br/concursos/pm_sc_23_soldado/arquivos/GAB_DEFINITIVO_862_PMSC_SOLDADO_001_01.PDF
curl -sL -o ofic.pdf https://cdn.cebraspe.org.br/concursos/pm_sc_23_oficial/arquivos/860_PMSC_OFICIAL_OBJ_001_01.PDF
curl -sL -o oficgab.pdf https://cdn.cebraspe.org.br/concursos/pm_sc_23_oficial/arquivos/GAB_DEFINITIVO_860_PMSC_OFICIAL_OBJ_001_01.PDF
pdftotext -raw    -enc UTF-8 sold.pdf    content/prova-2023.txt
pdftotext -layout -enc UTF-8 soldgab.pdf content/prova-2023-gabarito.txt
pdftotext -raw    -enc UTF-8 ofic.pdf    content/prova-2023-oficial.txt
pdftotext -layout -enc UTF-8 oficgab.pdf content/prova-2023-oficial-gabarito.txt
```

Os comentários das questões ficam em `content/provas-comentarios.json` e `content/apostila-comentarios.json`, **separados do parser de
propósito**: reprocessar o PDF nunca apaga o que foi escrito à mão.

### Escrever novas questões

Acrescente um arquivo `content/questoes-ineditas-N.json` no mesmo formato dos existentes
(`extId` único, `disciplina` = slug, 5 alternativas A–E, `resposta` e `justificativa`) e rode
`npm run validar && npm run seed`. O validador recusa gabarito inexistente, alternativa vazia,
`extId` repetido e justificativa faltando.

## Estrutura

```
app/
  (app)/            páginas autenticadas (painel, matérias, questões, revisão, simulado, erros, plano, estatísticas)
  login/            login por usuário e senha
components/
  question-runner   motor de questões (CE e múltipla escolha, correção comentada)
  blocos            renderizador da teoria estruturada
  nav-lateral       barra lateral do desktop
  navegacao         itens do menu e barra inferior do celular
  ui, tema, graficos, sessao
lib/
  supabase/         clients de browser e server (@supabase/ssr)
  srs.ts            revisão espaçada
  plans.ts          cronogramas e dicas de banca
  questions.ts      consulta de questões e textos de apoio
  redacao/          temas de ordem pública e o analisador da redação
  treino.ts         seleção das 20 questões do dia
  videos.ts         menu de vídeo-aulas e buscas prontas no YouTube
content/            textos extraídos dos PDFs, JSONs estruturados e questões autorais
scripts/            parse-apostila, parse-provas, validar-conteudo, seed, lib/estrutura
supabase/migrations/
```

## Modelo de dados

- **Conteúdo** (leitura para qualquer usuário logado): `disciplines`, `topics`, `questions`, `passages`
- **Por usuário** (RLS restrita ao dono): `profiles`, `attempts`, `reviews`, `exam_sessions`,
  `error_notes`, `topic_progress`, `study_days`, `bookmarks`, `essays`, `daily_sets`
- **Views**: `v_discipline_stats` (acurácia por disciplina) e `v_daily_activity` (atividade por dia)

---

Material de estudo pessoal. Teoria transcrita da Apostila PM SC 2026; questões da prova oficial de
2023 obtidas no CDN público do Cebraspe, com gabarito definitivo da banca.
