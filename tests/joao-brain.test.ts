// Testes de integração do motor com o LLM mockado: o roteiro faz o papel do Claude
// e os testes conferem que as ferramentas reais devolvem o dado certo e que a
// resposta chega ao cliente no formato do WhatsApp.
import { describe, expect, it } from "vitest";
import { handleIncoming, START_COMMAND } from "@/lib/joao-brain";
import type { OutMessage } from "@/lib/messages";
import { makeDeps, scriptedLlm, toolResultFor, toolUse, turn, vtexFromFixture } from "./helpers";

const PHONE = "5551999990000";
const send = (deps: ReturnType<typeof makeDeps>, text: string, phone = PHONE) =>
  handleIncoming(deps, { phone, channel: "web", message: { type: "text", text } });

const ofType = <T extends OutMessage["type"]>(msgs: OutMessage[], type: T) =>
  msgs.filter((m): m is Extract<OutMessage, { type: T }> => m.type === type);

describe("boas-vindas", () => {
  it("primeiro 'oi' recebe a mensagem fixa, sem chamar o modelo", async () => {
    const { llm, requests } = scriptedLlm([]);
    const deps = makeDeps(llm);
    const r = await send(deps, "Oi!");
    expect(requests).toHaveLength(0);
    expect(r.messages[0]).toMatchObject({ type: "buttons", buttons: [{ title: "Achar um produto" }, { title: "Promoção 60 anos 🚗" }, { title: "Loja mais perto" }] });
    expect((r.messages[0] as { text: string }).text).toContain("Aqui é o João da Obra");
    expect(r.messages[1]).toMatchObject({ type: "list", button: "Mais opções" });
    const rows = (r.messages[1] as Extract<OutMessage, { type: "list" }>).sections[0].rows.map((x) => x.title);
    expect(rows).toEqual(["Rastrear pedido", "Cartão Tumelero", "Falar com atendente"]);
  });

  it("o simulador abre a conversa com o comando de início", async () => {
    const deps = makeDeps(scriptedLlm([]).llm);
    const r = await send(deps, START_COMMAND);
    expect(r.intent).toBe("saudacao");
    const history = await deps.store.allMessages((await deps.store.getOrCreateConversation(PHONE, "web")).id);
    expect(history.map((m) => m.role)).toEqual(["assistant"]);
  });
});

