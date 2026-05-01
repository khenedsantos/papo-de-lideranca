# Auditoria interna - Papo de Liderança

Data: 2026-04-30

## 1. Pasta servida pelo front

- Origem validada: `http://127.0.0.1:5500`.
- A raiz servida pelo servidor em `5500` é `output/`.
- Evidências:
  - `http://127.0.0.1:5500/app/dashboard.html` retorna `200`.
  - `http://127.0.0.1:5500/assets/js/api.js` retorna `200`.
  - `http://127.0.0.1:5500/output/app/dashboard.html` retorna `404`.
  - `http://127.0.0.1:5500/README.md` retorna `404`.

## 2. Pastas existentes

- `app`: não existe na raiz deste checkout.
- `assets`: não existe na raiz deste checkout.
- `landing-newsletter`: não existe na raiz deste checkout.
- `auth`: não existe na raiz deste checkout.
- `legal`: não existe na raiz deste checkout.
- `pages`: não existe na raiz deste checkout.
- `output/app`: existe e é servida como `/app`.
- `output/assets`: existe e é servida como `/assets`.
- `output/landing-newsletter`: existe e é servida como `/landing-newsletter`.
- `output/auth`: existe e é servida como `/auth`.
- `output/legal`: existe e é servida como `/legal`.
- `output/pages`: existe e é servida como `/pages`.

## 3. Arquivos editados x arquivos carregados

- Os arquivos que o navegador carrega são os de `output/app` e `output/assets`.
- As correções foram feitas no front efetivamente servido: `output/app/**/*.html`, `output/assets/js/**/*.js` e `output/assets/css/**/*.css`.
- Não há pasta raiz `app/` ou `assets/` concorrente neste checkout, então a ambiguidade real era entender que `output/` é a raiz pública.

## 4. Origem e sessão

- Origem operacional recomendada: `http://127.0.0.1:5500`.
- Evitar alternar com `http://localhost:5500`, porque o `localStorage` é separado por origem.
- Chave de sessão usada pelo front: `papo_lideranca_session`.
- O JWT é salvo nessa chave e enviado como `Authorization: Bearer <token>` nas rotas protegidas.
- Sem JWT, páginas internas redirecionam para `../auth/login.html`, como esperado.

## 5. API base

- `API_BASE_URL`: `http://127.0.0.1:3001/api/v1`.
- Não foi encontrada mistura operacional de `localhost` no `api.js` servido.
- `assets/js/api.js` agora centraliza `apiFetch`, anexa token automaticamente quando há sessão e limpa sessão em `401`.
- `assets/js/session.js` foi criado como camada fina de compatibilidade sobre `PapoAuth`.

## 6. Backend e endpoints

O backend estava rodando, mas inicialmente servia um build antigo sem `type` e `staticPath` em artigos e edições curtas. Após `npm run build`, o processo em `3001` foi reiniciado e passou a expor o contrato atualizado.

Status sem JWT:

- `GET /categories`: `200`.
- `GET /articles`: `200`, com `type: "article"` e `staticPath`.
- `GET /short-editions`: `200`, com `type: "short-edition"` e `staticPath`.
- `GET /reading-progress/summary`: `401`, esperado sem JWT.
- `GET /users/me`: `401`, esperado sem JWT.

Status com JWT válido:

- `POST /auth/login`: `201`, retorna token.
- `GET /users/me`: `200`, retorna usuário real com `name`, `email`, `avatarUrl` e `role`.
- `GET /users/account-summary`: `200`, retorna usuário e assinatura `PREMIUM/ACTIVE`.
- `GET /categories`: `200`, 5 categorias.
- `GET /articles`: `200`, 50 artigos.
- `GET /short-editions`: `200`, 6 edições curtas.
- `GET /reading-progress`: `200`.
- `GET /reading-progress/summary`: `200`.
- `POST /reading-progress` com alias `short-editions`: `201`, normaliza para `SHORT_EDITION`.
- `PATCH /users/me` com `email`: `400`, rejeição controlada: `Alteração de e-mail ainda não está disponível por esta rota.`

## 7. CORS

- `backend/src/main.ts` permite:
  - `http://127.0.0.1:5500`
  - `http://localhost:5500`
- Preflight validado em `OPTIONS /api/v1/users/me`:
  - status `204`.
  - `Access-Control-Allow-Origin: http://127.0.0.1:5500`.
  - `Access-Control-Allow-Headers: Authorization,Content-Type`.
  - `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`.

