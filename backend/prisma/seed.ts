import { BookLevel, BookNoteStatus, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      name: 'carreira',
      slug: 'carreira',
      description: 'Evolução profissional com consistência e leitura de contexto.',
    },
    {
      name: 'gestão de equipes',
      slug: 'gestao-de-equipes',
      description: 'Ritmo, alinhamento e acompanhamento sem excesso de ruído.',
    },
    {
      name: 'liderança',
      slug: 'lideranca',
      description: 'Critério, influência e direção para liderar com mais clareza.',
    },
    {
      name: 'mentalidade',
      slug: 'mentalidade',
      description: 'Modelos mentais para decidir melhor sob pressão e ambiguidade.',
    },
    {
      name: 'produtividade',
      slug: 'produtividade',
      description: 'Energia, foco e estrutura para trabalho intelectual de maior qualidade.',
    }
  ];

  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });

    categoryMap.set(record.slug, record.id);
  }

  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? 'admin@papodelideranca.local';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'AdminNovaSenha123!';
  const adminName = process.env.ADMIN_SEED_NAME ?? 'Khened Santos';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      hasCompletedAccess: true,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
      hasCompletedAccess: true,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    },
  });

  const invitedPasswordHash = await bcrypt.hash('PendingAccess123!', 10);

  await prisma.user.upsert({
    where: { email: 'convite@papodelideranca.local' },
    update: {
      name: 'Usuário Convite',
      passwordHash: invitedPasswordHash,
      role: 'MEMBER',
      isActive: true,
      hasCompletedAccess: false,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
      lastLoginAt: null,
    },
    create: {
      name: 'Usuário Convite',
      email: 'convite@papodelideranca.local',
      passwordHash: invitedPasswordHash,
      role: 'MEMBER',
      isActive: true,
      hasCompletedAccess: false,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
      lastLoginAt: null,
    },
  });

  await prisma.subscription.upsert({
    where: {
      id: `${admin.id}-premium`,
    },
    update: {
      userId: admin.id,
      status: 'ACTIVE',
      plan: 'PREMIUM',
      startedAt: new Date('2026-04-20T00:00:00.000Z'),
      endsAt: null,
    },
    create: {
      id: `${admin.id}-premium`,
      userId: admin.id,
      status: 'ACTIVE',
      plan: 'PREMIUM',
      startedAt: new Date('2026-04-20T00:00:00.000Z'),
      endsAt: null,
    },
  });

  const articles = [
    {
      slug: 'artigo-foco-estrategico-tambem-e-uma-decisao-de-agenda',
      title: 'foco estratégico também é uma decisão de agenda',
      excerpt: 'Foco estratégico ganha realidade quando a agenda deixa de privilegiar só manutenção e resposta imediata.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-29T12:00:00.000Z'),
    },
    {
      slug: 'artigo-o-que-cortar-antes-de-tentar-fazer-mais',
      title: 'o que cortar antes de tentar fazer mais',
      excerpt: 'Antes de buscar mais produção, vale cortar ruído, excesso de manutenção e compromissos sem retorno real.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-28T12:00:00.000Z'),
    },
    {
      slug: 'artigo-parar-de-trabalhar-no-modo-interrupcao',
      title: 'como parar de trabalhar no modo interrupção',
      excerpt: 'Sair do modo interrupção exige menos reatividade estrutural e mais desenho de foco ao longo do dia.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-27T12:00:00.000Z'),
    },
    {
      slug: 'artigo-reunioes-demais-empobrecem-a-semana',
      title: 'reuniões demais empobrecem a semana',
      excerpt: 'Excesso de reunião empobrece foco, preparação e pensamento profundo ao longo da semana.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-26T12:00:00.000Z'),
    },
    {
      slug: 'artigo-lider-precisa-de-blocos-sem-resposta-imediata',
      title: 'por que o líder precisa de blocos sem resposta imediata',
      excerpt: 'Blocos sem resposta imediata protegem pensamento, priorização e qualidade da liderança.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-25T12:00:00.000Z'),
    },
    {
      slug: 'artigo-produtividade-melhor-comeca-no-filtro',
      title: 'produtividade melhor começa no filtro',
      excerpt: 'Filtro bom protege atenção e evita que produtividade vire simples gestão de volume.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-24T12:00:00.000Z'),
    },
    {
      slug: 'artigo-custo-invisivel-da-atencao-fragmentada',
      title: 'o custo invisível da atenção fragmentada',
      excerpt: 'Atenção fragmentada drena profundidade, aumenta ruído e faz o trabalho importante perder nitidez.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-23T12:00:00.000Z'),
    },
    {
      slug: 'artigo-proteger-energia-para-o-que-realmente-importa',
      title: 'como proteger energia para o que realmente importa',
      excerpt: 'Proteger energia é parte central da produtividade de quem precisa pensar, decidir e sustentar qualidade.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-22T12:00:00.000Z'),
    },
    {
      slug: 'artigo-agenda-cheia-nao-e-sinal-de-direcao',
      title: 'agenda cheia não é sinal de direção',
      excerpt: 'Calendário lotado não garante prioridade, profundidade nem trabalho realmente relevante.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-21T12:00:00.000Z'),
    },
    {
      slug: 'artigo-prioridade-boa-reduz-mais-ruido-do-que-tarefa',
      title: 'prioridade boa reduz mais ruído do que tarefa',
      excerpt: 'Prioridade madura corta ruído, protege energia e impede que tudo receba o mesmo peso.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-05-20T12:00:00.000Z'),
    },
    {
      slug: 'artigo-quando-a-equipe-depende-demais-do-lider',
      title: 'quando a equipe depende demais do líder',
      excerpt: 'Dependência excessiva do líder costuma sinalizar desenho ruim de autonomia, contexto ou expectativa.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-19T12:00:00.000Z'),
    },
    {
      slug: 'artigo-gestao-boa-protege-autonomia-com-criterio',
      title: 'gestão boa protege autonomia com critério',
      excerpt: 'Boa gestão cria autonomia sustentável ao combinar confiança, contexto e fronteiras bem definidas.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-18T12:00:00.000Z'),
    },
    {
      slug: 'artigo-erro-de-revisar-tudo-no-detalhe',
      title: 'o erro de revisar tudo no detalhe',
      excerpt: 'Revisão excessiva enfraquece autonomia, congestiona decisão e piora a qualidade sistêmica da equipe.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-17T12:00:00.000Z'),
    },
    {
      slug: 'artigo-confianca-de-equipe-se-constroi-na-previsibilidade',
      title: 'confiança de equipe se constrói na previsibilidade',
      excerpt: 'Previsibilidade saudável reduz defesa, melhora coordenação e fortalece confiança coletiva.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-16T12:00:00.000Z'),
    },
    {
      slug: 'artigo-corrigir-rota-sem-humilhar-ninguem',
      title: 'como corrigir rota sem humilhar ninguém',
      excerpt: 'Boa correção protege aprendizado, responsabilidade e vínculo sem transformar erro em exposição desnecessária.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-15T12:00:00.000Z'),
    },
    {
      slug: 'artigo-alinhamento-real-nasce-de-expectativa-clara',
      title: 'alinhamento real nasce de expectativa clara',
      excerpt: 'Expectativa clara é a base mais simples e mais negligenciada de qualquer alinhamento real de equipe.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-14T12:00:00.000Z'),
    },
    {
      slug: 'artigo-quando-a-lideranca-para-de-centralizar-tudo',
      title: 'o que muda quando a liderança para de centralizar tudo',
      excerpt: 'Menos centralização abre espaço para time mais responsável, decisões melhores e escala mais madura.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-13T12:00:00.000Z'),
    },
    {
      slug: 'artigo-equipes-maduras-precisam-de-contexto-melhor',
      title: 'equipes maduras precisam de contexto melhor',
      excerpt: 'Equipes maduras operam melhor quando recebem contexto bom, não só tarefa e prazo.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-12T12:00:00.000Z'),
    },
    {
      slug: 'artigo-reduzir-retrabalho-sem-aumentar-controle',
      title: 'como reduzir retrabalho sem aumentar controle',
      excerpt: 'Retrabalho cai mais com clareza e contexto do que com aumento indiscriminado de controle.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-11T12:00:00.000Z'),
    },
    {
      slug: 'artigo-delegar-sem-desaparecer-da-responsabilidade',
      title: 'delegar sem desaparecer da responsabilidade',
      excerpt: 'Delegar bem significa dar contexto, manter presença útil e continuar responsável pelo que importa.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-05-10T12:00:00.000Z'),
    },
    {
      slug: 'artigo-autoconsciencia-que-melhora-decisao',
      title: 'o tipo de autoconsciência que melhora decisão',
      excerpt: 'Autoconsciência madura ajuda a antecipar os próprios vieses antes que eles conduzam decisões importantes.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-09T12:00:00.000Z'),
    },
    {
      slug: 'artigo-menos-defesa-mais-discernimento',
      title: 'menos defesa, mais discernimento',
      excerpt: 'Discernimento melhora quando a defesa deixa de comandar a escuta, a leitura e a resposta.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-08T12:00:00.000Z'),
    },
    {
      slug: 'artigo-quando-a-ansiedade-comeca-a-dirigir-sua-leitura',
      title: 'quando a ansiedade começa a dirigir sua leitura',
      excerpt: 'Ansiedade distorce leitura quando começa a decidir o peso das situações antes do critério.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-07T12:00:00.000Z'),
    },
    {
      slug: 'artigo-repertorio-emocional-para-nao-contaminar-o-time',
      title: 'repertório emocional para não contaminar o time',
      excerpt: 'Repertório emocional ajuda a conter contágio de tensão e a distribuir mais estabilidade para o time.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-06T12:00:00.000Z'),
    },
    {
      slug: 'artigo-diferenca-entre-confianca-e-rigidez-interna',
      title: 'a diferença entre confiança e rigidez interna',
      excerpt: 'Confiança amadurecida sustenta abertura e critério; rigidez interna tenta se proteger fechando a leitura.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-05T12:00:00.000Z'),
    },
    {
      slug: 'artigo-presenca-madura-nao-precisa-disputar-atencao',
      title: 'presença madura não precisa disputar atenção',
      excerpt: 'Presença madura se fortalece quando deixa de disputar atenção e passa a oferecer mais qualidade de leitura.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-04T12:00:00.000Z'),
    },
    {
      slug: 'artigo-sustentar-criterio-quando-o-ambiente-acelera',
      title: 'como sustentar critério quando o ambiente acelera',
      excerpt: 'Critério sob aceleração exige eixo interno, leitura de contexto e menos captura pelo ritmo do entorno.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-03T12:00:00.000Z'),
    },
    {
      slug: 'artigo-disciplina-mental-para-nao-decidir-no-reflexo',
      title: 'disciplina mental para não decidir no reflexo',
      excerpt: 'Disciplina mental é a capacidade de não entregar a decisão ao primeiro impulso disponível.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-02T12:00:00.000Z'),
    },
    {
      slug: 'artigo-risco-de-pensar-so-a-partir-da-urgencia',
      title: 'o risco de pensar só a partir da urgência',
      excerpt: 'Pensar só pela urgência estreita leitura, aumenta ruído e distorce a qualidade da decisão.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-05-01T12:00:00.000Z'),
    },
    {
      slug: 'artigo-clareza-interna-antes-da-conversa-dificil',
      title: 'clareza interna antes da conversa difícil',
      excerpt: 'Conversa difícil melhora quando a mente entra menos contaminada por defesa, excesso e pressa.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-04-30T12:00:00.000Z'),
    },
    {
      slug: 'artigo-o-que-faz-alguem-parecer-pronto-para-o-proximo-nivel',
      title: 'o que faz alguém parecer pronto para o próximo nível',
      excerpt: 'Prontidão profissional aparece quando a pessoa passa a organizar mais contexto do que esforço visível.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-29T12:00:00.000Z'),
    },
    {
      slug: 'artigo-maturidade-profissional-aparece-antes-do-cargo',
      title: 'maturidade profissional aparece antes do cargo',
      excerpt: 'Maturidade profissional fica visível no modo de trabalhar antes de qualquer promoção chegar.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-28T12:00:00.000Z'),
    },
    {
      slug: 'artigo-ser-lembrado-pelo-criterio-nao-pelo-ruido',
      title: 'como ser lembrado pelo critério, não pelo ruído',
      excerpt: 'Ser lembrado do jeito certo depende menos de ruído e mais de critério legível nas decisões e nas entregas.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-27T12:00:00.000Z'),
    },
    {
      slug: 'artigo-consistencia-vale-mais-que-picos-de-performance',
      title: 'consistência vale mais do que picos de performance',
      excerpt: 'Picos impressionam, mas é a consistência que costuma sustentar confiança, prontidão e crescimento real.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-26T12:00:00.000Z'),
    },
    {
      slug: 'artigo-quando-dizer-sim-enfraquece-sua-trajetoria',
      title: 'quando dizer sim começa a enfraquecer sua trajetória',
      excerpt: 'Carreira perde força quando o sim automático substitui critério, prioridade e leitura de trajetória.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-25T12:00:00.000Z'),
    },
    {
      slug: 'artigo-carreira-boa-pede-leitura-de-contexto',
      title: 'carreira boa pede leitura de contexto, não só entrega',
      excerpt: 'Carreira consistente exige leitura de contexto para transformar boa entrega em relevância percebida.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-24T12:00:00.000Z'),
    },
    {
      slug: 'artigo-visibilidade-madura-sem-performar-palco',
      title: 'visibilidade madura para quem não quer performar palco',
      excerpt: 'Visibilidade madura cresce quando valor, contexto e contribuição ficam claros sem barulho desnecessário.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-23T12:00:00.000Z'),
    },
    {
      slug: 'artigo-custo-de-tentar-provar-valor-o-tempo-todo',
      title: 'o custo de tentar provar valor o tempo todo',
      excerpt: 'A necessidade constante de provar valor costuma aumentar ruído, desgaste e escolhas defensivas na carreira.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-22T12:00:00.000Z'),
    },
    {
      slug: 'artigo-reputacao-profissional-se-constroi-no-detalhe',
      title: 'reputação profissional se constrói no detalhe',
      excerpt: 'Reputação sólida nasce de detalhes consistentes: prazo, contexto, acabamento e leitura de impacto.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-21T12:00:00.000Z'),
    },
    {
      slug: 'artigo-crescer-sem-parecer-sempre-disponivel',
      title: 'como crescer sem parecer sempre disponível',
      excerpt: 'Maturidade de carreira também aparece quando disponibilidade deixa de ser confundida com valor.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-20T12:00:00.000Z'),
    },
    {
      slug: 'artigo-rituais-simples-para-alinhamento',
      title: 'rituais simples que aumentam alinhamento sem engessar a equipe',
      excerpt: 'Poucos rituais, ritmo claro e alinhamento útil sem excesso de processo.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-04-19T12:00:00.000Z'),
    },
    {
      slug: 'artigo-disciplina-emocional-sob-pressao',
      title: 'disciplina emocional sob pressão',
      excerpt: 'Presença, pausa e critério quando o ambiente acelera mais do que deveria.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-04-18T12:00:00.000Z'),
    },
    {
      slug: 'artigo-proteger-tempo-de-pensamento-estrategico',
      title: 'como proteger tempo de pensamento estratégico na rotina do líder',
      excerpt: 'Um texto para recuperar profundidade num calendário dominado por reatividade.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-04-17T12:00:00.000Z'),
    },
    {
      slug: 'artigo-relevancia-sem-autopromocao',
      title: 'relevância sem autopromoção vazia',
      excerpt: 'Como tornar valor mais legível sem transformar presença profissional em ruído.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-16T12:00:00.000Z'),
    },
    {
      slug: 'artigo-produtividade-do-lider',
      title: 'produtividade do líder',
      excerpt: 'Energia, foco e escolha para proteger o trabalho intelectual de maior qualidade.',
      readTimeMinutes: 6,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-04-15T12:00:00.000Z'),
    },
    {
      slug: 'artigo-mentalidade-que-gera-influencia',
      title: 'a mentalidade que gera influência',
      excerpt: 'Critério interno, presença e postura para ampliar influência sem performance teatral.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-04-14T12:00:00.000Z'),
    },
    {
      slug: 'artigo-liderar-sem-microgerenciar',
      title: 'liderar sem microgerenciar',
      excerpt: 'Direção, acompanhamento e presença suficiente sem transformar liderança em controle excessivo.',
      readTimeMinutes: 6,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-04-13T12:00:00.000Z'),
    },
    {
      slug: 'artigo-feedback-que-desenvolve',
      title: 'feedback que desenvolve',
      excerpt: 'Um texto sobre feedback com clareza, responsabilidade e evolução real no time.',
      readTimeMinutes: 7,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-04-12T12:00:00.000Z'),
    },
    {
      slug: 'artigo-carreira-antes-da-promocao',
      title: 'o que profissionais promovidos fazem antes do cargo chegar',
      excerpt: 'Como evoluir com maturidade, valor percebido e consistência antes da próxima promoção.',
      readTimeMinutes: 4,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-11T12:00:00.000Z'),
    },
    {
      slug: 'artigo-autoridade-sem-dureza',
      title: 'autoridade sem dureza',
      excerpt: 'Firmeza, clareza de direção e presença suficiente para liderar sem endurecer o ambiente.',
      readTimeMinutes: 6,
      categorySlug: 'lideranca',
      publishedAt: new Date('2026-04-10T12:00:00.000Z'),
    }
  ];

  const articleMap = new Map<string, string>();

  for (const article of articles) {
    const record = await prisma.article.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        excerpt: article.excerpt,
        content: `## ${article.title}\n\n${article.excerpt}`,
        readTimeMinutes: article.readTimeMinutes,
        isPublished: true,
        publishedAt: article.publishedAt,
        categoryId: categoryMap.get(article.categorySlug)!,
      },
      create: {
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: `## ${article.title}\n\n${article.excerpt}`,
        readTimeMinutes: article.readTimeMinutes,
        isPublished: true,
        publishedAt: article.publishedAt,
        categoryId: categoryMap.get(article.categorySlug)!,
      },
    });

    articleMap.set(record.slug, record.id);
  }

  const articlePressure = { id: articleMap.get('artigo-disciplina-emocional-sob-pressao')! };
  const articleStrategy = { id: articleMap.get('artigo-proteger-tempo-de-pensamento-estrategico')! };

  const shortEditions = [
    {
      slug: 'rituais-simples-para-alinhamento',
      title: 'rituais simples para alinhamento',
      excerpt: 'Ritmo leve para o time trabalhar melhor sem transformar tudo em processo.',
      categorySlug: 'gestao-de-equipes',
      readTimeMinutes: 3,
      publishedAt: new Date('2026-04-19T10:00:00.000Z'),
    },
    {
      slug: 'clareza-antes-da-reacao',
      title: 'clareza antes da reação',
      excerpt: 'Uma leitura curta sobre como desacelerar o impulso e organizar direção.',
      categorySlug: 'lideranca',
      readTimeMinutes: 2,
      publishedAt: new Date('2026-04-19T09:00:00.000Z'),
    },
    {
      slug: 'crescimento-sem-virar-urgencia-cronica',
      title: 'crescimento sem virar urgência crônica',
      excerpt: 'Como crescer com consistência sem transformar evolução em pressa permanente.',
      categorySlug: 'carreira',
      readTimeMinutes: 3,
      publishedAt: new Date('2026-04-18T09:00:00.000Z'),
    },
    {
      slug: 'o-que-sustenta-um-time-quando-o-cenario-oscila',
      title: 'o que sustenta um time quando o cenário oscila',
      excerpt: 'Estabilidade, clareza e pequenos acordos quando o contexto muda rápido.',
      categorySlug: 'gestao-de-equipes',
      readTimeMinutes: 3,
      publishedAt: new Date('2026-04-17T09:00:00.000Z'),
    },
    {
      slug: 'proteger-tempo-de-pensamento-estrategico',
      title: 'como proteger tempo de pensamento estratégico',
      excerpt: 'Uma edição curta para recuperar profundidade em semanas reativas.',
      categorySlug: 'produtividade',
      readTimeMinutes: 3,
      publishedAt: new Date('2026-04-16T09:00:00.000Z'),
    },
    {
      slug: 'repertorio-melhor-decisoes-melhores',
      title: 'repertório melhor, decisões melhores',
      excerpt: 'Como ampliar repertório para decidir com mais contexto e menos improviso.',
      categorySlug: 'mentalidade',
      readTimeMinutes: 3,
      publishedAt: new Date('2026-04-15T09:00:00.000Z'),
    }
  ];

  const shortEditionMap = new Map<string, string>();

  for (const shortEdition of shortEditions) {
    const record = await prisma.shortEdition.upsert({
      where: { slug: shortEdition.slug },
      update: {
        title: shortEdition.title,
        excerpt: shortEdition.excerpt,
        ideaCentral: shortEdition.excerpt,
        whatMatters: [
          'clareza sobre o que realmente importa',
          'ritmo simples para transformar leitura em prática',
          'menos ruído e mais critério para decidir',
        ],
        applyToday: [
          'escolha uma conversa para aplicar o recorte desta edição',
          'registre um aprendizado em uma frase',
          'defina o próximo pequeno passo',
        ],
        quoteOfWeek: 'Consistência pequena, impacto grande.',
        readTimeMinutes: shortEdition.readTimeMinutes,
        isPublished: true,
        publishedAt: shortEdition.publishedAt,
        categoryId: categoryMap.get(shortEdition.categorySlug)!,
      },
      create: {
        title: shortEdition.title,
        slug: shortEdition.slug,
        excerpt: shortEdition.excerpt,
        ideaCentral: shortEdition.excerpt,
        whatMatters: [
          'clareza sobre o que realmente importa',
          'ritmo simples para transformar leitura em prática',
          'menos ruído e mais critério para decidir',
        ],
        applyToday: [
          'escolha uma conversa para aplicar o recorte desta edição',
          'registre um aprendizado em uma frase',
          'defina o próximo pequeno passo',
        ],
        quoteOfWeek: 'Consistência pequena, impacto grande.',
        readTimeMinutes: shortEdition.readTimeMinutes,
        isPublished: true,
        publishedAt: shortEdition.publishedAt,
        categoryId: categoryMap.get(shortEdition.categorySlug)!,
      },
    });

    shortEditionMap.set(record.slug, record.id);
  }

  const shortClarity = { id: shortEditionMap.get('clareza-antes-da-reacao')! };
  const shortRituals = { id: shortEditionMap.get('rituais-simples-para-alinhamento')! };

  const books = [
    {
      slug: 'gestor-eficaz',
      title: 'O gestor eficaz',
      subtitle: 'decisão, contribuição e clareza de prioridade',
      author: 'Peter Drucker',
      description: 'Um clássico para lembrar que liderança madura começa na capacidade de escolher onde colocar atenção, tempo e responsabilidade.',
      coverUrl: '/assets/img/books/gestor-eficaz.svg',
      coverAlt: 'Capa editorial do livro O gestor eficaz',
      category: 'liderança',
      level: BookLevel.ESSENTIAL,
      readTime: 'leitura de aprofundamento',
      whyRead: 'Porque ajuda a trocar ocupação por contribuição real. É uma leitura especialmente útil para quem precisa decidir melhor, proteger agenda e não confundir presença com controle.',
      whatYouWillLearn: [
        'separar atividade de contribuição',
        'usar tempo como recurso estratégico',
        'decidir com mais critério e menos impulso',
      ],
      keyIdeas: [
        'Eficácia é uma prática treinável, não um traço de personalidade.',
        'O tempo do líder precisa ser desenhado antes que a rotina o capture.',
        'Decisão boa nasce de foco, contexto e coragem de escolher poucas prioridades.',
      ],
      guidedQuestions: [
        'Que parte da sua agenda prova esforço, mas não contribuição?',
        'Qual decisão você está adiando por excesso de informação ou pouca clareza?',
        'Onde sua presença está virando controle em vez de direção?',
      ],
      practicalUse: 'Use este livro para revisar sua semana, cortar dispersão e transformar prioridade em agenda protegida.',
      relatedArticleSlugs: [
        'artigo-foco-estrategico-tambem-e-uma-decisao-de-agenda',
        'artigo-agenda-cheia-nao-e-sinal-de-direcao',
        'artigo-proteger-tempo-de-pensamento-estrategico',
      ],
      relatedShortEditionSlugs: [
        'proteger-tempo-de-pensamento-estrategico',
        'repertorio-melhor-decisoes-melhores',
      ],
      purchaseUrl: 'https://www.amazon.com.br/s?k=O+gestor+eficaz+Peter+Drucker',
      purchaseProvider: 'Amazon',
      isFeatured: true,
      displayOrder: 1,
    },
    {
      slug: 'lideranca-daniel-goleman',
      title: 'Liderança',
      subtitle: 'inteligência emocional aplicada ao trabalho de liderar',
      author: 'Daniel Goleman',
      description: 'Uma leitura para observar como clima, presença emocional e repertório interno influenciam a forma como pessoas seguem uma direção.',
      coverUrl: '/assets/img/books/lideranca-daniel-goleman.svg',
      coverAlt: 'Capa editorial do livro Liderança, de Daniel Goleman',
      category: 'liderança',
      level: BookLevel.DEEPENING,
      readTime: 'leitura de aprofundamento',
      whyRead: 'Porque liderança não é apenas decisão racional. Este livro ajuda a perceber o efeito emocional do líder no time e a sustentar firmeza sem endurecer.',
      whatYouWillLearn: [
        'reconhecer estilos de liderança',
        'ler o impacto emocional da própria presença',
        'ajustar comunicação conforme contexto e maturidade do time',
      ],
      keyIdeas: [
        'O líder influencia o clima antes mesmo de definir processos.',
        'Estilos diferentes servem a momentos diferentes.',
        'Autoconsciência é uma ferramenta de gestão, não apenas reflexão pessoal.',
      ],
      guidedQuestions: [
        'Que clima sua presença costuma criar quando a pressão aumenta?',
        'Qual estilo de liderança você usa em excesso?',
        'O que seu time precisa sentir para decidir melhor sem depender de você?',
      ],
      practicalUse: 'Leia pensando em uma situação recente de pressão e identifique o que sua postura amplificou no ambiente.',
      relatedArticleSlugs: [
        'artigo-disciplina-emocional-sob-pressao',
        'artigo-autoridade-sem-dureza',
        'artigo-repertorio-emocional-para-nao-contaminar-o-time',
      ],
      relatedShortEditionSlugs: [
        'clareza-antes-da-reacao',
        'o-que-sustenta-um-time-quando-o-cenario-oscila',
      ],
      purchaseUrl: 'https://www.amazon.com.br/s?k=Lideran%C3%A7a+Daniel+Goleman',
      purchaseProvider: 'Amazon',
      isFeatured: false,
      displayOrder: 2,
    },
    {
      slug: 'comece-pelo-porque',
      title: 'Comece pelo porquê',
      subtitle: 'clareza de direção antes da execução',
      author: 'Simon Sinek',
      description: 'Uma leitura útil para líderes que precisam comunicar sentido sem transformar propósito em frase decorativa.',
      coverUrl: '/assets/img/books/comece-pelo-porque.svg',
      coverAlt: 'Capa editorial do livro Comece pelo porquê',
      category: 'gestão de equipes',
      level: BookLevel.ESSENTIAL,
      readTime: '6h de leitura',
      whyRead: 'Porque times se movem melhor quando entendem a direção. O livro ajuda a organizar narrativa, critério e coerência entre discurso e decisão.',
      whatYouWillLearn: [
        'explicar direção com mais simplicidade',
        'conectar decisão diária com intenção maior',
        'evitar comunicação genérica de propósito',
      ],
      keyIdeas: [
        'Pessoas seguem melhor quando entendem o motivo por trás do movimento.',
        'Clareza de porquê reduz ruído de execução.',
        'Propósito só tem força quando aparece nas escolhas concretas.',
      ],
      guidedQuestions: [
        'Seu time entende o motivo da prioridade atual?',
        'Que decisão recente comunicou melhor seu porquê do que qualquer discurso?',
        'Onde a falta de sentido está virando retrabalho?',
      ],
      practicalUse: 'Use antes de alinhar uma iniciativa importante: escreva o porquê em uma frase simples e teste se ele orienta decisão prática.',
      relatedArticleSlugs: [
        'artigo-alinhamento-real-nasce-de-expectativa-clara',
        'artigo-quando-a-lideranca-para-de-centralizar-tudo',
        'artigo-equipes-maduras-precisam-de-contexto-melhor',
      ],
      relatedShortEditionSlugs: [
        'rituais-simples-para-alinhamento',
      ],
      purchaseUrl: 'https://www.amazon.com.br/s?k=Comece+pelo+porqu%C3%AA+Simon+Sinek',
      purchaseProvider: 'Amazon',
      isFeatured: false,
      displayOrder: 3,
    },
    {
      slug: 'sete-habitos-pessoas-altamente-eficazes',
      title: 'Os 7 hábitos das pessoas altamente eficazes',
      subtitle: 'princípios para consistência pessoal e profissional',
      author: 'Stephen Covey',
      description: 'Um livro de base para quem quer transformar intenção em prática sem depender de picos de motivação.',
      coverUrl: '/assets/img/books/sete-habitos-pessoas-altamente-eficazes.svg',
      coverAlt: 'Capa editorial do livro Os 7 hábitos das pessoas altamente eficazes',
      category: 'produtividade',
      level: BookLevel.ESSENTIAL,
      readTime: 'leitura de base',
      whyRead: 'Porque reforça responsabilidade, priorização e construção de consistência. É uma boa ponte entre desenvolvimento pessoal e impacto profissional.',
      whatYouWillLearn: [
        'organizar escolhas por princípios',
        'proteger o importante antes que vire urgente',
        'sustentar acordos consigo e com outras pessoas',
      ],
      keyIdeas: [
        'Consistência nasce de escolha repetida, não de intensidade ocasional.',
        'O importante precisa de espaço antes da urgência.',
        'Influência começa pelo que você consegue sustentar.',
      ],
      guidedQuestions: [
        'Que hábito seu está criando ruído para outras pessoas?',
        'Qual prioridade importante está ficando sempre para depois?',
        'Onde você precisa trocar reação por escolha consciente?',
      ],
      practicalUse: 'Escolha um hábito da leitura e transforme em ritual pequeno por uma semana, sem tentar reformar a rotina inteira.',
      relatedArticleSlugs: [
        'artigo-consistencia-vale-mais-que-picos-de-performance',
        'artigo-produtividade-do-lider',
        'artigo-prioridade-boa-reduz-mais-ruido-do-que-tarefa',
      ],
      relatedShortEditionSlugs: [
        'crescimento-sem-virar-urgencia-cronica',
        'rituais-simples-para-alinhamento',
      ],
      purchaseUrl: 'https://www.amazon.com.br/s?k=Os+7+h%C3%A1bitos+das+pessoas+altamente+eficazes',
      purchaseProvider: 'Amazon',
      isFeatured: false,
      displayOrder: 4,
    },
    {
      slug: 'mindset',
      title: 'Mindset',
      subtitle: 'como crenças moldam aprendizado e desempenho',
      author: 'Carol Dweck',
      description: 'Uma leitura para observar como a forma de interpretar erro, esforço e crescimento muda a qualidade da evolução.',
      coverUrl: '/assets/img/books/mindset.svg',
      coverAlt: 'Capa editorial do livro Mindset',
      category: 'mentalidade',
      level: BookLevel.DEEPENING,
      readTime: '5h de leitura',
      whyRead: 'Porque ajuda líderes a construir ambientes onde aprendizado não depende de defesa constante. Também ajuda na leitura da própria carreira.',
      whatYouWillLearn: [
        'perceber padrões defensivos diante de erro',
        'estimular aprendizado sem romantizar dificuldade',
        'trocar prova de valor por evolução consistente',
      ],
      keyIdeas: [
        'A forma como interpretamos erro muda a forma como aprendemos.',
        'Ambientes maduros reduzem defesa e aumentam repertório.',
        'Crescimento real precisa de prática, feedback e menos identidade ameaçada.',
      ],
      guidedQuestions: [
        'Que crítica você costuma transformar em ameaça?',
        'Como seu time lê erro: como dado ou como julgamento?',
        'Onde provar valor está atrapalhando aprendizado?',
      ],
      practicalUse: 'Use após feedbacks difíceis: separe o dado útil da reação defensiva e defina um ajuste pequeno.',
      relatedArticleSlugs: [
        'artigo-custo-de-tentar-provar-valor-o-tempo-todo',
        'artigo-feedback-que-desenvolve',
        'artigo-menos-defesa-mais-discernimento',
      ],
      relatedShortEditionSlugs: [
        'repertorio-melhor-decisoes-melhores',
      ],
      purchaseUrl: 'https://www.amazon.com.br/s?k=Mindset+Carol+Dweck',
      purchaseProvider: 'Amazon',
      isFeatured: false,
      displayOrder: 5,
    },
    {
      slug: 'essencialismo',
      title: 'Essencialismo',
      subtitle: 'menos volume, mais escolha',
      author: 'Greg McKeown',
      description: 'Uma leitura para quem sente que a agenda cresceu mais rápido que o critério.',
      coverUrl: '/assets/img/books/essencialismo.svg',
      coverAlt: 'Capa editorial do livro Essencialismo',
      category: 'produtividade',
      level: BookLevel.PROVOCATION,
      readTime: '4h de leitura',
      whyRead: 'Porque devolve uma pergunta incômoda: o que realmente merece espaço? A leitura ajuda a cortar excesso com elegância e responsabilidade.',
      whatYouWillLearn: [
        'dizer não com mais critério',
        'diferenciar oportunidade de distração',
        'proteger energia para o que tem maior retorno',
      ],
      keyIdeas: [
        'Nem tudo que é bom é essencial agora.',
        'Escolha madura exige renúncia visível.',
        'Foco é uma decisão de desenho, não apenas força de vontade.',
      ],
      guidedQuestions: [
        'Que compromisso perdeu sentido, mas continua ocupando energia?',
        'Qual sim recente enfraqueceu sua direção?',
        'O que precisa sair para o trabalho importante respirar?',
      ],
      practicalUse: 'Revise sua próxima semana e remova um compromisso de baixo retorno antes de adicionar qualquer nova meta.',
      relatedArticleSlugs: [
        'artigo-o-que-cortar-antes-de-tentar-fazer-mais',
        'artigo-quando-dizer-sim-enfraquece-sua-trajetoria',
        'artigo-proteger-energia-para-o-que-realmente-importa',
      ],
      relatedShortEditionSlugs: [
        'proteger-tempo-de-pensamento-estrategico',
      ],
      purchaseUrl: 'https://www.amazon.com.br/s?k=Essencialismo+Greg+McKeown',
      purchaseProvider: 'Amazon',
      isFeatured: false,
      displayOrder: 6,
    },
    {
      slug: 'conversas-dificeis',
      title: 'Conversas difíceis',
      subtitle: 'como atravessar conversas que importam',
      author: 'Douglas Stone, Bruce Patton e Sheila Heen',
      description: 'Um guia para conversas onde verdade, vínculo e responsabilidade precisam coexistir.',
      coverUrl: '/assets/img/books/conversas-dificeis.svg',
      coverAlt: 'Capa editorial do livro Conversas difíceis',
      category: 'gestão de equipes',
      level: BookLevel.DEEPENING,
      readTime: 'leitura de aprofundamento',
      whyRead: 'Porque grande parte da liderança acontece em conversas que não podem ser evitadas. A leitura ajuda a entrar nelas com menos defesa e mais precisão.',
      whatYouWillLearn: [
        'separar fatos, interpretações e intenção',
        'conduzir conversas com mais segurança',
        'preservar vínculo sem fugir de responsabilidade',
      ],
      keyIdeas: [
        'Toda conversa difícil carrega mais de uma conversa ao mesmo tempo.',
        'Escutar melhor não significa concordar com tudo.',
        'Clareza e cuidado podem andar juntos.',
      ],
      guidedQuestions: [
        'Que conversa você está adiando por medo de piorar o clima?',
        'Qual história você está contando sobre a intenção da outra pessoa?',
        'Como seria dizer o necessário sem transformar a conversa em julgamento?',
      ],
      practicalUse: 'Antes de uma conversa sensível, escreva fato, impacto e pedido em três linhas separadas.',
      relatedArticleSlugs: [
        'artigo-clareza-interna-antes-da-conversa-dificil',
        'artigo-corrigir-rota-sem-humilhar-ninguem',
        'artigo-feedback-que-desenvolve',
      ],
      relatedShortEditionSlugs: [
        'clareza-antes-da-reacao',
      ],
      purchaseUrl: null,
      purchaseProvider: null,
      isFeatured: false,
      displayOrder: 7,
    },
    {
      slug: 'coragem-de-ser-imperfeito',
      title: 'A coragem de ser imperfeito',
      subtitle: 'vulnerabilidade, presença e maturidade emocional',
      author: 'Brené Brown',
      description: 'Uma leitura para pensar presença, coragem e abertura sem confundir vulnerabilidade com exposição desmedida.',
      coverUrl: '/assets/img/books/coragem-de-ser-imperfeito.svg',
      coverAlt: 'Capa editorial do livro A coragem de ser imperfeito',
      category: 'mentalidade',
      level: BookLevel.PROVOCATION,
      readTime: '5h de leitura',
      whyRead: 'Porque liderança também exige lidar com insegurança, vergonha e necessidade de aprovação sem deixar que isso dirija a postura.',
      whatYouWillLearn: [
        'reconhecer o custo da autoproteção excessiva',
        'diferenciar vulnerabilidade de exposição sem critério',
        'sustentar presença sem performar controle o tempo todo',
      ],
      keyIdeas: [
        'Coragem prática aparece quando a pessoa age sem garantia de aprovação.',
        'Vulnerabilidade madura não é excesso de exposição; é presença honesta.',
        'A busca constante por blindagem emocional empobrece relação e decisão.',
      ],
      guidedQuestions: [
        'Onde sua necessidade de parecer pronto limita sua aprendizagem?',
        'Que parte da sua liderança está mais preocupada com imagem do que com presença?',
        'Como seria agir com mais honestidade sem perder critério?',
      ],
      practicalUse: 'Escolha uma situação em que você costuma se defender rápido e pratique nomear a incerteza antes de responder.',
      relatedArticleSlugs: [
        'artigo-presenca-madura-nao-precisa-disputar-atencao',
        'artigo-visibilidade-madura-sem-performar-palco',
        'artigo-maturidade-profissional-aparece-antes-do-cargo',
      ],
      relatedShortEditionSlugs: [
        'crescimento-sem-virar-urgencia-cronica',
      ],
      purchaseUrl: 'https://www.amazon.com.br/s?k=A+coragem+de+ser+imperfeito+Bren%C3%A9+Brown',
      purchaseProvider: 'Amazon',
      isFeatured: false,
      displayOrder: 8,
    },
  ];

  const bookMap = new Map<string, string>();

  for (const book of books) {
    const record = await prisma.book.upsert({
      where: { slug: book.slug },
      update: {
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        description: book.description,
        coverUrl: book.coverUrl,
        coverAlt: book.coverAlt,
        category: book.category,
        level: book.level,
        readTime: book.readTime,
        whyRead: book.whyRead,
        whatYouWillLearn: book.whatYouWillLearn,
        keyIdeas: book.keyIdeas,
        guidedQuestions: book.guidedQuestions,
        practicalUse: book.practicalUse,
        relatedArticleSlugs: book.relatedArticleSlugs,
        relatedShortEditionSlugs: book.relatedShortEditionSlugs,
        purchaseUrl: book.purchaseUrl,
        purchaseLabel: book.purchaseUrl ? 'ver opção de compra' : null,
        purchaseProvider: book.purchaseProvider,
        isFeatured: book.isFeatured,
        isActive: true,
        displayOrder: book.displayOrder,
      },
      create: {
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        author: book.author,
        description: book.description,
        coverUrl: book.coverUrl,
        coverAlt: book.coverAlt,
        category: book.category,
        level: book.level,
        readTime: book.readTime,
        whyRead: book.whyRead,
        whatYouWillLearn: book.whatYouWillLearn,
        keyIdeas: book.keyIdeas,
        guidedQuestions: book.guidedQuestions,
        practicalUse: book.practicalUse,
        relatedArticleSlugs: book.relatedArticleSlugs,
        relatedShortEditionSlugs: book.relatedShortEditionSlugs,
        purchaseUrl: book.purchaseUrl,
        purchaseLabel: book.purchaseUrl ? 'ver opção de compra' : null,
        purchaseProvider: book.purchaseProvider,
        isFeatured: book.isFeatured,
        isActive: true,
        displayOrder: book.displayOrder,
      },
    });

    bookMap.set(record.slug, record.id);
  }

  const featuredBookId = bookMap.get('gestor-eficaz');

  if (featuredBookId) {
    await prisma.bookNote.upsert({
      where: {
        userId_bookId_promptKey: {
          userId: admin.id,
          bookId: featuredBookId,
          promptKey: 'main_idea',
        },
      },
      update: {
        content: 'A principal lembrança para mim é que tempo precisa ser tratado como decisão editorial: se tudo entra, nada realmente conduz.',
        status: BookNoteStatus.APPROVED,
        isHighlighted: true,
      },
      create: {
        userId: admin.id,
        bookId: featuredBookId,
        promptKey: 'main_idea',
        content: 'A principal lembrança para mim é que tempo precisa ser tratado como decisão editorial: se tudo entra, nada realmente conduz.',
        status: BookNoteStatus.APPROVED,
        isHighlighted: true,
      },
    });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  await prisma.readingProgress.upsert({
    where: {
      userId_articleId: {
        userId: admin.id,
        articleId: articlePressure.id,
      },
    },
    update: {
      progressPercent: 85,
      status: 'IN_PROGRESS',
      lastReadAt: oneHourAgo,
      completedAt: null,
    },
    create: {
      userId: admin.id,
      articleId: articlePressure.id,
      progressPercent: 85,
      status: 'IN_PROGRESS',
      lastReadAt: oneHourAgo,
      completedAt: null,
    },
  });

  await prisma.readingProgress.upsert({
    where: {
      userId_articleId: {
        userId: admin.id,
        articleId: articleStrategy.id,
      },
    },
    update: {
      progressPercent: 100,
      status: 'COMPLETED',
      lastReadAt: threeDaysAgo,
      completedAt: threeDaysAgo,
    },
    create: {
      userId: admin.id,
      articleId: articleStrategy.id,
      progressPercent: 100,
      status: 'COMPLETED',
      lastReadAt: threeDaysAgo,
      completedAt: threeDaysAgo,
    },
  });

  await prisma.readingProgress.upsert({
    where: {
      userId_shortEditionId: {
        userId: admin.id,
        shortEditionId: shortClarity.id,
      },
    },
    update: {
      progressPercent: 100,
      status: 'COMPLETED',
      lastReadAt: fiveDaysAgo,
      completedAt: fiveDaysAgo,
    },
    create: {
      userId: admin.id,
      shortEditionId: shortClarity.id,
      progressPercent: 100,
      status: 'COMPLETED',
      lastReadAt: fiveDaysAgo,
      completedAt: fiveDaysAgo,
    },
  });

  await prisma.readingProgress.upsert({
    where: {
      userId_shortEditionId: {
        userId: admin.id,
        shortEditionId: shortRituals.id,
      },
    },
    update: {
      progressPercent: 42,
      status: 'IN_PROGRESS',
      lastReadAt: oneDayAgo,
      completedAt: null,
    },
    create: {
      userId: admin.id,
      shortEditionId: shortRituals.id,
      progressPercent: 42,
      status: 'IN_PROGRESS',
      lastReadAt: oneDayAgo,
      completedAt: null,
    },
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
