# Papo de Liderança Backend

Base de API em NestJS para autenticação, conteúdo editorial, assinaturas e progresso de leitura.

## Pré-requisitos

- Node.js 24+
- npm 11+
- Docker + Docker Compose

## Configuração

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Ajuste `JWT_SECRET` e, se quiser, as credenciais de seed.

## Subir com Docker

```bash
docker compose up --build
```

Isso sobe:

- `postgres` em `localhost:5432`
- `api` em `localhost:3000`

## Instalação local

```bash
npm install
```

No PowerShell/Windows, se o alias `npm` causar atrito, use `npm.cmd`.

## Prisma

Gerar client:

```bash
npm run prisma:generate
```

Criar e aplicar migration local:

```bash
npm run prisma:migrate -- --name init
```

Rodar seed:

```bash
npm run seed
```

## Rodar a API localmente

```bash
npm run start:dev
```

## Scripts principais

- `npm run build`
- `npm run start:dev`
- `npm run start:prod`
- `npm run lint`
- `npm run format`
- `npm run prisma:generate`
- `npm run prisma:migrate -- --name init`
- `npm run prisma:studio`
- `npm run seed`

## Rotas iniciais

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/categories`
- `GET /api/v1/articles`
- `GET /api/v1/articles/:slug`
- `GET /api/v1/short-editions`
- `GET /api/v1/short-editions/:slug`

## Seed inicial

O seed cria:

- 5 categorias alinhadas ao front atual
- 1 usuário admin local
- 1 assinatura `PREMIUM` ativa
- 2 artigos publicados
- 2 edições curtas publicadas

Credenciais padrão do seed:

- e-mail: `admin@papodelideranca.local`
- senha: `ChangeMe123!`

Troque essas credenciais no `.env` antes de usar fora do ambiente local.