## 8. Scripts por página

- `dashboard.html`: `api.js`, `session.js`, `app-shell.js`, `dashboard.js`.
- `biblioteca.html`: `api.js`, `session.js`, `app-shell.js`, `biblioteca.js`; não carrega `dashboard.js`.
- `leitura.html`: `api.js`, `session.js`, `app-shell.js`, `reader.js`; não carrega `dashboard.js`.
- `perfil.html`: `api.js`, `session.js`, `app-shell.js`, `profile.js`.
- `assinatura.html`: `api.js`, `session.js`, `app-shell.js`, `subscription.js`.
- `progresso.html`: `api.js`, `session.js`, `app-shell.js`, `progresso.js`.
- `edicoes-curtas.html`: `api.js`, `session.js`, `app-shell.js`.
- Artigos e edições estáticas aninhadas usam `session.js`, `app-shell.js` e `reading-progress.js`.

## 9. Correções aplicadas

- Formalizada a camada `session.js`.
- `app-shell.js` consolidado para proteção, header interno, logout e fechamento editorial em páginas estáticas.
- `api.js` centraliza token, `apiFetch`, `apiFetchFormData`, erros e rotas estáticas.
- `perfil.html` passou a usar `profile.js`.
- `assinatura.html` passou a usar `subscription.js`.
- `biblioteca.js` respeita `staticPath` da API e normaliza edições curtas.
- `reader.js` normaliza `short-edition`, evita usar resumo como corpo e redireciona para página estática quando existe.
- `reading-progress.js` e `reader.js` registram progresso por milestones simples.
- Backend passou a retornar `type`, `summary` e `staticPath` em artigos e edições curtas.
- Backend passou a aceitar aliases de edições curtas em progresso: `short_edition`, `shortEdition`, `edition`, `short-editions`.
- `PATCH /users/me` mantém e-mail protegido.
- Cache busting atualizado para `premium-20260430b`.

## 10. Validação no navegador

Origem testada: `http://127.0.0.1:5500`.

- Sem sessão: páginas internas redirecionam para `auth/login.html`.
- Login local: validado com usuário admin local.
- Dashboard: carrega com primeiro nome real (`Khened`), resumo de conta, continuidade e continuar leitura.
- Biblioteca: carrega 50 artigos + 6 edições curtas.
- Biblioteca: filtro `edições curtas` reduz para 6 leituras, exibe botão `limpar filtros` e não mostra cards de artigo.
- Perfil: carrega usuário real, e-mail somente leitura e ação `solicitar alteração`.
- Assinatura: carrega plano/status reais e suporte editorial, sem billing falso.
- Progresso: carrega resumo, ritmo da semana, continuidade, leituras concluídas e meta semanal.
- `leitura.html?type=short-edition&slug=clareza-antes-da-reacao`: redireciona para a estática `app/edicoes/clareza-antes-da-reacao.html`, como esperado.
- Erros de console nas páginas testadas: `0`.

## 11. Encoding

- Varredura ampliada em `backend` e `output` para HTML, JS, CSS, TS, JSON e MD não encontrou:
  - `Ã`
  - `Â`
  - `â€”`
  - `Ãƒ`
  - `�`
  - entidades antigas como `&ccedil;`, `&atilde;`, `&aacute;`
- BOM UTF-8 removido dos arquivos restantes em `output` público, incluindo `output/auth`, `output/pages`, `output/legal`, `output/landing-newsletter` e alguns artigos públicos antigos.
- Varredura final: `0` arquivos com BOM e `0` arquivos com padrões de mojibake, excluindo o próprio relatório de auditoria porque ele documenta literalmente os padrões procurados.
- O arquivo `output/app/edicoes/rituais-simples-para-alinhamento.html` foi conferido contra os problemas reportados e está com textos corretos: `memória`, `silencioso`, `dispersão`, `ruído`, `revisão`, `mínima`, `ritmo é claro`.
- Observação: o PowerShell deste ambiente pode exibir UTF-8 como mojibake na saída do terminal, mas a leitura por Node e o navegador renderizam corretamente.

## 12. Validações técnicas

- `npm run lint`: passou.
- `npm run build`: passou.
- `npm run test --if-present`: passou sem executar testes, pois não há script `test` definido.
- `npx prisma validate`: passou.
- `npx prisma migrate status`: passou; banco `papo_de_lideranca` está atualizado.

Avisos:

