import { describe, it, expect } from 'vitest';
import { VpmService } from '../vpm.service';

describe('VpmService', () => {
  it('should calculate Required Area correctly (Agr-1)', () => {
    const metaVenda = 100000;
    const shareAlvo = 0.2; // 20%
    const itseTotal = 5000;
    const areaReal = 150;

    const result = VpmService.calculateRequiredArea(metaVenda, shareAlvo, itseTotal, areaReal);
    
    // 100,000 / (0.2 * 5000) = 100,000 / 1000 = 100
    expect(result.areaNecessaria).toBe(100);
    expect(result.areaInvalida).toBe(false);
  });

  it('should alert when Required Area exceeds Registered Area', () => {
    const result = VpmService.calculateRequiredArea(200000, 0.2, 5000, 150);
    // 200,000 / 1000 = 200. 200 > 150.
    expect(result.areaInvalida).toBe(true);
    expect(result.alert).toContain('excede');
  });

  it('should calculate Pareto 80/20 with color splitting (Agr-2)', () => {
    const clients = [
      { id: '1', name: 'C1', vpmTotal: 1000 },
      { id: '2', name: 'C2', vpmTotal: 800 },
      { id: '3', name: 'C3', vpmTotal: 600 },
      { id: '4', name: 'C4', vpmTotal: 200 },
      { id: '5', name: 'C5', vpmTotal: 100 },
    ];

    const result = VpmService.calculatePareto(clients);
    
    // Total: 2700
    // 1000/2700 = 37% (Azul)
    // 1800/2700 = 66% (Verde)
    // 2400/2700 = 88.8% (Complementar - Amarelo)
    // 2600/2700 = 96.2% (Complementar - Vermelho)
    
    expect(result[0].performanceBand).toBe('AZUL');
    expect(result[1].performanceBand).toBe('VERDE');
    expect(result[2].performanceBand).toBe('AMARELO');
    expect(result[3].performanceBand).toBe('AMARELO'); // 50% top of complementary
    expect(result[4].performanceBand).toBe('VERMELHO');
  });

  it('should calculate TO-GO balance correctly', () => {
    expect(VpmService.calculateToGo(1000, 700, 100)).toBe(200);
    expect(VpmService.calculateToGo(500, 600, 0)).toBe(0);
  });
});

});
