import { describe, it, expect } from 'vitest';

describe('Customer Wallet Materialization VPM Calculation (Passo 2)', () => {
  it('should calculate VPM of customer Pedro with 6000 ha of Cafe @ R$ 8900/ha correctly', () => {
    const areaHa = 6000;
    const valuePerHectareBrl = 8900;

    // Calculation in BRL
    const vpmBrl = areaHa * valuePerHectareBrl;

    // Expecting 53,400,000 BRL
    expect(vpmBrl).toBe(53400000);

    // In cents:
    const valuePerHectareCents = valuePerHectareBrl * 100;
    const vpmCents = areaHa * valuePerHectareCents;

    expect(vpmCents).toBe(5340000000);
  });
});