- Prisma avisa que `package.json#prisma` será removido no Prisma 7. Não foi alterado agora para evitar mudança estrutural fora do escopo.
- O sandbox bloqueou inicialmente o download/verificação do engine do Prisma em `binaries.prisma.sh`; a validação passou após permissão fora do sandbox.

## 13. Problemas resolvidos

- Ambiguidade da pasta servida: resolvida, `output/` é a raiz pública.
- Backend servindo build antigo: resolvido com rebuild e restart em `3001`.
- Contrato incompleto de artigos/edições curtas: resolvido com `type`, `summary` e `staticPath`.
- Scripts genéricos em perfil/assinatura: resolvido com `profile.js` e `subscription.js`.
- Normalização de edições curtas em progresso/leitura: resolvida.
- Risco de `dashboard.js` fora do dashboard: não encontrado após correção.
- E-mail editável diretamente: bloqueado no backend e tratado como solicitação no front.
- Biblioteca com artigos e edições curtas: validada com API real.
- Progresso real: validado com API e navegação.

## 14. Limitações restantes

- Upload de avatar não foi reexecutado no navegador para não trocar a imagem real do admin sem necessidade; o endpoint existe e o perfil consome `PATCH /users/me/avatar`.
- Não há suíte automatizada de testes; `npm run test --if-present` não executou nada.
- O aviso de configuração Prisma para Prisma 7 permanece como débito técnico futuro.
- O projeto ainda tem arquivos antigos `.new` e scripts legados não carregados, que geram ruído de manutenção, mas não quebram a experiência atual.
- É importante manter o uso em `127.0.0.1`, porque alternar para `localhost` cria outra sessão no navegador.

## Rodada final 10/10

Data da rodada: 2026-05-01.

### Resumo executivo

- A raiz pública servida continua sendo `output/`; as alterações finais foram feitas apenas em arquivos servidos ou em relatório.
- Os seis arquivos legados autorizados foram removidos com validação de caminho dentro da raiz do projeto.
- Nenhum HTML/CSS/JS servido referencia os arquivos removidos.
- As páginas principais foram revalidadas no navegador com sessão real, API real e JWT real.
- O mobile foi revalidado em `390`, `430`, `768` e `1024` px: sem overflow horizontal.
- O header interno e o logout ficaram visíveis e funcionais no mobile das páginas internas.
- A biblioteca segue carregando 56 itens, com busca e filtros funcionais.
- Uma leitura estática nova registrou progresso real: `10%`, status `IN_PROGRESS`.
- Upload de avatar já havia sido validado de forma controlada: `PATCH /users/me/avatar` retornou `200`, o avatar visual foi restaurado e o `avatarUrl` atual aponta para arquivo existente.

### Arquivos removidos

- `output/app/edicoes-curtas.new.html`
- `output/assets/css/dashboard.new.css`
- `output/assets/js/dashboard.new.js`
- `output/pages/dashboard.new.html`
- `backend/.codex-backend.err.log`
- `backend/.codex-backend.out.log`

Motivo da remoção:

- Eram arquivos locais legados, temporários ou de log.
- Não estavam carregados pelo navegador.
- Geravam ruído de manutenção e risco de confusão com arquivos servidos reais.

Validação pós-remoção:

- `NO_SERVED_REFERENCES_TO_REMOVED_FILES`.
- `NO_DOT_NEW_IN_OUTPUT`.
- `dashboard.js`: 1 referência, apenas em `output/app/dashboard.html`.
- `biblioteca.js`: 1 referência, apenas em `output/app/biblioteca.html`.
- `reader.js`: 1 referência, apenas em `output/app/leitura.html`.
- `app-shell.js`: carregado nas páginas internas, artigos, edições e categorias.

### Cache, encoding e textos

- Cache busting legado `premium-20260430a/b/c`: 0 ocorrências.
- Cache atual `premium-20260430d`: aplicado aos HTMLs servidos.
- Varredura de mojibake e entidades antigas nos arquivos servidos: sem achados reais.
- Não há texto de demo em auth ou páginas internas.
- Os únicos hits de palavras sensíveis na varredura foram conteúdo editorial legítimo (`demonstração de valor`) e nomes de classes CSS (`mockup`), não texto de demonstração do produto.

### Backend e API

Comandos executados:

- `npm run lint`: passou.
- `npm run build`: passou.
- `npm run test --if-present`: passou sem executar suíte, pois não há script real de testes.
- `npx prisma validate`: passou.
- `npx prisma migrate status`: passou; banco `papo_de_lideranca` atualizado.

API sem JWT:

- `GET /categories`: `200`.
- `GET /articles`: `200`.
- `GET /short-editions`: `200`.
- `GET /users/me`: `401`.
- `GET /reading-progress/summary`: `401`.

API com JWT:

- `POST /auth/login`: `201`.
- `GET /users/me`: `200`.
- `GET /users/account-summary`: `200`.
- `GET /reading-progress`: `200`.
- `GET /reading-progress/summary`: `200`.
- `POST /reading-progress` com alias `short-editions`: `201`.
- `PATCH /users/me` com `email`: `400`.
- `PATCH /users/me` com `name`: `200`.

### Validação no navegador

Páginas revalidadas com 0 erros de console no in-app browser:

- `dashboard.html`
- `biblioteca.html`
- `progresso.html`
- `perfil.html`
- `assinatura.html`
- `auth/login.html`
- `auth/recuperar-senha.html`
- leitura estática via redirect de `leitura.html`
- leitura dinâmica/fallback com slug inexistente
- categoria interna `app/categorias/carreira.html`

Auth:

- Logout pelo shell redireciona para `auth/login.html`.
- Página interna sem token redireciona para login.
- Login real pelo formulário redireciona para `app/dashboard.html`.
- Recuperação de senha usa microcopy honesta e suporte editorial, sem fingir envio quando o fluxo depender de suporte.
- Não há texto de versão de demonstração, simulação ou mock nas telas de auth.

Biblioteca:

- Total carregado: 56 leituras.
- Filtro `todos`: 56 leituras.
- Filtro `artigos`: 50 leituras.
- Filtro `edições curtas`: 6 leituras.
- Status `em andamento`: validado.
- Status `concluídos`: validado.
- Status `não iniciados`: validado.
- Busca validada com `feedback`, `liderança`, `carreira`, `pressão` e `repertório`.
- Botão `limpar filtros` aparece quando há filtro ativo.

Progresso:

- Abertura de leitura estática nova registrou progresso real:
  - slug: `artigo-confianca-de-equipe-se-constroi-na-previsibilidade`.
  - `progressPercent`: `10`.
  - `status`: `IN_PROGRESS`.
- O comportamento esperado é registrar abertura em 10% e avançar por milestones simples durante a leitura.

Leitura:

- `short-edition`, `short_edition`, `shortEdition`, `edition` e `short-editions` normalizam corretamente.
- Slug estático de edição curta redireciona para `output/app/edicoes/*.html`.
- Slug inexistente mostra fallback editorial, sem usar `summary` como corpo completo.
- Páginas estáticas carregam `reading-progress.js`.

Mobile:

- Chrome headless local validou larguras `390`, `430`, `768` e `1024` px.
- Páginas testadas: dashboard, biblioteca, progresso, perfil, assinatura, login, recuperar senha, leitura estática e fallback.
- Resultado: sem overflow horizontal nas larguras testadas.
- Header interno visível nas páginas internas.
- Logout acessível nas páginas internas em mobile.
- Páginas de auth não exibem header interno/logout, como esperado.

Avatar:

- Upload controlado validado anteriormente nesta rodada final.
- `PATCH /users/me/avatar`: `200`.
- Avatar anterior foi restaurado visualmente após o teste.
- `GET /users/me` retorna `avatarUrl`.
- O arquivo apontado pelo `avatarUrl` existe em `backend/uploads/avatars`.
- Observação: o nome do arquivo mudou porque o backend gera um novo filename a cada upload, mas o conteúdo visual foi restaurado.

### Limitações restantes

- Não existe suíte automatizada real; `npm run test --if-present` não executa testes.
- O aviso de `package.json#prisma` para Prisma 7 permanece como débito futuro.
- A recomendação operacional continua sendo usar `http://127.0.0.1:5500`, não `localhost`, para evitar sessão separada no `localStorage`.
- A validação mobile headless criou um perfil temporário do Chrome fora do projeto em `%TEMP%`; não foi removido automaticamente para evitar exclusão local fora da lista explicitamente autorizada.

### Nota final recomendada

- Experiência editorial interna validada: `10/10` para a rodada manual/local.
- Nota técnica global recomendada: `9.8/10`.
- O que impede cravar `10/10` absoluto é a ausência de suíte automatizada real e o aviso futuro do Prisma 7. Não há bloqueio funcional conhecido para uso local pelo cliente.

## Implementação da Estante

Data da implementação: 2026-05-01.

### Resumo executivo

