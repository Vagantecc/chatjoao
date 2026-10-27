// Fonte única dos dados de demonstração.
// `scripts/gen-seed.ts` gera /supabase/seed.sql a partir daqui, e o modo memória
// (sem Supabase configurado) carrega estes mesmos dados.
import type {
  HolidayRow,
  MockCardHolderRow,
  MockOrderRow,
  OfertaDiaTRow,
  OrderStatus,
  PromoRuleRow,
  StoreHours,
  StoreRow,
} from "./types";
export { seedProducts } from "./seed-products";

const SEG_SAB_8_19: StoreHours["week"] = {
  mon: [["08:00", "19:00"]],
  tue: [["08:00", "19:00"]],
  wed: [["08:00", "19:00"]],
  thu: [["08:00", "19:00"]],
  fri: [["08:00", "19:00"]],
  sat: [["08:00", "19:00"]],
  sun: [],
};

export const seedStores: Omit<StoreRow, "id">[] = [
  {
    slug: "porto-alegre",
    name: "Tumelero Porto Alegre (sede)",
    address: "Av. Assis Brasil, 5577",
    neighborhood: "Sarandi",
    city: "Porto Alegre",
    cep: null,
    lat: -30.0013701,
    lng: -51.1327358,
    whatsapp: [],
    phone: "(51) 3371-9290",
    hours: null,
    active: true,
  },
  {
    slug: "gravatai",
    name: "Tumelero Gravataí",
    address: "Av. Dorival Candido Luz de Oliveira, 625",
    neighborhood: "Parada Gravataí",
    city: "Gravataí",
    cep: "94030-000",
    lat: -29.9381097,
    lng: -51.000923,
    whatsapp: ["(51) 99818-6412", "(51) 99755-4196"],
    phone: null,
    hours: { week: SEG_SAB_8_19, holiday: [["09:00", "17:00"]] },
    active: true,
  },
  {
    slug: "capao-da-canoa",
    name: "Tumelero Capão da Canoa",
    address: "Av. Paraguassú, 3345",
    neighborhood: "Centro",
    city: "Capão da Canoa",
    cep: "95555-000",
    lat: -29.7461,
    lng: -50.011,
    whatsapp: ["(51) 99772-6466", "(51) 99843-1034"],
    phone: null,
    hours: {
      week: SEG_SAB_8_19,
      holiday: [
        ["09:00", "12:00"],
        ["13:00", "17:00"],
      ],
      seasonal: [
        {
          months: [10, 11, 12, 1, 2],
          day: "sun",
          ranges: [
            ["09:00", "12:00"],
            ["13:00", "17:00"],
          ],
        },
      ],
    },
    active: true,
  },
  {
    slug: "guaiba",
    name: "Tumelero Guaíba",
    address: "Av. Nestor de Moura Jardim, 894",
    neighborhood: "Colina",
    city: "Guaíba",
    cep: "92700-010",
    lat: -30.1160084,
    lng: -51.3336851,
    whatsapp: ["(51) 99683-8055", "(51) 99528-9368"],
    phone: null,
    hours: { week: SEG_SAB_8_19 },
    active: true,
  },
  {
    slug: "sao-leopoldo",
    name: "Tumelero São Leopoldo",
    address: "Rua Pedro Péres, 481",
    neighborhood: "Centro",
    city: "São Leopoldo",
    cep: "93010-001",
    lat: -29.7724873,
    lng: -51.1348164,
    whatsapp: ["(51) 99554-4435", "(51) 99794-2438"],
    phone: null,
    hours: {
      week: { ...SEG_SAB_8_19, sat: [["08:00", "18:30"]] },
    },
    active: true,
  },
];

