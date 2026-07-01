import { describe, it, expect } from 'vitest';

describe('Viability Diagnostic Formulas (Passo 1)', () => {
  it('should calculate VPM Necessário correctly for R$ 8,000,000 meta and 5% share', () => {
    const metaVendasCentavos = 800000000; // R$ 8.000.000,00
    const shareEstimado = 0.05; // 5%

    // Formula: VPM Necessário = Meta / Share
    const vpmNecessario = Math.round(metaVendasCentavos / shareEstimado);

    // Expecting 160,000,000 BRL in cents (16,000,000,000 cents)
    expect(vpmNecessario).toBe(16000000000);
  });

  it('should evaluate viability against real VPM', () => {
    const vpmNecessario = 16000000000;
    
    // Scenario 1: Deficit
    const vpmRealLow = 12000000000;
    const viavelLow = vpmRealLow >= vpmNecessario;
    const deficitLow = Math.max(0, vpmNecessario - vpmRealLow);

    expect(viavelLow).toBe(false);
    expect(deficitLow).toBe(4000000000); // R$ 40.000.000 deficit

    // Scenario 2: Viable
    const vpmRealHigh = 17500000000;
    const viavelHigh = vpmRealHigh >= vpmNecessario;
    const deficitHigh = Math.max(0, vpmNecessario - vpmRealHigh);

    expect(viavelHigh).toBe(true);
    expect(deficitHigh).toBe(0);
  });
});
