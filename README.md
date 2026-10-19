# Finanças

App minimalista para lançar gastos e receitas, separar por conta (crédito, débito, Pix, dinheiro) e acompanhar em gráficos. Funciona no computador e no iPhone (instalável na tela de início).

Sem configurar nada, ele roda em **modo demonstração** (dados só no navegador). Para sincronizar entre aparelhos, siga os passos abaixo.

## 1. Banco de dados (Supabase, gratuito)

1. Crie uma conta em https://supabase.com e um novo projeto.
2. No menu **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Authentication > Sign In / Providers > Email**, você pode desligar **Confirm email** para entrar direto após criar a conta (opcional).
4. Em **Project Settings > API**, copie a **Project URL** e a chave **anon / publishable**.

## 2. Publicar (Vercel, gratuito)

1. Suba esta pasta para um repositório no GitHub.
2. Em https://vercel.com, clique em **Add New > Project** e importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = a Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = a chave anon/publishable
4. Clique em **Deploy**.
5. No Supabase, em **Authentication > URL Configuration**, coloque o endereço da Vercel em **Site URL**.

## 3. Instalar no iPhone

Abra o endereço no **Safari**, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**. O app abre em tela cheia, como um aplicativo.

## Rodar no computador (opcional)

Requer Node.js 20 ou superior.

```bash
cp .env.example .env.local   # preencha as duas variáveis (ou deixe vazio para o modo demonstração)
npm install
npm run dev                  # abre em http://localhost:3000
```

## Como usar

- **+** (ou tecla **N** no computador): novo lançamento. Valor, categoria, conta e data.
- Gastos no **cartão de crédito** podem ser parcelados: cada parcela entra no mês correspondente.
- Toque em um lançamento para editar ou excluir (em parcelados, dá para excluir uma ou todas).
- **Contas**: crie, renomeie e escolha cores de contas e categorias; exporte tudo em CSV.
- As setas ao lado do mês navegam entre meses; tocar no nome do mês volta para o atual.

## Estrutura

- `src/app` telas (Resumo, Lançamentos, Gráficos, Contas, Login)
- `src/components` interface e gráficos (SVG próprio, sem biblioteca externa)
- `src/lib/repo.ts` acesso a dados (Supabase ou modo demonstração)
- `supabase/schema.sql` tabelas, segurança por usuário (RLS) e dados iniciais

Observação: o projeto foi gerado sem acesso ao npm, então não passou por `next build`. As telas foram testadas visualmente; se aparecer qualquer erro no primeiro deploy, rode `npm run typecheck` e me envie a mensagem.
