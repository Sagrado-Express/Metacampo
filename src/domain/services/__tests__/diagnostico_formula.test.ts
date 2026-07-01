import { describe, it, expect } from 'vitest';

function calculateViability(metaVendasCentavos: number, shareEstimado: number, vpmReal: number) {
  const vpmNecessario = Math.round(metaVendasCentavos / shareEstimado);
  const viavel = vpmReal >= vpmNecessario;
  const deficit = Math.max(0, vpmNecessario - vpmReal);
  return { vpmNecessario, viavel, deficit };
}

describe('Viabilidade Metodologia GTMGC V2.0 Formula Validation', () => {
  it('should calculate R$ 100M necessary VPM for R$ 5M goal and 5% share', () => {
    // 5M BRL meta = 5,000,000 * 100 centavos = 500,000,000 centavos
    const metaCentavos = 500000000;
    const share = 0.05;
    const vpmReal = 12000000000; // 120M BRL real wallet

    const result = calculateViability(metaCentavos, share, vpmReal);
    console.log('MATEMATICA BRUTA DO RESULTADO:');
    console.log(JSON.stringify(result, null, 2));

    expect(result.vpmNecessario).toBe(10000000000); // 100M BRL necessary VPM in centavos
    expect(result.viavel).toBe(true);
    expect(result.deficit).toBe(0);
  });
});
