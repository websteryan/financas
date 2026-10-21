# Finanças: marca e design system

Prancha completa: `docs/brandkit.png`. A fonte da verdade dos tokens é `src/app/globals.css`.

## Marca
- Ideia: clareza e calma para o dinheiro do dia a dia. "Clareza que rende."
- Símbolo: um F de corte único (pontas a 60°), branco sobre degradê ametista. Arquivo: `src/components/Logo.tsx`.
- Tom: sóbrio, escuro, quase sem ruído. Um único acento (roxo), verde e rosa só para dinheiro entrando e saindo.

## Paleta "Ametista & Obsidiana"
| Papel | Token | Valor |
|---|---|---|
| Fundo | `--bg` | #07050C |
| Cartão | `--surface` | #0E0A18 |
| Bloco / controle | `--surface-2` | #161026 |
| Hover / pressionado | `--surface-3` | #1F1736 |
| Linha | `--line` | rgb(190 170 255 / 0.10) |
| Texto | `--fg` | #F4F1FB |
| Texto de apoio | `--muted` | #9B94B5 |
| Primária (preenchimento) | `--accent` | #5B2FD0 (texto branco) |
| Primária forte | `--accent-strong` | #7545E8 (gráficos, hover) |
| Texto de acento | `--accent-text` | #9B7BF2 |
| Receita / Gasto / Alerta | `--income` `--expense` `--warn` | #3CCB8B / #F26D82 / #F2B84B |

Regras: preenchimento roxo sempre com texto branco; texto de acento (`accent-text`) só sobre fundos escuros; no máximo um acento por tela além de verde/rosa semânticos.

## Tipografia
- Urbanist 700 em títulos e valores grandes (`font-display`).
- Geist 400/500/600 em texto e rótulos.
- Valores monetários usam números tabulares (`.num`); centavos e símbolo em tom de apoio (`BigMoney`).

## Forma e espaço
- Raios: cartão 24, bloco 18, campo 16, controles em pílula.
- Espaçamento: 4, 8, 12, 16, 24.

## Movimento
- Duração 300 a 500 ms, curva `--ease-out` (e `--ease-spring` para "pop").
- Só `transform` e `opacity`. Tudo respeita `prefers-reduced-motion`.
- Entradas: `rise`, `pop`, `item-in`; saídas: `item-out`, `sheet-*-out`; gráficos: `grow-y`, `grow-x`, `donut-seg`.
