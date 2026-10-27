// Remove dados sensíveis (cartão, CVV, senha) da mensagem do cliente ANTES de ela
// ir para o modelo ou para o banco. O João só recebe o aviso de que algo foi ocultado.

export interface MaskResult {
  text: string;
  found: ("cartao" | "cvv" | "senha")[];
}

function luhnOk(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

// 13 a 19 dígitos, com espaços, pontos ou hífens entre grupos.
const CARD_RE = /(?<!\d)(?:\d[ .-]?){12,18}\d(?!\d)/g;
const CVV_RE = /\b(cvv|cvc|cvv2|c[oó]d(?:igo)?\.?\s+(?:de\s+)?seguran[cç]a)\b(\s*(?:[ée]|:|=|-)?\s*)(\d{3,4})\b/gi;
const SENHA_RE = /\b(senha|password|pin)\b(\s*(?:do cart[aã]o\s*)?(?:[ée]|:|=|-)?\s*)(\S+)/gi;

export function maskSensitive(input: string): MaskResult {
  const found = new Set<MaskResult["found"][number]>();
  let text = input.replace(CARD_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    // CPF (11 dígitos) e telefones não passam no Luhn com 13+ dígitos; pedidos têm 6.
    if (digits.length < 13 || !luhnOk(digits)) return match;
    found.add("cartao");
    return `[cartão ocultado •••• ${digits.slice(-4)}]`;
  });
  text = text.replace(CVV_RE, (_m, label: string, sep: string) => {
    found.add("cvv");
    return `${label}${sep}[ocultado]`;
  });
  text = text.replace(SENHA_RE, (_m, label: string, sep: string) => {
    found.add("senha");
    return `${label}${sep}[ocultado]`;
  });
  return { text, found: [...found] };
}