describe("cenários de teste", () => {
  it("1. goteira no banheiro → impermeabilizante (VTEX fora do ar, cai no fallback)", async () => {
    const { llm } = scriptedLlm([
      () => turn(toolUse("buscar_produtos", { termos: ["manta líquida", "impermeabilizante", "telha"] })),
      (req) => {
        const res = toolResultFor(req, "buscar_produtos")!;
        expect(res.fonte).toMatch(/catálogo local/);
        const produtos = res.produtos as { id: string; nome: string }[];
        const manta = produtos.find((p) => /Manta L/i.test(p.nome))!;
        expect(manta).toBeDefined();
        return turn(
          toolUse("responder", {
            baloes: ["Goteira? Deixa comigo! 🔨 Quase sempre o problema tá no telhado ou na laje.", "Quer que eu veja a loja mais perto pra tu buscar hoje?"],
            anexos: [manta.id],
            botoes: ["Loja mais perto", "Ver mais opções"],
            intencao: "produto",
            resolvido: "sim",
          }),
        );
      },
    ]);
    const deps = makeDeps(llm);
    const r = await send(deps, "Tá pingando água do teto do banheiro, o que eu faço?");
    const [card] = ofType(r.messages, "product");
    expect(card.product.link).toMatch(/^https:\/\/www\.tumelero\.com\.br\/.*\/p$/);
    expect(card.product.name).toMatch(/Manta L/);
    expect(r.messages.map((m) => m.type)).toEqual(["text", "product", "buttons"]);
    expect(r.trace[0]).toMatchObject({ name: "buscar_produtos", ok: true });
    expect(r.trace[0].summary).toMatch(/fallback.*VTEX falhou/);
  });

  it("2. quarto do bebê → tinta + complementos, só com produtos reais", async () => {
    const { llm } = scriptedLlm([
      () => turn(toolUse("buscar_produtos", { termos: ["tinta acrílica", "rolo de pintura", "fita crepe"] })),
      (req) => {
        const produtos = toolResultFor(req, "buscar_produtos")!.produtos as { id: string; nome: string }[];
        expect(produtos.some((p) => /Tinta Acr/i.test(p.nome))).toBe(true);
        return turn(
          toolUse("responder", {
            baloes: ["Pro quarto do bebê vai bem um *azul acinzentado*: deixa tudo tranquilão. 🎨 Use tinta acrílica fosca, que não tem cheiro forte depois de seca.", "Dá pra pagar em até 6x sem juros, Pix ou boleto."],
            anexos: produtos.slice(0, 3).map((p) => p.id),
            botoes: ["Quanto de tinta?", "Loja mais perto"],
            intencao: "produto",
            resolvido: "sim",
          }),
        );
      },
    ]);
    const r = await send(makeDeps(llm), "Quero pintar o quarto do bebê, que cor e qual tinta?");
    expect(ofType(r.messages, "product")).toHaveLength(3);
    const buttons = ofType(r.messages, "buttons")[0];
    expect(buttons.text).toContain("6x sem juros");
  });

  it("3. R$ 950 com R$ 300 no Dia T → 4 cupons", async () => {
    let cupons: unknown;
    const { llm } = scriptedLlm([
      () => turn(toolUse("calcular_cupons", { valor_total: 950, valor_dia_t: 300 })),
      (req) => {
        cupons = toolResultFor(req, "calcular_cupons")!.cupons;
        return turn(
          toolUse("responder", {
            baloes: [`Com essa compra você leva *${cupons} cupons* pro sorteio da Strada! 🚗`],
            botoes: ["Cadastrar nota", "Ofertas do Dia T"],
            intencao: "cupons",
            resolvido: "sim",
          }),
        );
      },
    ]);
    const r = await send(makeDeps(llm), "Comprei R$ 950, sendo R$ 300 em oferta do Dia T. Quantos cupons eu ganho?");
    expect(cupons).toBe(4);
    expect(r.trace[0].output).toMatchObject({ cupons: 4 });
    expect((r.messages[0] as { text: string }).text).toContain("*4 cupons*");
  });

  it("4. CEP 93010-001 → São Leopoldo, com localização e botão Como chegar", async () => {
    const { llm } = scriptedLlm([
      () => turn(toolUse("buscar_loja_proxima", { cep: "93010-001" })),
      (req) => {
        const res = toolResultFor(req, "buscar_loja_proxima")!;
        const lojas = res.lojas as { id: string; nome: string }[];
        expect(lojas[0].nome).toBe("Tumelero São Leopoldo");
        return turn(toolUse("responder", { baloes: ["Tri perto de ti! 🏠", "Precisa de mais alguma coisa?"], anexos: lojas.map((l) => l.id), intencao: "loja", resolvido: "sim" }));
      },
    ]);
    const deps = makeDeps(llm);
    const r = await send(deps, "Qual a loja mais perto do CEP 93010-001?");
    const [loc] = ofType(r.messages, "location");
    expect(loc.name).toBe("Tumelero São Leopoldo");
    const [cta] = ofType(r.messages, "cta");
    expect(cta.label).toBe("Como chegar");
    expect(cta.url).toContain("google.com/maps/dir");
    expect(cta.text).toContain("Rua Pedro Péres, 481");
    expect(cta.text).toContain("Hoje (terça): 8h às 19h");
    expect(cta.text).toContain("(51) 99554-4435");
    // cidade e CEP ficam salvos na conversa
    const conv = await deps.store.getOrCreateConversation(PHONE, "web");
    expect(conv).toMatchObject({ city: "São Leopoldo", cep: "93010001" });
  });

  it("5. pedido 100234 → saiu para entrega, com linha do tempo", async () => {
    const { llm } = scriptedLlm([
      () => turn(toolUse("rastrear_pedido", { numero_pedido: "100234" })),
      (req) => {
        const res = toolResultFor(req, "rastrear_pedido")!;
        expect(res).toMatchObject({ encontrado: true, status_atual: "Saiu para entrega", previsao: "hoje", atrasado: false });
        expect((res.linha_do_tempo as string[]).length).toBe(3);
        return turn(toolUse("responder", { baloes: ["Boa notícia: teu pedido *saiu para entrega* e chega hoje! 🚚"], intencao: "pedido", resolvido: "sim" }));
      },
    ]);
    const r = await send(makeDeps(llm), "Cadê meu pedido 100234?");
    expect(r.trace[0].summary).toBe("pedido 100234: Saiu para entrega");
  });

  it("6. segunda via do cartão → confirma identidade e manda o boleto em PDF", async () => {
    const { llm } = scriptedLlm([
      // turno 1: pede os dados
      () =>
        turn(
          toolUse("responder", {
            baloes: ["Bora tirar essa 2ª via! Por segurança, me passa teu CPF e tua data de nascimento?", "Fica tranquilo: nunca vou te pedir senha nem o número do cartão. 🙌"],
            intencao: "cartao",
            resolvido: "em_andamento",
          }),
        ),
      // turno 2: verifica e gera o boleto
      () => turn(toolUse("consultar_cartao_tumelero", { cpf: "123.456.789-09", data_nascimento: "1985-03-15", acao: "boleto" })),
      (req) => {
        const res = toolResultFor(req, "consultar_cartao_tumelero")!;
        expect(res).toMatchObject({ verificado: true, cartao_final: "4821" });
        expect(res.valor).toMatch(/^R\$\s612,35$/);
        return turn(toolUse("responder", { baloes: ["Pronto, Ana! Aqui tá a 2ª via:", "É um boleto fictício, só de demonstração."], anexos: [res.id as string], intencao: "cartao", resolvido: "sim" }));
      },
    ]);
    const deps = makeDeps(llm);
    const first = await send(deps, "Quero a segunda via do meu cartão Tumelero.");
    expect(first.messages).toHaveLength(2);
    const r = await send(deps, "123.456.789-09, nasci em 15/03/1985");
    const [doc] = ofType(r.messages, "document");
    expect(doc.url).toMatch(/^https:\/\/joao\.test\/api\/boleto\/[\w-]+\.[\w-]+$/);
    expect(doc.filename).toMatch(/\.pdf$/);
    expect(ofType(r.messages, "text").some((m) => /Linha digitável/.test(m.text))).toBe(true);
  });

  it("7. Novo Hamburgo → São Leopoldo com a distância, sem segunda opção", async () => {
    const { llm } = scriptedLlm([
      () => turn(toolUse("buscar_loja_proxima", { cidade_ou_endereco: "Novo Hamburgo" })),
      (req) => {
        const lojas = toolResultFor(req, "buscar_loja_proxima")!.lojas as { id: string; nome: string; distancia: string }[];
        expect(lojas).toHaveLength(1);
        expect(lojas[0].nome).toBe("Tumelero São Leopoldo");
        expect(lojas[0].distancia).toMatch(/^(8|9|10),\d km$/);
        return turn(toolUse("responder", { baloes: [`Em Novo Hamburgo ainda não, mas a de São Leopoldo fica a uns ${lojas[0].distancia}! 🏠`], anexos: [lojas[0].id], intencao: "loja", resolvido: "sim" }));
      },
    ]);
    const r = await send(makeDeps(llm), "Moro em Novo Hamburgo, tem loja aí?");
    expect(ofType(r.messages, "cta")[0].text).toMatch(/Uns (8|9|10),\d km de você/);
  });
});

