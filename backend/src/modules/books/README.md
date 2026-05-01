# Estante editorial

Módulo responsável pela área interna `Estante`.

## Escopo atual

- Curadoria de livros para assinantes ativos.
- Detalhe de livro com leitura guiada.
- Notas de leitura por prompt estruturado.
- Moderação simples por endpoint admin.
- Compra externa por `purchaseUrl`, sem carrinho, pedido, estoque ou checkout.

## Manutenção da curadoria

Os livros iniciais ficam no seed em `prisma/seed.ts`.
Para editar um livro, ajuste o registro pelo `slug` e rode o seed novamente:

```bash
npm run seed
```

Campos de relacionamento usam slugs de artigos e edições curtas já existentes.
Se um slug não existir no front estático, a interface mantém a página estável e não quebra a leitura guiada.

## Notas de leitura

- Cada usuário pode manter uma nota por `promptKey` em cada livro.
- Criar novamente a mesma nota atualiza o conteúdo e volta o status para `PENDING`.
- Apenas notas `APPROVED` aparecem em `communityNotes`.
- Notas `PENDING` aparecem somente para o próprio autor em `myNotes`.

## Próximos passos naturais

- UI administrativa para moderação.
- Livro do mês.
- Trilhas por desafio de liderança.
- Links afiliados reais por livro.
