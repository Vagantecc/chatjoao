// Cenários de teste: viram atalhos no modo demo e testes do motor (tests/joao-brain.test.ts).
export const SCENARIOS = [
  { label: "Goteira no banheiro", text: "Tá pingando água do teto do banheiro, o que eu faço?" },
  { label: "Quarto do bebê", text: "Quero pintar o quarto do bebê, que cor e qual tinta?" },
  { label: "Cupons do Dia T", text: "Comprei R$ 950, sendo R$ 300 em oferta do Dia T. Quantos cupons eu ganho?" },
  { label: "Loja por CEP", text: "Qual a loja mais perto do CEP 93010-001?" },
  { label: "Rastrear pedido", text: "Cadê meu pedido 100234?" },
  { label: "2ª via do cartão", text: "Quero a segunda via do meu cartão Tumelero." },
  { label: "Loja por cidade", text: "Moro em Novo Hamburgo, tem loja aí?" },
] as const;

/** Dados fictícios para testar os fluxos simulados. */
export const TEST_DATA = [
  { label: "Cartão Tumelero", value: "CPF 123.456.789-09 · nasc. 15/03/1985" },
  { label: "Cartão com fatura vencida", value: "CPF 321.654.987-91 · nasc. 28/07/1990" },
  { label: "Pedidos", value: "100231 a 100240 (100236 e 100240 atrasados)" },
  { label: "Cadastrar nota", value: "qualquer CPF válido + qualquer número de NF" },
] as const;

export const PRESET_LOCATIONS = [
  { name: "Centro de Novo Hamburgo", lat: -29.6876, lng: -51.1306 },
  { name: "Centro de Porto Alegre", lat: -30.0277, lng: -51.2287 },
  { name: "Canoas", lat: -29.9178, lng: -51.1839 },
  { name: "Tramandaí (praia)", lat: -29.9847, lng: -50.1336 },
] as const;