export const seedHolidays: HolidayRow[] = [
  ["2026-01-01", "Confraternização Universal"],
  ["2026-04-03", "Sexta-feira Santa"],
  ["2026-04-21", "Tiradentes"],
  ["2026-05-01", "Dia do Trabalho"],
  ["2026-09-07", "Independência do Brasil"],
  ["2026-10-12", "Nossa Senhora Aparecida"],
  ["2026-11-02", "Finados"],
  ["2026-11-15", "Proclamação da República"],
  ["2026-11-20", "Dia Nacional de Zumbi e da Consciência Negra"],
  ["2026-12-25", "Natal"],
  ["2027-01-01", "Confraternização Universal"],
  ["2027-03-26", "Sexta-feira Santa"],
  ["2027-04-21", "Tiradentes"],
  ["2027-05-01", "Dia do Trabalho"],
  ["2027-09-07", "Independência do Brasil"],
  ["2027-10-12", "Nossa Senhora Aparecida"],
  ["2027-11-02", "Finados"],
  ["2027-11-15", "Proclamação da República"],
  ["2027-11-20", "Dia Nacional de Zumbi e da Consciência Negra"],
  ["2027-12-25", "Natal"],
]
  .map(([date, name]): HolidayRow => ({ date, name, scope: "nacional", city: null }))
  .concat([
    { date: "2026-09-20", name: "Revolução Farroupilha", scope: "estadual", city: null },
    { date: "2027-09-20", name: "Revolução Farroupilha", scope: "estadual", city: null },
    { date: "2026-02-02", name: "Nossa Senhora dos Navegantes", scope: "municipal", city: "Porto Alegre" },
    { date: "2027-02-02", name: "Nossa Senhora dos Navegantes", scope: "municipal", city: "Porto Alegre" },
  ]);

export const seedPromoRules: Omit<PromoRuleRow, "id">[] = [
  {
    slug: "aviso",
    title: "Aviso",
    content:
      'Promoção "Tumelero 60 Anos — Ninguém facilita tanto". Regulamento provisório, sujeito a autorização da SPA/MF.',
    keywords: ["regulamento", "autorização", "oficial", "provisório", "spa"],
    sort_order: 0,
  },
  {
    slug: "premio",
    title: "Prêmio",
    content: "1 (um) Fiat Strada 0 km sorteado por mês, durante os 12 meses da promoção.",
    keywords: ["prêmio", "carro", "strada", "fiat", "ganhar", "sorteia", "quantos"],
    sort_order: 1,
  },
  {
    slug: "como-participar",
    title: "Como participar",
    content: "A cada R$ 300,00 em compras (loja física ou site), o cliente ganha 1 cupom para o sorteio do mês.",
    keywords: ["participar", "cupom", "cupons", "300", "compra", "site", "loja", "como"],
    sort_order: 2,
  },
  {
    slug: "dia-t",
    title: "Dia T",
    content:
      'Produtos da "Oferta do Dia T" contam em dobro. Fórmula: cupons = floor((valor_normal + 2 × valor_dia_T) / 300). Exemplo: compra de R$ 950, sendo R$ 300 em Ofertas do Dia T → (650 + 600) / 300 = 4 cupons.',
    keywords: ["dia t", "dobro", "oferta", "fórmula", "conta", "calcular"],
    sort_order: 3,
  },
  {
    slug: "cadastro",
    title: "Cadastro",
    content: "CPF + número da nota fiscal, pelo site ou pelo WhatsApp com o João.",
    keywords: ["cadastro", "cadastrar", "nota", "nf", "cpf", "registrar", "whatsapp"],
    sort_order: 4,
  },
  {
    slug: "soma-por-nota",
    title: "Soma por nota fiscal",
    content: "Os valores são somados por nota fiscal. O saldo que sobra não acumula para outra compra.",
    keywords: ["saldo", "sobra", "acumula", "somar", "juntar", "notas"],
    sort_order: 5,
  },
  {
    slug: "validade",
    title: "Validade dos cupons",
    content: "Os cupons valem para o sorteio do mês da compra.",
    keywords: ["validade", "vale", "mês", "próximo", "valem"],
    sort_order: 6,
  },
  {
    slug: "sorteio",
    title: "Sorteio",
    content: "Mensal, pela extração da Loteria Federal do último sábado do mês.",
    keywords: ["sorteio", "quando", "data", "loteria", "federal", "sábado", "resultado"],
    sort_order: 7,
  },
  {
    slug: "quem-participa",
    title: "Quem pode participar",
    content:
      "Pessoas físicas maiores de 18 anos com CPF válido. Funcionários Tumelero e familiares diretos não participam.",
    keywords: ["quem", "idade", "18", "funcionário", "cnpj", "empresa", "menor", "família", "pode"],
    sort_order: 8,
  },
  {
    slug: "ganhador",
    title: "Ganhador",
    content: "Contato por telefone e WhatsApp em até 5 dias úteis; entrega do veículo em até 30 dias.",
    keywords: ["ganhador", "ganhei", "contato", "entrega", "aviso", "receber"],
    sort_order: 9,
  },
  {
    slug: "nao-participam",
    title: "O que não participa",
    content: "Não participam: serviços, frete e gift cards.",
    keywords: ["frete", "serviço", "gift", "card", "vale-presente", "não participa", "conta"],
    sort_order: 10,
  },
];

