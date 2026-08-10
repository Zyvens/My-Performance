# My Performance — Life RPG

PWA pessoal gamificado para organizar **vida pessoal, GSA, carreira e estudos** em uma única campanha.

## O que vem pronto

- **108 quests iniciais**:
  - rotina pessoal: acordar, café da manhã, almoço, treino, lazer, sono e revisão semanal;
  - carreira: ações de alto impacto, networking, pipeline e posicionamento;
  - **33 missões do Strategy/Transpetro**, incluindo diárias, semanais, bosses e metas mensais;
  - **64 metas/cadências da GSA Quest v7**, com as trilhas Serviço, Produto, Captação e Estrutura.
- Main Quests e Side Quests.
- Toda quest criada pelo usuário nasce como **Side Quest**; o formulário permite mudar para Main Quest.
- Cadência diária, semanal, mensal ou missão única.
- Data inicial, deadline, horário inicial/final e dias da semana.
- Dependências que bloqueiam uma quest até a anterior ser concluída.
- Correlações que geram bônus de combo quando relacionadas já foram concluídas.
- XP, níveis, patentes, streak, quatro atributos, achievements e moedas.
- Loja de recompensas editável.
- Quest Debt para missões únicas vencidas.
- Dashboard, Hoje, Quest Log, Agenda, ficha do Player, Recompensas e Configurações.
- PWA instalável e funcionamento offline.
- Persistência local imediata + sincronização em **Neon Postgres** usando **Neon Auth + Neon Data API**.

## Arquitetura

O front-end continua 100% estático:

```text
GitHub Pages
   ↓ HTTPS
Neon Auth (sessão/JWT)
   ↓
Neon Data API
   ↓ RLS + RPC
Neon Postgres
```

Nenhuma `DATABASE_URL`, senha de Postgres ou API key administrativa é colocada no JavaScript do site. As URLs públicas do Neon Auth e da Data API já estão configuradas em `cloud-sync.js`.

Cada conta Neon Auth possui seu próprio save. A política de Row-Level Security associa o estado ao `auth.user_id()` do JWT, impedindo que uma conta leia o save de outra.

## Status da infraestrutura Neon

O projeto **My Performance** já foi provisionado no Neon com:

- banco `neondb`;
- Neon Auth ativo;
- Neon Data API ativa;
- origem confiável `https://zyvens.github.io`;
- tabela `my_performance_state`;
- RLS por usuário autenticado;
- RPC `my_performance_pull()`;
- RPC `my_performance_push(p_state)`.

O arquivo `neon-setup.sql` representa o schema atual e pode ser usado para reconstruir a camada de persistência em outro projeto Neon.

## 1. Publicar no GitHub Pages

1. Abra o repositório no GitHub.
2. Entre em **Settings → Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Branch: **main**.
5. Folder: **/(root)**.
6. Clique em **Save**.
7. A URL padrão será `https://zyvens.github.io/My-Performance/`.

O app não precisa de npm, build ou servidor Node.

## 2. Primeiro acesso e criação do save em cloud

No My Performance:

1. Vá a **Config → Neon Postgres → Cloud Sync**.
2. Digite o e-mail que deseja usar para o My Performance.
3. Defina uma senha com pelo menos 8 caracteres.
4. Clique em **Criar conta** no primeiro dispositivo.
5. O app cria a sessão Neon Auth e envia automaticamente o estado local inicial para o Postgres.

A senha não é armazenada pelo My Performance no `localStorage`.

## 3. Usar em outro celular ou PC

No outro dispositivo:

1. Abra a mesma URL do GitHub Pages.
2. Entre em **Config → Neon Postgres → Cloud Sync**.
3. Informe o mesmo e-mail e senha.
4. Clique em **Entrar e sincronizar**.

O estado mais recente é carregado do Neon. Depois disso, alterações continuam sendo salvas localmente primeiro e sincronizadas automaticamente quando houver conexão.

## 4. Instalar no celular ou PC

### Android / Chrome

1. Abra `https://zyvens.github.io/My-Performance/`.
2. Menu do Chrome → **Adicionar à tela inicial** / **Instalar app**.
3. Abra pelo ícone criado.

### PC / Chrome ou Edge

1. Abra a mesma URL.
2. Use o ícone de instalação na barra de endereço, quando exibido, ou menu → **Apps / Instalar**.

O service worker mantém os arquivos essenciais em cache; portanto a interface continua abrindo offline. Alterações são salvas primeiro no `localStorage` e enviadas ao Neon quando a conexão estiver disponível.

## Arquivos principais

- `index.html` — shell da aplicação.
- `styles.css` — design responsivo desktop/mobile.
- `data.js` — catálogo inicial com 108 quests e dados de RPG.
- `app.js` — engine de recorrência, dependências, XP, agenda, achievements e editor.
- `cloud-sync.js` — Neon Auth + sincronização local-first pela Neon Data API.
- `neon-setup.sql` — tabela, RLS e RPCs autenticadas.
- `sw.js` + `manifest.webmanifest` — PWA/offline.

## Backup manual

Em **Config**, use **Exportar JSON** antes de mudanças grandes. O mesmo arquivo pode ser importado em qualquer navegador.
