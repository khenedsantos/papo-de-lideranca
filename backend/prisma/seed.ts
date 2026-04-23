import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      name: 'liderança',
      slug: 'lideranca',
      description: 'Critério, influência e direção para liderar com mais clareza.',
    },
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
      name: 'mentalidade',
      slug: 'mentalidade',
      description: 'Modelos mentais para decidir melhor sob pressão e ambiguidade.',
    },
    {
      name: 'produtividade',
      slug: 'produtividade',
      description: 'Energia, foco e estrutura para trabalho intelectual de maior qualidade.',
    },
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
  const adminName = process.env.ADMIN_SEED_NAME ?? 'Admin Papo';
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
      slug: 'artigo-autoridade-sem-dureza',
      title: 'autoridade sem dureza',
      excerpt: 'Firmeza, clareza de direção e presença suficiente para liderar sem endurecer o ambiente.',
      readTimeMinutes: 6,
      categorySlug: 'lideranca',
      publishedAt: new Date('2026-04-10T12:00:00.000Z'),
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
      slug: 'artigo-feedback-que-desenvolve',
      title: 'feedback que desenvolve',
      excerpt: 'Um texto sobre feedback com clareza, responsabilidade e evolução real no time.',
      readTimeMinutes: 7,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-04-12T12:00:00.000Z'),
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
      slug: 'artigo-mentalidade-que-gera-influencia',
      title: 'a mentalidade que gera influência',
      excerpt: 'Critério interno, presença e postura para ampliar influência sem performance teatral.',
      readTimeMinutes: 5,
      categorySlug: 'mentalidade',
      publishedAt: new Date('2026-04-14T12:00:00.000Z'),
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
      slug: 'artigo-relevancia-sem-autopromocao',
      title: 'relevância sem autopromoção vazia',
      excerpt: 'Como tornar valor mais legível sem transformar presença profissional em ruído.',
      readTimeMinutes: 5,
      categorySlug: 'carreira',
      publishedAt: new Date('2026-04-16T12:00:00.000Z'),
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
      slug: 'artigo-rituais-simples-para-alinhamento',
      title: 'rituais simples que aumentam alinhamento sem engessar a equipe',
      excerpt: 'Poucos rituais, ritmo claro e alinhamento útil sem excesso de processo.',
      readTimeMinutes: 5,
      categorySlug: 'gestao-de-equipes',
      publishedAt: new Date('2026-04-19T12:00:00.000Z'),
    },
    {
      slug: 'artigo-proteger-tempo-de-pensamento-estrategico',
      title: 'como proteger tempo de pensamento estratégico na rotina do líder',
      excerpt: 'Um texto para recuperar profundidade num calendário dominado por reatividade.',
      readTimeMinutes: 5,
      categorySlug: 'produtividade',
      publishedAt: new Date('2026-04-17T12:00:00.000Z'),
    },
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
    },
    {
      slug: 'rituais-simples-para-alinhamento',
      title: 'rituais simples para alinhamento',
      excerpt: 'Ritmo leve para o time trabalhar melhor sem transformar tudo em processo.',
      categorySlug: 'gestao-de-equipes',
      readTimeMinutes: 3,
      publishedAt: new Date('2026-04-19T10:00:00.000Z'),
    },
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