/** Ofertas do Dia T relativas à data em que o seed roda (dia 0 = hoje). */
export const seedOfertasDiaT: (Omit<OfertaDiaTRow, "id" | "date"> & { dayOffset: number })[] = [
  {
    dayOffset: 0,
    product_name: "Manta Líquida Vedalage Branco Viapol",
    price: 219.9,
    normal_price: 259.9,
    link: "https://www.tumelero.com.br/manta-liquida-vedalage-branco-viapol/p",
    image_url:
      "https://tumelerosaintgobain.vteximg.com.br/arquivos/ids/292764/manta-liquida-vedalage-branco-viapol-1.jpg?v=639202553921600000",
  },
  {
    dayOffset: 0,
    product_name: "Chuveiro Eletrônico Loren Shower Ultra Lorenzetti Branco",
    price: 109.9,
    normal_price: 129.9,
    link: "https://www.tumelero.com.br/chuveiro-eletronico-loren-shower-ultra-lorenzetti-branco/p",
    image_url:
      "https://tumelerosaintgobain.vteximg.com.br/arquivos/ids/223207/chuveiro-eletronico-loren-shower-ultra-lorenzetti-branco_01.jpg?v=639032423791970000",
  },
  {
    dayOffset: 0,
    product_name: "Argamassa Colante AC-III Interno e Externo TecnoSuper Cinza",
    price: 24.9,
    normal_price: 29.9,
    link: "https://www.tumelero.com.br/argamassa-colante-ac-iii-interno-e-externo-tecnosuper-cinza/p",
    image_url:
      "https://tumelerosaintgobain.vteximg.com.br/arquivos/ids/275271/argamassa-colante-ac-iii-interno-e-externo-tecnosuper-cinza.jpg?v=639074590652570000",
  },
  {
    dayOffset: 1,
    product_name: "Kit Vaso Sanitário com Caixa Acoplada e Assento Joy Way One Lorenzetti Branco",
    price: 389.9,
    normal_price: 439.8,
    link: "https://www.tumelero.com.br/kit-vaso-sanitario-com-caixa-acoplada-e-assento-joy-way-one-lorenzetti-branco/p",
    image_url:
      "https://tumelerosaintgobain.vteximg.com.br/arquivos/ids/298358/kit-vaso-sanitario-com-caixa-acoplada-e-assento-joy-way-lorenzetti-branco-1.jpg?v=639276868698970000",
  },
  {
    dayOffset: 1,
    product_name: "Trena 3 Metros Tramontina",
    price: 13.9,
    normal_price: 17.9,
    link: "https://www.tumelero.com.br/trena-3-metros-tramontina-40833099-1/p",
    image_url:
      "https://tumelerosaintgobain.vteximg.com.br/arquivos/ids/175734/Trena-3-metros-Tramontina-40833099.jpg?v=637068525698830000",
  },
];

/** Pedidos fictícios. `hoursAgo` monta a linha do tempo relativa ao momento do seed. */
interface SeedOrder extends Omit<MockOrderRow, "id" | "timeline" | "eta" | "created_at"> {
  steps: [OrderStatus, number][]; // [status, horas atrás]
  etaDays: number | null; // dias a partir de hoje (negativo = já passou)
}