describe("regras do motor", () => {
  it("mascara cartão e CVV antes do modelo e do banco", async () => {
    const { llm, requests } = scriptedLlm([
      () => turn(toolUse("responder", { baloes: ["Opa, não precisa me mandar isso! 🙌"], intencao: "cartao", resolvido: "em_andamento" })),
    ]);
    const deps = makeDeps(llm);
    await send(deps, "meu cartão é 4111 1111 1111 1111 e o cvv é 123");
    const sent = JSON.stringify(requests[0].messages);
    expect(sent).not.toContain("4111 1111 1111 1111");
    expect(sent).not.toMatch(/cvv é 123/);
    expect(sent).toContain("ATENÇÃO: o cliente mandou cartao, cvv");
    const conv = await deps.store.getOrCreateConversation(PHONE, "web");
    const [stored] = await deps.store.allMessages(conv.id);
    expect(stored.content).toBe("meu cartão é [cartão ocultado •••• 1111] e o cvv é [ocultado]");
  });

  it("anexo inventado volta como erro e o modelo corrige", async () => {
    const { llm, requests } = scriptedLlm([
      () => turn(toolUse("responder", { baloes: ["Olha esse!"], anexos: ["P9"], intencao: "produto", resolvido: "sim" })),
      () => turn(toolUse("responder", { baloes: ["Me conta mais da tua obra?"], intencao: "produto", resolvido: "em_andamento" })),
    ]);
    const r = await send(makeDeps(llm), "quero um piso");
    expect(requests).toHaveLength(2);
    expect(JSON.stringify(requests[1].messages.at(-1))).toContain('anexo \\"P9\\" não existe');
    expect(r.messages).toEqual([{ type: "text", text: "Me conta mais da tua obra?" }]);
  });

  it("escala para humano depois de 2 tentativas sem resolver", async () => {
    const naoSei = () => turn(toolUse("responder", { baloes: ["Hmm, essa eu não sei."], intencao: "outro", resolvido: "nao" }));
    const deps = makeDeps(scriptedLlm([naoSei, naoSei]).llm);
    const first = await send(deps, "vocês instalam placa solar?");
    expect(first.escalated).toBe(false);
    const second = await send(deps, "e aquecedor solar?");
    expect(second.escalated).toBe(true);
    expect(second.messages.at(-1)).toEqual({ type: "text", text: "Vou chamar um colega da Tumelero pra te ajudar, tá? Já já alguém fala contigo. 🙌" });
    const conv = await deps.store.getOrCreateConversation(PHONE, "web");
    expect(conv.status).toBe("escalada");
    // com a conversa escalada, o João segura sem chamar o modelo
    const third = await send(deps, "alô?");
    expect(third.messages[0]).toMatchObject({ type: "buttons", buttons: [{ title: "Voltar pro João" }] });
  });

  it("falar_com_humano marca a conversa e garante a frase de encaminhamento", async () => {
    const { llm } = scriptedLlm([
      () => turn(toolUse("falar_com_humano", { motivo: "cliente pediu atendente" })),
      () => turn(toolUse("responder", { baloes: ["Claro!"], intencao: "humano", resolvido: "sim" })),
    ]);
    const deps = makeDeps(llm);
    const r = await send(deps, "quero falar com uma pessoa");
    expect(r.escalated).toBe(true);
    expect(r.messages.at(-1)).toMatchObject({ text: expect.stringContaining("Vou chamar um colega") });
    const metrics = await deps.store.metrics();
    expect(metrics.escalated).toBe(1);
    expect(metrics.tools).toEqual([{ tool: "falar_com_humano", total: 1 }]);
  });

  it("ignora a mesma mensagem do WhatsApp entregue duas vezes", async () => {
    const { llm, requests } = scriptedLlm([
      () => turn(toolUse("responder", { baloes: ["Opa!"], intencao: "outro", resolvido: "sim" })),
    ]);
    const deps = makeDeps(llm);
    const msg = { phone: PHONE, channel: "whatsapp" as const, message: { type: "text" as const, text: "tem cimento?" }, waMessageId: "wamid.1" };
    await handleIncoming(deps, msg);
    const again = await handleIncoming(deps, msg);
    expect(again.duplicate).toBe(true);
    expect(requests).toHaveLength(1);
  });

  it("produtos do site em tempo real quando a VTEX responde", async () => {
    const { llm } = scriptedLlm([
      () => turn(toolUse("buscar_produtos", { termos: ["manta líquida"] })),
      (req) => {
        const res = toolResultFor(req, "buscar_produtos")!;
        expect(res.fonte).toBe("site (tempo real)");
        return turn(toolUse("responder", { baloes: ["Essa resolve:"], anexos: ["P1"], intencao: "produto", resolvido: "sim" }));
      },
    ]);
    const r = await send(makeDeps(llm, vtexFromFixture), "goteira na laje");
    expect(ofType(r.messages, "product")[0].product).toMatchObject({ price: 259.9, listPrice: 299.9 });
  });

  it("manda o histórico com no máximo 20 mensagens e o contexto no fim", async () => {
    const steps = Array.from({ length: 12 }, () => () => turn(toolUse("responder", { baloes: ["ok"], intencao: "outro", resolvido: "sim" })));
    const { llm, requests } = scriptedLlm(steps);
    const deps = makeDeps(llm);
    for (let i = 0; i < 12; i++) await send(deps, `mensagem ${i}`);
    const last = requests.at(-1)!;
    const totalTurns = last.messages.length;
    expect(totalTurns).toBeLessThanOrEqual(20);
    expect(last.messages[0].role).toBe("user");
    expect(JSON.stringify(last.messages.at(-1))).toContain("[contexto]");
    expect(JSON.stringify(last.messages)).not.toContain("mensagem 0");
  });
});
