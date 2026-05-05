import { describe, it, expect } from 'vitest';
import { VpmService } from '../vpm.service';
import { ITSEConfig, AgriculturalWindow } from '../../../types/schema';

describe('VpmService', () => {
  it('should calculate VPM correctly (Golden Master: 100ha * 3500)', () => {
    const areaHa = 100;
    const itseConfigs: ITSEConfig[] = [
      {
        id: '1',
        empresaId: 'T1',
        safraId: 'S1',
        cultivoId: 'C1',
        productSegmentId: 'PS1',
        valuePerHectare: 3500,
      }
    ];

    const result = VpmService.calculateVPM(areaHa, itseConfigs, 'C1');
    
    expect(result.totalVpm).toBe(350000);
    expect(result.breakdown[0].value).toBe(350000);
  });

  it('should handle multiple product segments with 2-decimal rounding', () => {
    const areaHa = 120.55;
    const itseConfigs: ITSEConfig[] = [
      {
        id: '1',
        empresaId: 'T1',
        safraId: 'S1',
        cultivoId: 'C1',
        productSegmentId: 'PS1',
        valuePerHectare: 1250.40,
      },
      {
        id: '2',
        empresaId: 'T1',
        safraId: 'S1',
        cultivoId: 'C1',
        productSegmentId: 'PS2',
        valuePerHectare: 800.15,
      }
    ];

    const result = VpmService.calculateVPM(areaHa, itseConfigs, 'C1');
    
    expect(result.breakdown[0].value).toBe(150735.72);
    expect(result.breakdown[1].value).toBe(96458.08);
    expect(result.totalVpm).toBe(247193.80);
  });

  it('should determine Performance Bands correctly', () => {
    expect(VpmService.getPerformanceBand(100, 100)).toBe('AZUL');
    expect(VpmService.getPerformanceBand(95, 100)).toBe('VERDE');
    expect(VpmService.getPerformanceBand(75, 100)).toBe('AMARELO');
    expect(VpmService.getPerformanceBand(10, 100)).toBe('VERMELHO');
    expect(VpmService.getPerformanceBand(0, 100)).toBe('CINZA');
  });

  it('should calculate Pareto with qualitative weights', () => {
    const clients = [
      { id: '1', revenue: 100, qualitativeWeight: 1.0 }, // Value: 100
      { id: '2', revenue: 50, qualitativeWeight: 3.0 },  // Value: 150 (Prioritized)
      { id: '3', revenue: 200, qualitativeWeight: 0.5 }, // Value: 100
    ];

    const result = VpmService.calculatePareto(clients);
    
    // Total adjusted: 100 + 150 + 100 = 350
    // Rank: 2 (150/350=42.86%), 1 (250/350=71.43%), 3 (350/350=100%)
    expect(result[0].clientId).toBe('2');
    expect(result[0].cumulativePercentage).toBe(42.86);
    expect(result[1].clientId).toBe('1');
    expect(result[1].cumulativePercentage).toBe(71.43);
  });

  it('should adjust share based on agricultural window', () => {
    const window: AgriculturalWindow = {
      id: 'w1',
      empresaId: 'e1',
      cultivoId: 'c1',
      region: 'Sul',
      plantingStart: new Date('2024-09-01'),
      plantingEnd: new Date('2024-10-31'),
      harvestStart: new Date('2025-02-01'),
      harvestEnd: new Date('2025-04-30'),
    };

    expect(VpmService.calculateAdjustedShare(new Date('2024-10-01'), window)).toBe(1.0);
    expect(VpmService.calculateAdjustedShare(new Date('2025-03-01'), window)).toBe(1.0);
    expect(VpmService.calculateAdjustedShare(new Date('2024-08-01'), window)).toBe(0.0);
  });

  it('should materialize area preferring reported value', () => {
    expect(VpmService.materializeArea(500, 450)).toBe(500);
    expect(VpmService.materializeArea(0, 450)).toBe(450);
  });
});
