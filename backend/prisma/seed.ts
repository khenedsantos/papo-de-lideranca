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
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'ChangeMe123!';
  const adminName = process.env.ADMIN_SEED_NAME ?? 'Admin Papo';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
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

  await prisma.article.upsert({
    where: { slug: 'artigo-disciplina-emocional-sob-pressao' },
    update: {
      title: 'disciplina emocional sob pressão',
      excerpt: 'Presença, pausa e critério quando o ambiente acelera mais do que deveria.',
      content:
        '## Clareza sob pressão\n\nDecidir bem exige separar contexto de impulso. Este artigo aprofunda como proteger o time de reações precipitadas e organizar a conversa com mais presença.',
      readTimeMinutes: 5,
      isPublished: true,
      publishedAt: new Date('2026-04-18T12:00:00.000Z'),
      categoryId: categoryMap.get('mentalidade')!,
    },
    create: {
      title: 'disciplina emocional sob pressão',
      slug: 'artigo-disciplina-emocional-sob-pressao',
      excerpt: 'Presença, pausa e critério quando o ambiente acelera mais do que deveria.',
      content:
        '## Clareza sob pressão\n\nDecidir bem exige separar contexto de impulso. Este artigo aprofunda como proteger o time de reações precipitadas e organizar a conversa com mais presença.',
      readTimeMinutes: 5,
      isPublished: true,
      publishedAt: new Date('2026-04-18T12:00:00.000Z'),
      categoryId: categoryMap.get('mentalidade')!,
    },
  });

  await prisma.article.upsert({
    where: { slug: 'artigo-proteger-tempo-de-pensamento-estrategico' },
    update: {
      title: 'proteger tempo de pensamento estratégico',
      excerpt: 'Um texto para recuperar profundidade num calendário dominado por reatividade.',
      content:
        '## Menos reatividade\n\nQuando todo o tempo vira resposta, a liderança perde qualidade de leitura. Este artigo organiza práticas para preservar blocos de pensamento estratégico.',
      readTimeMinutes: 5,
      isPublished: true,
      publishedAt: new Date('2026-04-17T12:00:00.000Z'),
      categoryId: categoryMap.get('produtividade')!,
    },
    create: {
      title: 'proteger tempo de pensamento estratégico',
      slug: 'artigo-proteger-tempo-de-pensamento-estrategico',
      excerpt: 'Um texto para recuperar profundidade num calendário dominado por reatividade.',
      content:
        '## Menos reatividade\n\nQuando todo o tempo vira resposta, a liderança perde qualidade de leitura. Este artigo organiza práticas para preservar blocos de pensamento estratégico.',
      readTimeMinutes: 5,
      isPublished: true,
      publishedAt: new Date('2026-04-17T12:00:00.000Z'),
      categoryId: categoryMap.get('produtividade')!,
    },
  });

  await prisma.shortEdition.upsert({
    where: { slug: 'clareza-antes-da-reacao' },
    update: {
      title: 'clareza antes da reação',
      excerpt: 'Uma leitura curta sobre como desacelerar o impulso e organizar direção.',
      ideaCentral:
        'Quando a pressão sobe, a liderança mais útil não é a que reage primeiro. É a que consegue nomear o que já é fato, o que ainda é leitura e o que não precisa virar ruído.',
      whatMatters: [
        'Nomear o que já está claro reduz ansiedade coletiva.',
        'Dizer o que ainda está aberto preserva confiança.',
        'Nem toda urgência merece entrar na sala de decisão.',
      ],
      applyToday: [
        'Abra a próxima conversa difícil listando fatos antes de hipóteses.',
        'Feche com uma direção curta, não com excesso de cenários.',
        'Evite transformar leitura provisória em posicionamento definitivo.',
      ],
      quoteOfWeek: 'Liderança madura não acelera ansiedade. Ela organiza a leitura do que importa.',
      readTimeMinutes: 2,
      isPublished: true,
      publishedAt: new Date('2026-04-19T09:00:00.000Z'),
      categoryId: categoryMap.get('lideranca')!,
    },
    create: {
      title: 'clareza antes da reação',
      slug: 'clareza-antes-da-reacao',
      excerpt: 'Uma leitura curta sobre como desacelerar o impulso e organizar direção.',
      ideaCentral:
        'Quando a pressão sobe, a liderança mais útil não é a que reage primeiro. É a que consegue nomear o que já é fato, o que ainda é leitura e o que não precisa virar ruído.',
      whatMatters: [
        'Nomear o que já está claro reduz ansiedade coletiva.',
        'Dizer o que ainda está aberto preserva confiança.',
        'Nem toda urgência merece entrar na sala de decisão.',
      ],
      applyToday: [
        'Abra a próxima conversa difícil listando fatos antes de hipóteses.',
        'Feche com uma direção curta, não com excesso de cenários.',
        'Evite transformar leitura provisória em posicionamento definitivo.',
      ],
      quoteOfWeek: 'Liderança madura não acelera ansiedade. Ela organiza a leitura do que importa.',
      readTimeMinutes: 2,
      isPublished: true,
      publishedAt: new Date('2026-04-19T09:00:00.000Z'),
      categoryId: categoryMap.get('lideranca')!,
    },
  });

  await prisma.shortEdition.upsert({
    where: { slug: 'rituais-simples-para-alinhamento' },
    update: {
      title: 'rituais simples para alinhamento',
      excerpt: 'Ritmo leve para o time trabalhar melhor sem transformar tudo em processo.',
      ideaCentral:
        'Equipes não precisam de excesso de cerimônia para manter alinhamento. Precisam de poucos rituais, com cadência confiável e função clara.',
      whatMatters: [
        'Check-ins curtos reduzem dispersão.',
        'Checkpoints evitam surpresa tardia.',
        'Revisões leves fecham aprendizado sem peso burocrático.',
      ],
      applyToday: [
        'Use 10 minutos no começo da semana para alinhar prioridade, risco e dono.',
        'Revise travas no meio da semana antes de elas crescerem.',
        'Feche a semana com uma revisão curta do que funcionou e do que precisa de ajuste.',
      ],
      quoteOfWeek: 'Quando o ritmo é claro, a equipe precisa de menos controle para continuar bem.',
      readTimeMinutes: 3,
      isPublished: true,
      publishedAt: new Date('2026-04-19T10:00:00.000Z'),
      categoryId: categoryMap.get('gestao-de-equipes')!,
    },
    create: {
      title: 'rituais simples para alinhamento',
      slug: 'rituais-simples-para-alinhamento',
      excerpt: 'Ritmo leve para o time trabalhar melhor sem transformar tudo em processo.',
      ideaCentral:
        'Equipes não precisam de excesso de cerimônia para manter alinhamento. Precisam de poucos rituais, com cadência confiável e função clara.',
      whatMatters: [
        'Check-ins curtos reduzem dispersão.',
        'Checkpoints evitam surpresa tardia.',
        'Revisões leves fecham aprendizado sem peso burocrático.',
      ],
      applyToday: [
        'Use 10 minutos no começo da semana para alinhar prioridade, risco e dono.',
        'Revise travas no meio da semana antes de elas crescerem.',
        'Feche a semana com uma revisão curta do que funcionou e do que precisa de ajuste.',
      ],
      quoteOfWeek: 'Quando o ritmo é claro, a equipe precisa de menos controle para continuar bem.',
      readTimeMinutes: 3,
      isPublished: true,
      publishedAt: new Date('2026-04-19T10:00:00.000Z'),
      categoryId: categoryMap.get('gestao-de-equipes')!,
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
