import { describe, it, expect } from 'vitest';

describe('Dashboard Crop Aggregation and Concentration (Passo 3)', () => {
  it('should calculate correct concentration percentages for the sample wallet', () => {
    // Sample wallet data:
    // Coffee: area = 6000 ha, index = R$ 8900/ha -> VPM = R$ 53,400,000
    // Soy: area = 3000 ha, index = R$ 2200/ha -> VPM = R$ 6,600,000
    // Maize: area = 1000 ha, index = R$ 1100/ha -> VPM = R$ 1,100,000
    
    const crops = [
      { name: 'Café', vpm: 53400000 },
      { name: 'Soja', vpm: 6600000 },
      { name: 'Milho', vpm: 1100000 }
    ];

    const totalVpm = crops.reduce((acc, curr) => acc + curr.vpm, 0);
    expect(totalVpm).toBe(61100000); // R$ 61.1M total

    const concentrations = crops.map(c => ({
      name: c.name,
      percentage: Number(((c.vpm / totalVpm) * 100).toFixed(1))
    }));

    // Expecting:
    // Café: 53.4M / 61.1M = 87.397% -> 87.4%
    // Soja: 6.6M / 61.1M = 10.801% -> 10.8%
    // Milho: 1.1M / 61.1M = 1.800% -> 1.8%
    
    expect(concentrations.find(c => c.name === 'Café')?.percentage).toBe(87.4);
    expect(concentrations.find(c => c.name === 'Soja')?.percentage).toBe(10.8);
    expect(concentrations.find(c => c.name === 'Milho')?.percentage).toBe(1.8);
  });
});