- Criada a área interna premium `Estante`, exclusiva para assinantes ativos.
- A experiência foi desenhada como curadoria editorial, não como e-commerce.
- Não foram criados carrinho, checkout, pedidos, estoque, frete, preço automático, marketplace ou billing.
- A compra é externa e secundária, via `purchaseUrl` configurável por livro.
- A leitura guiada entrega valor mesmo quando o livro não tem link de compra.
- Notas da comunidade são moderadas; notas novas entram como `PENDING`.
- O usuário vê suas próprias notas pendentes, mas outros assinantes só veem notas `APPROVED`.

### Arquivos criados

Backend:

- `backend/src/modules/books/books.module.ts`
- `backend/src/modules/books/books.controller.ts`
- `backend/src/modules/books/books.service.ts`
- `backend/src/modules/books/dto/list-books-query.dto.ts`
- `backend/src/modules/books/dto/list-book-notes-query.dto.ts`
- `backend/src/modules/books/dto/create-book-note.dto.ts`
- `backend/src/modules/books/dto/moderate-book-note.dto.ts`
- `backend/src/modules/books/README.md`
- `backend/prisma/migrations/20260501181821_estante_books/migration.sql`

Frontend servido:

- `output/app/estante.html`
- `output/app/livro.html`
- `output/assets/css/estante.css`
- `output/assets/js/estante.js`
- `output/assets/js/livro.js`

