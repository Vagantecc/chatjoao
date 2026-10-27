# João da Obra — agente de WhatsApp da Tumelero

O João é um joão-de-barro de capacete laranja, mascote e agente de atendimento da Tumelero (60 anos, "Ninguém facilita tanto").
Ele indica produtos reais do site, tira dúvidas e calcula cupons da Promoção 60 Anos, mostra a loja mais perto, rastreia pedidos e ajuda com o Cartão Tumelero. Quando não dá, chama um atendente.

> **João da Obra. Quem entende de construir, vem pra Tumelero.**

- **`/`**: landing com o mascote e o simulador de WhatsApp. O simulador tem modo demo: painel com a ferramenta chamada, os parâmetros e atalhos para os 7 cenários de teste.
- **`/api/whatsapp/webhook`**: webhook da WhatsApp Cloud API. Usa o mesmo motor do simulador.
- **`/admin`**: painel com senha. Nele dá para editar o regulamento, as Ofertas do Dia T, as lojas, os feriados e os produtos de fallback, ver as conversas e acompanhar métricas.

---

## Instalação

Requisitos: Node 20+ e npm. Para o banco, uma conta no [Supabase](https://supabase.com) e, opcionalmente, o [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (veja a tabela abaixo)
```

| Variável | Para quê |
|---|---|
| `ANTHROPIC_API_KEY` | Obrigatória. É o "cérebro" do João. |
| `ANTHROPIC_MODEL` | Opcional. Padrão: `claude-sonnet-5-5`. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Banco. **Sem elas, o app roda em modo memória** com os dados do seed, e tudo some ao reiniciar. Serve para testar, não para produção. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Não é usada hoje: todo acesso ao banco passa pelo servidor com a service role. Fica no `.env` para uso futuro no front. |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | WhatsApp Cloud API (veja abaixo). |
| `WHATSAPP_APP_SECRET` | Opcional, recomendado em produção. Valida a assinatura `X-Hub-Signature-256` da Meta. |
| `ADMIN_PASSWORD` | Senha do `/admin`. Sem ela, o painel fica fechado. |
| `BOLETO_SECRET` | Opcional. Assina os links do PDF do boleto. Se ficar vazio, usa `ADMIN_PASSWORD`. |
| `NEXT_PUBLIC_APP_URL` | URL pública, usada nos links do boleto. Na Vercel é detectada sozinha. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número que vai no QR code da landing (só dígitos, com 55). |

## Banco (Supabase)

As migrations ficam em `supabase/migrations` e o seed em `supabase/seed.sql`. O seed traz:
- 5 lojas;
- feriados de 2026–2027;
- 54 produtos reais do site;
- o regulamento provisório;
- Ofertas do Dia T;
- 10 pedidos mock;
- 3 titulares de cartão mock.

**Projeto na nuvem:**

```bash
supabase login
supabase link --project-ref <ref-do-projeto>
supabase db push --include-seed     # aplica as migrations e roda o seed.sql
```

Sem o CLI, abra o SQL Editor do Supabase e rode primeiro o arquivo de `supabase/migrations/`, depois o `supabase/seed.sql`.

**Local (Docker):** `supabase start` e depois `supabase db reset`, que aplica as migrations e o seed.

Todas as tabelas têm RLS ligado e nenhuma policy. Só o servidor, com a service role, lê e grava.

As datas dos pedidos, das faturas e do Dia T são relativas ao momento em que o seed roda (`now()`, `current_date`), então a demo sempre parece "de hoje". Para regerar o `seed.sql` depois de mudar `lib/data/seed.ts`, rode `npm run db:seed`. Para validar migrations e seed num Postgres em memória (PGlite), sem Supabase, rode `npm run db:check`.

## Rodando

```bash
npm run dev        # http://localhost:3000  (simulador em /, painel em /admin)
npm test           # Vitest: cupons, Haversine, parser VTEX, horários, máscara, WhatsApp e os 7 cenários do motor
npm run typecheck
npm run build
```

Dica para mexer só na interface sem gastar API: `JOAO_FAKE_LLM=1 npm run dev` liga um "João de ensaio" por regras, que cobre os cenários de teste. Ele só funciona em desenvolvimento e não é o João de verdade.

## WhatsApp Cloud API (Meta)

1. No [Meta for Developers](https://developers.facebook.com/), crie um app do tipo **Business** e adicione o produto **WhatsApp**.
2. Em *WhatsApp → API Setup*, copie o **Phone number ID** (`WHATSAPP_PHONE_NUMBER_ID`) e gere um token. Em produção, use um token permanente de *System User* com a permissão `whatsapp_business_messaging` (`WHATSAPP_TOKEN`).
3. Em *WhatsApp → Configuration → Webhook*:
   - **Callback URL**: `https://SEU-DOMINIO/api/whatsapp/webhook`
   - **Verify token**: o mesmo valor de `WHATSAPP_VERIFY_TOKEN` (você escolhe)
   - Clique em *Verify and save*. A rota responde o `hub.challenge`.
   - Em *Webhook fields*, assine **messages**.
4. Em *App settings → Basic*, copie o **App Secret** para `WHATSAPP_APP_SECRET`.
5. No modo de desenvolvimento, a Meta só entrega mensagens de números cadastrados como testadores. Para o número oficial, a Tumelero precisa de uma conta **Meta Business verificada** e do número registrado na Cloud API.

Como funciona: a rota responde `200` na hora, para a Meta não reenviar, e processa em segundo plano com `after()`:
- marca a mensagem como lida e mostra "digitando…";
- roda o motor;
- envia as respostas.

Botões viram `interactive.button`, listas viram `interactive.list` e cards de produto e "Como chegar" viram `interactive.cta_url`. Também saem mensagens de `location` e o boleto como `document`. Mensagens repetidas são ignoradas pelo `wamid`.

### Testando localmente com ngrok

```bash
npm run dev
ngrok http 3000
```

Use a URL `https://xxxx.ngrok-free.app/api/whatsapp/webhook` como Callback URL na Meta e configure `NEXT_PUBLIC_APP_URL` com a mesma URL do ngrok, para o link do boleto funcionar no celular. Para conferir a verificação:

```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123"
# → 123
```

## Deploy (Vercel)

1. Importe o repositório na Vercel. O framework Next.js é detectado sozinho.
2. Cadastre as variáveis de ambiente.
3. Faça o deploy e aponte o webhook da Meta para `https://SEU-PROJETO.vercel.app/api/whatsapp/webhook`.

As rotas do chat e do webhook têm `maxDuration = 60`. No plano Hobby, o limite efetivo pode ser menor.

---

## Arquitetura

```
app/
  page.tsx                      landing + simulador (components/)
  api/chat                      simulador → motor
  api/whatsapp/webhook          Meta → motor → Graph API
  api/boleto/[token]            PDF fictício da 2ª via (pdf-lib)
  admin/                        painel (middleware.ts protege /admin e /api/admin)
lib/
  joao-brain.ts                 MOTOR: histórico (20 msgs) → loop de ferramentas → mensagens
  prompts/joao.ts               system prompt (personalidade, tom, formato, limites)
  llm.ts                        chamada ao Claude (injetável; os testes usam um LLM roteirizado)
  tools/*.ts                    uma ferramenta por arquivo: schema Zod → JSON Schema + execução
  providers/order.ts, card.ts   OrderProvider e CardProvider (mock agora, API real depois)
  vtex/catalog.ts               busca na API pública da VTEX (timeout de 5s, cache de 10 min)
  geo/                          BrasilAPI → ViaCEP + Nominatim, Haversine, cache em geo_cache
  stores/hours.ts               horário de hoje (dia da semana, sazonal, feriados)
  privacy/                      validação de CPF e máscara de cartão/CVV/senha
  whatsapp/                     parser do webhook, conversor para a Graph API, envio
  data/                         DataStore (Supabase ou memória) e o seed em TypeScript
```

**Como o motor responde.** O modelo usa as ferramentas e termina sempre chamando `responder`, com estes campos:
- `baloes`: os textos;
- `anexos`: os ids que as ferramentas devolveram;
- `botoes` ou `lista`;
- `intencao` e `resolvido`.

Cards de produto, loja, boleto e Pix são montados a partir do dado real que a ferramenta buscou. O modelo só cita o id (`P1`, `L1`, `D1`), então preço, link e endereço nunca são inventados. Se o modelo citar um anexo que não existe ou passar do limite de 20 caracteres num botão, o motor devolve o erro e ele corrige na mesma rodada.

**Ferramentas:**
- `buscar_produtos`
- `consultar_promocao`
- `calcular_cupons`
- `ofertas_dia_t_hoje`
- `cadastrar_nota`
- `buscar_loja_proxima`
- `rastrear_pedido`
- `consultar_cartao_tumelero`
- `falar_com_humano`
- `salvar_dados_cliente`, que guarda nome, cidade e CEP para não perguntar de novo

**Regras do motor:**
- **Boas-vindas** fixas no primeiro "oi", sem chamar o modelo.
- **Dados sensíveis:** cartão (com checagem de Luhn), CVV e senha são mascarados *antes* de ir para o modelo e para o banco. O João recebe só o aviso para orientar o cliente.
- **Escalada para humano:** acontece a pedido do cliente ou depois de 2 respostas marcadas como `resolvido: "nao"`. A conversa fica `escalada` no painel, e o João segura com uma mensagem até alguém devolver a conversa a ele no admin.
- **Cartão:** depois de 3 verificações erradas de CPF e nascimento, a consulta é bloqueada e o João encaminha para um atendente.
- **Modelo:** usa adaptive thinking com esforço baixo (resposta rápida) e cache do system prompt. Também usa *fallback* de modelo no servidor, para o caso de recusa.

### Plugando as APIs reais

- **Pedidos:** implemente `OrderProvider` (`lib/providers/order.ts`) com a VTEX OMS e troque o `MockOrderProvider` em `lib/runtime.ts`.
- **Cartão:** implemente `CardProvider` (`lib/providers/card.ts`) com a API do emissor. As funções `verify`, `boleto` e `pix` são as mesmas.
- O motor e as ferramentas não mudam.

## Cenários de teste

Os cenários viram atalhos no modo demo e testes em `tests/joao-brain.test.ts`, com o LLM mockado.

| # | Mensagem | Esperado |
|---|---|---|
| 1 | "Tá pingando água do teto do banheiro, o que eu faço?" | manta líquida / impermeabilizante / telha |
| 2 | "Quero pintar o quarto do bebê, que cor e qual tinta?" | cor com sensação + tinta e complementos |
| 3 | "Comprei R$ 950, sendo R$ 300 em oferta do Dia T. Quantos cupons eu ganho?" | **4 cupons** |
| 4 | "Qual a loja mais perto do CEP 93010-001?" | **São Leopoldo** |
| 5 | "Cadê meu pedido 100234?" | saiu para entrega, chega hoje |
| 6 | "Quero a segunda via do meu cartão Tumelero." | pede CPF + nascimento → boleto em PDF |
| 7 | "Moro em Novo Hamburgo, tem loja aí?" | São Leopoldo, a uns 9 km |

**Dados fictícios:**
- **Cartão:** CPF `123.456.789-09`, nascimento `15/03/1985`. Com fatura vencida: CPF `321.654.987-91`, nascimento `28/07/1990`.
- **Pedidos:** `100231` a `100240`. Os pedidos `100236` e `100240` estão atrasados.
- **Cadastro de nota:** qualquer CPF válido e qualquer número de NF. O valor da nota é simulado.

## Observações

- O **regulamento é provisório e fictício**, só para demonstração. Um sorteio comercial de verdade exige autorização da SPA/MF.
- **Pedidos, cartão, boleto, Pix e números da sorte são simulados.** O boleto usa o banco 999 (inexistente) e o Pix usa uma chave `.invalid`.
- **Loja de Porto Alegre:** CEP, WhatsApp e horário ainda estão por completar no painel. Enquanto isso, o João manda confirmar o horário pelo (51) 3371-9290. Complete as demais lojas a partir de tumelero.com.br/nossas-lojas.
- **Fallback de produtos:** se a VTEX bloquear ou demorar mais de 5s, a busca cai em silêncio na tabela `products`. Os preços do seed são um retrato de 27/10/2026, e o João avisa para conferir no link.
- **Geocodificação:** usa BrasilAPI, ViaCEP e Nominatim (OpenStreetMap), com User-Agent identificado, no máximo 1 requisição por segundo e cache de 30 dias. A prévia de mapa do simulador usa tiles do OpenStreetMap.
- **Fonte:** a Nunito (SIL Open Font License) fica hospedada no projeto, em `app/fonts`.