export const seedOrders: SeedOrder[] = [
  {
    order_number: "100231",
    cpf: "12345678909",
    customer_name: "Ana Souza",
    status: "pagamento_aprovado",
    delivery_type: "entrega",
    store_slug: null,
    items: [{ name: "Tinta Acrílica Toque Fosco Completo 18L Elefante Suvinil", qty: 1, price: 839.9 }],
    total: 839.9,
    steps: [["pagamento_aprovado", 3]],
    etaDays: 5,
  },
  {
    order_number: "100232",
    cpf: "98765432100",
    customer_name: "Carlos Pereira",
    status: "separando",
    delivery_type: "entrega",
    store_slug: null,
    items: [
      { name: "Piso Antiderrapante Bold Copacabana Gris Cejatel (m²)", qty: 20, price: 28.9 },
      { name: "Argamassa Colante AC-III Interno e Externo TecnoSuper Cinza", qty: 8, price: 29.9 },
    ],
    total: 817.2,
    steps: [
      ["pagamento_aprovado", 30],
      ["separando", 6],
    ],
    etaDays: 3,
  },
  {
    order_number: "100233",
    cpf: "11144477735",
    customer_name: "Juliana Lima",
    status: "retirada_disponivel",
    delivery_type: "retirada",
    store_slug: "sao-leopoldo",
    items: [{ name: "Furadeira de Impacto 1/2\" 710W com Chave VVR Stanley", qty: 1, price: 294.63 }],
    total: 294.63,
    steps: [
      ["pagamento_aprovado", 26],
      ["separando", 20],
      ["retirada_disponivel", 4],
    ],
    etaDays: null,
  },
  {
    order_number: "100234",
    cpf: "12345678909",
    customer_name: "Ana Souza",
    status: "saiu_para_entrega",
    delivery_type: "entrega",
    store_slug: null,
    items: [
      { name: "Manta Líquida Vedalage Branco Viapol", qty: 1, price: 259.9 },
      { name: "Rolo Para Pintura Atlas Drywall 23cm", qty: 1, price: 23.9 },
    ],
    total: 283.8,
    steps: [
      ["pagamento_aprovado", 50],
      ["separando", 28],
      ["saiu_para_entrega", 2],
    ],
    etaDays: 0,
  },
  {
    order_number: "100235",
    cpf: "52998224725",
    customer_name: "Roberto Fagundes",
    status: "entregue",
    delivery_type: "entrega",
    store_slug: null,
    items: [{ name: "Kit Vaso Sanitário com Caixa Acoplada e Assento Joy Way One Lorenzetti Branco", qty: 1, price: 439.8 }],
    total: 439.8,
    steps: [
      ["pagamento_aprovado", 120],
      ["separando", 100],
      ["saiu_para_entrega", 74],
      ["entregue", 70],
    ],
    etaDays: -3,
  },
  {
    order_number: "100236",
    cpf: "32165498791",
    customer_name: "Fernanda Klein",
    status: "atrasado",
    delivery_type: "entrega",
    store_slug: null,
    items: [{ name: "Caixa d'Água Fibra de Vidro Bakof Tec", qty: 1, price: 2049.9 }],
    total: 2049.9,
    steps: [
      ["pagamento_aprovado", 190],
      ["separando", 150],
      ["atrasado", 24],
    ],
    etaDays: -2,
  },
  {
    order_number: "100237",
    cpf: "98765432100",
    customer_name: "Carlos Pereira",
    status: "entregue",
    delivery_type: "retirada",
    store_slug: "gravatai",
    items: [{ name: "Trena 3 Metros Tramontina", qty: 2, price: 17.9 }],
    total: 35.8,
    steps: [
      ["pagamento_aprovado", 300],
      ["retirada_disponivel", 280],
      ["entregue", 250],
    ],
    etaDays: null,
  },
  {
    order_number: "100238",
    cpf: "45612378955",
    customer_name: "Marcos Becker",
    status: "saiu_para_entrega",
    delivery_type: "entrega",
    store_slug: null,
    items: [{ name: "Ar Condicionado Split Inverter 30.000 BTUs Agratto Zen Frio", qty: 1, price: 5499.9 }],
    total: 5499.9,
    steps: [
      ["pagamento_aprovado", 72],
      ["separando", 40],
      ["saiu_para_entrega", 5],
    ],
    etaDays: 0,
  },
  {
    order_number: "100239",
    cpf: "11144477735",
    customer_name: "Juliana Lima",
    status: "separando",
    delivery_type: "retirada",
    store_slug: "guaiba",
    items: [{ name: "Selador Acrílico Coral Branco", qty: 2, price: 159.9 }],
    total: 319.8,
    steps: [
      ["pagamento_aprovado", 8],
      ["separando", 2],
    ],
    etaDays: 1,
  },
  {
    order_number: "100240",
    cpf: "52998224725",
    customer_name: "Roberto Fagundes",
    status: "atrasado",
    delivery_type: "entrega",
    store_slug: null,
    items: [{ name: "Porcelanato Externo Retificado Imigrantes Elizabeth (m²)", qty: 35, price: 58.9 }],
    total: 2061.5,
    steps: [
      ["pagamento_aprovado", 240],
      ["separando", 200],
      ["saiu_para_entrega", 60],
      ["atrasado", 12],
    ],
    etaDays: -1,
  },
];

