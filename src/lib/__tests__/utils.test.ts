import { describe, it, expect } from 'vitest';
import { parseBRLParaCentavos } from '../utils';

describe('parseBRLParaCentavos', () => {
  it('aceita vírgula como decimal (pt-BR)', () => {
    expect(parseBRLParaCentavos('4000,00')).toBe(400000);
    expect(parseBRLParaCentavos('4.000,00')).toBe(400000);
    expect(parseBRLParaCentavos('R$ 1.234,56')).toBe(123500); // 1234,56 arredonda pra 1235
  });

  it('aceita ponto como decimal (CSV/Excel, en-US) — bug real de 15/09/2026', () => {
    expect(parseBRLParaCentavos('4000.00')).toBe(400000);
    expect(parseBRLParaCentavos('1000.00')).toBe(100000);
    expect(parseBRLParaCentavos('45000.00')).toBe(4500000);
  });

  it('trata ponto como separador de milhar quando não há decimal (exatos 3 dígitos depois)', () => {
    expect(parseBRLParaCentavos('4.000')).toBe(400000);
    expect(parseBRLParaCentavos('1.500')).toBe(150000);
  });

  it('aceita número puro, sem separador', () => {
    expect(parseBRLParaCentavos('4000')).toBe(400000);
    expect(parseBRLParaCentavos('500')).toBe(50000);
  });

  it('arredonda pro real mais próximo antes de converter (sem centavos fracionados)', () => {
    expect(parseBRLParaCentavos('12.50')).toBe(1300); // 2 dígitos depois do ponto = decimal, 12.5 -> arredonda 13
  });

  it('retorna 0 pra texto vazio ou inválido', () => {
    expect(parseBRLParaCentavos('')).toBe(0);
    expect(parseBRLParaCentavos('abc')).toBe(0);
  });
});
