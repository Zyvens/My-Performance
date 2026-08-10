# My Performance — Life RPG

PWA pessoal gamificado para organizar **vida pessoal, GSA, carreira e estudos** em uma única campanha.

## O que já vem pronto

- 93 missões iniciais:
  - hábitos e rotina pessoal;
  - metas profissionais de carreira;
  - plano de estudos derivado do repositório `Strategy`;
  - 64 metas/cadências da GSA importadas do `gsa-quest-v7.html`.
- Main Quests e Side Quests.
- Missões diárias, semanais, mensais e marcos únicos.
- Data limite, horários, dias da semana, dependências e correlações.
- XP, níveis, patentes, streak, atributos, achievements e ouro.
- Loja de recompensas customizável.
- Agenda, deadlines, score diário e mapa de consistência.
- PWA instalável e funcionamento offline.
- Sincronização opcional via Vercel Function + Neon Postgres.

## Rodar localmente

Como o front-end é estático, qualquer servidor HTTP funciona:

```bash
npx serve .
```

Abra a URL local mostrada no terminal.

## Deploy na Vercel + Neon

1. Importe este repositório na Vercel.
2. Conecte/crie um banco Neon e exponha `DATABASE_URL`.
3. Crie uma variável de ambiente `SYNC_KEY` com uma senha longa e exclusiva.
4. Faça o deploy/redeploy.
5. No app, abra **Configurações → Vercel Cloud Sync**.
6. Use o mesmo **perfil** e a mesma **SYNC_KEY** em todos os dispositivos.
7. Clique em **Salvar e sincronizar**.

A tabela `my_performance_state` é criada automaticamente no primeiro acesso ao endpoint.

## PWA

No Android/Chrome use **Adicionar à tela inicial / Instalar app**. No desktop Chromium use o ícone de instalação da barra de endereços quando disponível.

## Arquitetura

- `index.html` — shell da aplicação.
- `styles.css` — design responsivo.
- `data.js` — missões iniciais e dados de RPG.
- `app.js` — engine de quests, XP, agenda e UI.
- `cloud-sync.js` — sincronização local-first.
- `api/state.js` — Vercel Function com persistência Neon.
- `sw.js` + `manifest.webmanifest` — PWA/offline.