/** Titulares fictícios do Cartão Tumelero. Datas de fatura relativas ao seed (offset em dias). */
interface SeedCardHolder extends Omit<MockCardHolderRow, "id" | "invoice" | "open_debts" | "recent_purchases"> {
  invoice: { amount: number; dueInDays: number; closedDaysAgo: number; status: "aberta" | "fechada" | "paga" };
  open_debts: { description: string; amount: number; dueInDays: number }[];
  recent_purchases: { daysAgo: number; description: string; amount: number; installments?: string }[];
}

export const seedCardHolders: SeedCardHolder[] = [
  {
    cpf: "12345678909",
    birth_date: "1985-03-15",
    name: "Ana Souza",
    last4: "4821",
    limit_total: 5000,
    limit_available: 3216.4,
    invoice: { amount: 612.35, dueInDays: 8, closedDaysAgo: 2, status: "fechada" },
    open_debts: [{ description: "Fatura atual", amount: 612.35, dueInDays: 8 }],
    recent_purchases: [
      { daysAgo: 2, description: "Tumelero Online — Manta Líquida + Rolo", amount: 283.8 },
      { daysAgo: 12, description: "Tumelero São Leopoldo", amount: 839.9, installments: "2/6" },
      { daysAgo: 25, description: "Tumelero Gravataí", amount: 47.3 },
    ],
  },
  {
    cpf: "98765432100",
    birth_date: "1972-11-02",
    name: "Carlos Pereira",
    last4: "1093",
    limit_total: 8000,
    limit_available: 7182.8,
    invoice: { amount: 817.2, dueInDays: 15, closedDaysAgo: 0, status: "aberta" },
    open_debts: [],
    recent_purchases: [
      { daysAgo: 1, description: "Tumelero Online — Piso + Argamassa", amount: 817.2, installments: "1/6" },
      { daysAgo: 12, description: "Tumelero Gravataí — Trenas", amount: 35.8 },
    ],
  },
  {
    cpf: "32165498791",
    birth_date: "1990-07-28",
    name: "Fernanda Klein",
    last4: "7755",
    limit_total: 3000,
    limit_available: 412.6,
    invoice: { amount: 1240.0, dueInDays: -4, closedDaysAgo: 14, status: "fechada" },
    open_debts: [
      { description: "Fatura de setembro (vencida)", amount: 1240.0, dueInDays: -4 },
      { description: "Parcela 3/10 — Caixa d'Água", amount: 204.99, dueInDays: 26 },
    ],
    recent_purchases: [{ daysAgo: 8, description: "Tumelero Online — Caixa d'Água", amount: 2049.9, installments: "3/10" }],
  },
];
