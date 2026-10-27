# Demo publicada no claude.ai

Versão de página única do simulador, publicada como Artifact do claude.ai: https://claude.ai/artifact/4UaKgwtYfsebDg3ZsDeUWj

- O João responde com o Claude da conta de quem abre a página (capacidade `sample`), e as ferramentas rodam dentro da própria página.
- A página não pode acessar APIs externas, então ela usa:
  - o catálogo do seed;
  - uma tabela de cidades do RS (`cities.json`, via Nominatim);
  - as faixas de CEP por 3 dígitos (`cep_prefix.json`, via BrasilAPI).
- Fora do claude.ai, ou se o visitante não permitir o uso do Claude, entra um "João de ensaio" por regras.

`template.html` é o código-fonte. O `build.py` embute os dados do seed, as imagens do mascote e as tabelas de cidades e CEPs.
