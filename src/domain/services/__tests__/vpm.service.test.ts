import { describe, it, expect } from 'vitest';
import { VpmService } from '../vpm.service';

describe('VpmService', () => {
  it('should calculate Required Area correctly (Agr-1)', () => {
    const metaVenda = 100000;
    const shareAlvo = 0.2; // 20%
    const itaaTotal = 5000;
    const areaReal = 150;

    const result = VpmService.calculateRequiredArea(metaVenda, shareAlvo, itaaTotal, areaReal);
    
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
    // MC-504: Band assignment uses multicriteria scoring:
    // nota = (vpmScore*0.4) + (shareScore*0.3) + (creditScore*0.2) + (relationshipScore*0.1)
    // AZUL: nota >= 7.0 AND rating in ['A','B']
    // VERMELHO: nota < 4.0 OR share < 0.05
    // VERDE: everything else in strategic group
    const clients = [
      { id: '1', name: 'C1', vpmTotal: 1000, rating: 'A', realizedValue: 800 },  // High VPM + rating A + good share → AZUL
      { id: '2', name: 'C2', vpmTotal: 800,  rating: 'C', realizedValue: 400 },  // Good VPM + rating C (not A/B) + decent share → VERDE
      { id: '3', name: 'C3', vpmTotal: 600,  realizedValue: 10 },                // No rating, low share → VERMELHO
      { id: '4', name: 'C4', vpmTotal: 200 },                                     // Complementary (>80%) → AMARELO
      { id: '5', name: 'C5', vpmTotal: 100 },                                     // Complementary (>90%) → CINZA
    ];

    const result = VpmService.calculatePareto(clients);
    
    // Total: 2700
    // C1: 1000/2700 = 37.04% cumulative → Strategic group (≤80%)
    // C2: 1800/2700 = 66.67% cumulative → Strategic group (≤80%)
    // C3: 2400/2700 = 88.89% cumulative → Complementary (>80%, ≤90%) → AMARELO
    // C4: 2600/2700 = 96.30% cumulative → Complementary (>90%) → CINZA
    // C5: 2700/2700 = 100%  cumulative → Complementary (>90%) → CINZA
    
    expect(result[0].performanceBand).toBe('AZUL');
    expect(result[1].performanceBand).toBe('VERDE');
    expect(result[2].performanceBand).toBe('AMARELO');
    expect(result[3].performanceBand).toBe('CINZA');
    expect(result[4].performanceBand).toBe('CINZA');
  });

  it('should calculate TO-GO balance correctly', () => {
    expect(VpmService.calculateToGo(1000, 700, 100)).toBe(200);
    expect(VpmService.calculateToGo(500, 600, 0)).toBe(0);
  });
});
