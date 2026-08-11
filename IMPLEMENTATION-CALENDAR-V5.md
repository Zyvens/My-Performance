# My Performance 2.1 — Calendar V5

## Arquitetura
Uma única autoridade de planejamento:

`Janelas -> Eventos -> Main Quests -> Side Quests dedicadas -> Side Quests filler -> capacidade livre`

## Conceitos
- **Janelas**: capacidade/intenção, com cor, grupos, energia, autorização de Side Quest, dedicação a Side Quest e Zona Livre.
- **Eventos**: ocupações imperativas; recorrentes ou únicas; deslocamento associado; BNI, Célula e Terapia migrados para Eventos.
- **Main Quests**: trabalho estratégico de Campanhas, distribuído por deadline, alvo, esforço restante, prioridade, capacidade, fairness, continuidade e energia.
- **Side Quest Packs**: Piano, Lazer, Atividades Cotidianas e Saúde/Bem-estar; ativação/desativação de pacote e missão individual.
- **Side Quests**: diárias expiram e não acumulam; semanais/mensais podem fragmentar; fillers só entram em janelas autorizadas.
- **Fora do calendário**: backlog explícito com Substituir e Replanejar.

## Recursos adicionados
- Faixas verticais coloridas das janelas na tela Hoje.
- Identidade visual independente para Main Quest, Side Quest, Evento e Deslocamento.
- Editor de Eventos com simulação de impacto antes de salvar.
- Editor de Janelas com cor, energia e política de Side Quests.
- Gestor de Side Quest Packs.
- Substituição manual de atividade do cronograma.
- Fixação manual de ocorrência sem transformar a missão em Evento.
- Modo Foco.
- Semana estratégica com capacidade por Grupo/Campanha.
- Risco de Campanha e capacidade futura no Planner.
- Revisões de planejamento com desfazer.
- Histórico explicável de decisões.
- Cache limitado + stress test obrigatório com heap de 64 MB.
- Estado planejado continua derivado; Neon sincroniza fatos/configuração, não milhares de blocos calculados.

## Regras preservadas
- Deadlines não são movidos por replanejamento ou Descartar dia.
- Eventos nunca são deslocados/substituídos automaticamente.
- Missões e Main Quests não ganham deslocamento automático.
- Terapia: terça 08:00–08:30, com deslocamento.
- BNI: quarta 06:00–11:00, como Evento GSA.
- Célula Zion Brave: quinta 19:00–23:00, como Evento.
- Academia é Side Quest preferencial e móvel, não regra global.
