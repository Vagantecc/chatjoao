/** Valida CPF pelos dígitos verificadores. Aceita com ou sem pontuação. */
export function isValidCpf(input: string): boolean {
  const cpf = input.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, "");
}

/** "123.456.789-09" → "***.456.789-**" (para logs e telas) */
export function maskCpf(input: string): string {
  const d = normalizeCpf(input);
  if (d.length !== 11) return "***";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