### Arquivos alterados

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/app.module.ts`
- `output/assets/js/app-shell.js`
- HTMLs servidos em `output/` para cache busting `premium-20260501a`.
- Headers internos de páginas raiz em `output/app/*.html` para incluir `estante` no markup inicial.
- `AUDITORIA_INTERNA.md`

### Models Prisma criados

Enums:

- `BookLevel`: `ESSENTIAL`, `DEEPENING`, `PROVOCATION`.
- `BookNoteStatus`: `PENDING`, `APPROVED`, `REJECTED`.

Models:

- `Book`
- `BookNote`

Relacionamentos:

- `User.bookNotes -> BookNote[]`
- `Book.notes -> BookNote[]`
- `BookNote.user -> User`
- `BookNote.book -> Book`

Regra de integridade:

- `@@unique([userId, bookId, promptKey])`, mantendo uma nota por prompt por usuário/livro.

### Endpoints criados

Todos protegidos por JWT:

- `GET /books`
- `GET /books/:slug`
- `GET /books/:slug/notes`
- `POST /books/:slug/notes`
- `PATCH /books/notes/:id/moderate`

Regras validadas:

- `/books` e `/books/:slug` exigem JWT.
- Livros exigem assinatura `PREMIUM/ACTIVE`.
- Notas novas entram como `PENDING`.
- Nota pendente aparece em `myNotes` do autor.
- Nota pendente não aparece em `communityNotes`.
- Role `MEMBER` não pode moderar.
- Role `ADMIN` consegue aprovar/rejeitar.

### Seed inicial

Seed adicionou 8 livros:

- `gestor-eficaz`
- `lideranca-daniel-goleman`
- `comece-pelo-porque`
- `sete-habitos-pessoas-altamente-eficazes`
- `mindset`
- `essencialismo`
- `conversas-dificeis`
- `coragem-de-ser-imperfeito`

Cada livro tem:

- categoria
- nível
- descrição editorial original
- `whyRead`
- ideias centrais
- perguntas guiadas
- aplicação prática
- relações com artigos/edições por slug
- compra externa opcional

Como editar a curadoria:

- Alterar os registros em `backend/prisma/seed.ts`.
- Rodar `npm run seed` dentro de `backend`.
- Para mudanças estruturais, alterar `schema.prisma` e criar migration.

### Compra externa

- `purchaseUrl` é opcional.
- Quando existe, a página do livro mostra CTA secundário `ver opção de compra`.
- O link abre em nova aba com `target="_blank"` e `rel="noopener noreferrer"`.
- Quando não existe, a página mostra `opção de compra em curadoria`.
- Não existe operação própria de estoque, pedido, carrinho, frete ou checkout.

### Frontend e UX

`estante.html`:

- Hero editorial.
- Livro em destaque.
- Busca por livro, autor ou desafio.
- Filtros por categoria e nível.
- Grade de livros com capa tipográfica em CSS.
- Bloco “como usar esta estante”.
- Estados de loading, vazio, erro e bloqueio por assinatura.

`livro.html`:

- Hero do livro.
- Por que este livro está aqui.
- Ideias centrais.
- Perguntas guiadas.
- Aplicação prática.
- Conexões com artigos/edições do Papo de Liderança.
- Margens da comunidade.
- Minha nota por prompts estruturados.

### Navegação interna

Menu interno atualizado pelo `app-shell.js`:

- minha área
- biblioteca
- progresso
- estante
- conta
- sair

`estante.html` e `livro.html` usam:

- `api.js`
- `session.js`
- `app-shell.js`
- JS específico da página

Validação de scripts:

- `dashboard.js`: apenas em `dashboard.html`.
- `biblioteca.js`: apenas em `biblioteca.html`.
- `reader.js`: apenas em `leitura.html`.
- `estante.js`: apenas em `estante.html`.
- `livro.js`: apenas em `livro.html`.

### Validações realizadas

Comandos:

- `npx prisma migrate dev --name estante_books`: criou e aplicou `20260501181821_estante_books`.
- `npx prisma generate`: passou após parar processos antigos do backend que travavam o engine.
- `npm run seed`: passou.
- `npm run lint`: passou.
- `npm run build`: passou.
- `npm run test --if-present`: passou sem executar suíte real.
- `npx prisma validate`: passou.
- `npx prisma migrate status`: passou; 6 migrations e banco atualizado.

API sem JWT:

- `GET /books`: `401`.
- `GET /books/gestor-eficaz`: `401`.
- `POST /books/gestor-eficaz/notes`: `401`.

API com JWT:

- `POST /auth/login`: `201`.
- `GET /books`: `200`, 8 livros.
- `GET /books/gestor-eficaz`: `200`.
- `POST /books/gestor-eficaz/notes`: `201`, status `PENDING`.
- `GET /books/gestor-eficaz/notes`: `200`.
- Nota `PENDING` não apareceu em `communityNotes`.
- Nota `PENDING` apareceu em `myNotes`.
- `PATCH /books/notes/:id/moderate` com role `MEMBER`: `403`.
- `PATCH /books/notes/:id/moderate` com role `ADMIN`: `200`.

Navegador:

- `http://127.0.0.1:5500/app/estante.html`
- `http://127.0.0.1:5500/app/livro.html?slug=gestor-eficaz`
- `http://127.0.0.1:5500/app/livro.html?slug=conversas-dificeis`
- `http://127.0.0.1:5500/app/livro.html?slug=slug-inexistente`

Resultados:

- Estante carregou 8 livros.
- Filtro por categoria validado.
- Filtro por nível validado.
- Busca por `pressão` validada.
- Estado vazio validado.
- Livro com compra externa validado.
- Livro sem `purchaseUrl` validado.
- Slug inexistente validado.
- Nota salva pelo navegador e persistida como `PENDING`.
- Console das páginas principais da Estante/Livro: `0` erros.

Mobile:

- Chrome headless validou `390`, `430`, `768` e `1024` px em `estante` e `livro`.
- Sem overflow horizontal.
- Header interno visível.
- Logout acessível.
- Item `estante` visível no menu.
- Sem texto de demo.
- Sem erro de console.

Higiene:

- Varredura final: `NO_ENCODING_DEMO_DEBUG_HITS`.
- Sem mojibake nos arquivos servidos.
- Sem entidades HTML antigas espalhadas.
- Sem `console.log`/`debugger` em arquivos servidos e backend source.

### Limitações restantes

- Não há UI administrativa visual para moderação; existe endpoint admin.
- Não há suíte automatizada real de testes.
- Links de compra são configuráveis e ainda não usam programa de afiliados real.
- As capas são tipográficas por CSS; não foram usadas capas oficiais por questão de direitos.
- A validação de assinatura usa assinatura `PREMIUM/ACTIVE` já existente; não foi criado middleware global de plano.
- O aviso futuro de `package.json#prisma` para Prisma 7 permanece como débito técnico.

### Próximos passos recomendados

- Criar UI admin simples para aprovar/rejeitar notas.
- Criar “livro do mês”.
- Criar trilhas por desafio: primeira liderança, liderar sob pressão, carreira e influência, produtividade do líder.
- Configurar links afiliados reais por livro.
- Adicionar smoke/e2e automatizado para Estante e Livro.
- Medir livros mais acessados sem transformar a experiência em dashboard.

### Nota final da funcionalidade

- Nota da Estante nesta rodada: `9.7/10`.
- A experiência manual/local está premium e funcional.
- O que impede `10/10` absoluto é a ausência de UI de moderação e de testes automatizados reais.
