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
- Persistência local imediata + sincronização opcional em **Neon Postgres** pela **Neon Data API**.

## Arquitetura

O projeto é deliberadamente estático:

```text
GitHub Pages
   ↓ HTTPS
Neon Data API
   ↓ RPC protegida por chave com hash
Neon Postgres
```

Nenhuma `DATABASE_URL`, senha de Postgres ou API key administrativa é colocada no JavaScript do site.

## 1. Publicar no GitHub Pages

Depois de fazer merge desta branch em `main`:

1. Abra o repositório no GitHub.
2. Entre em **Settings → Pages**.
3. Em **Build and deployment**, selecione **Deploy from a branch**.
4. Branch: **main**.
5. Folder: **/(root)**.
6. Clique em **Save**.
7. A URL padrão será `https://zyvens.github.io/My-Performance/`.

O app não precisa de npm, build ou servidor Node.

## 2. Criar o Neon Postgres

1. Crie um projeto no Neon.
2. Abra o **SQL Editor**.
3. Abra o arquivo `neon-setup.sql` deste repositório.
4. Troque `CHANGE_THIS_SYNC_KEY` por uma frase-senha longa e exclusiva.
5. Execute o arquivo completo.

Isso cria `my_performance_state` e duas funções RPC: `my_performance_pull` e `my_performance_push`. A chave é armazenada com hash `bcrypt/pgcrypto`; o valor em texto puro não fica no banco.

## 3. Ativar a Neon Data API

No projeto Neon:

1. Abra **Data API**.
2. Ative a Data API para o mesmo banco em que rodou `neon-setup.sql`.
3. Para este modelo pessoal, habilite acesso **unauthenticated**. O SQL revoga acesso direto à tabela e concede ao papel `anonymous` apenas execução das duas funções RPC.
4. Copie a **Data API URL** mostrada pelo Neon.
5. Se você acabou de criar ou alterar as funções e a Neon oferecer **Refresh schema cache**, execute-o.

## 4. Conectar o app à nuvem

No My Performance:

1. Vá a **Config → Neon Postgres → Cloud Sync**.
2. Cole a **Data API URL**.
3. Perfil: `vitor`.
4. Chave: exatamente a mesma que você colocou em `neon-setup.sql`.
5. Marque **Ativar sincronização**.
6. Clique em **Salvar e sincronizar**.

Na primeira conexão, se a linha do Neon ainda estiver vazia, o app envia automaticamente os dados do dispositivo atual.

No segundo dispositivo, repita URL, perfil e chave. O app baixa o estado mais recente e continua sincronizando automaticamente após alterações.

## 5. Instalar no celular ou PC

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
- `cloud-sync.js` — sincronização local-first com a Neon Data API.
- `neon-setup.sql` — tabela, hash da chave e RPCs seguras.
- `sw.js` + `manifest.webmanifest` — PWA/offline.

## Backup manual

Em **Config**, use **Exportar JSON** antes de mudanças grandes. O mesmo arquivo pode ser importado em qualquer navegador.
