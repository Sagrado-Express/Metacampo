import { describe, it, expect } from 'vitest';
import {
  resolveFaturamentoImport,
  type ResolveFaturamentoContext,
  type FaturamentoCsvRow,
} from '../FaturamentoImportService';

function baseContext(overrides: Partial<ResolveFaturamentoContext> = {}): ResolveFaturamentoContext {
  return {
    membersByEmail: new Map([['ctv@metacampo.com', { userId: 'user-1', email: 'ctv@metacampo.com' }]]),
    segmentoPorNomeOuApelido: new Map([
      ['sementes', 'Sementes'],
      ['defensivos', 'Defensivos'],
    ]),
    metaPorCtvSegmento: new Map(),
    existentes: new Set(),
    ...overrides,
  };
}

function row(overrides: Partial<FaturamentoCsvRow> = {}): FaturamentoCsvRow {
  return {
    mes: '07',
    email_ctv: 'ctv@metacampo.com',
    segmento: 'Sementes',
    valor_realizado: '1000,00',
    ...overrides,
  };
}

describe('resolveFaturamentoImport — validação de linhas', () => {
  it('exige mes, email_ctv, segmento e valor_realizado', () => {
    const results = resolveFaturamentoImport(
      [row({ mes: '', email_ctv: '', segmento: '', valor_realizado: '' })],
      baseContext()
    );
    expect(results[0].action).toBe('error');
    expect(results[0].erro).toContain('mês inválido');
    expect(results[0].erro).toContain('email_ctv é obrigatório');
    expect(results[0].erro).toContain('segmento é obrigatório');
    expect(results[0].erro).toContain('valor_realizado deve ser maior que zero');
  });

  it('rejeita mês fora de 01-12', () => {
    const results = resolveFaturamentoImport([row({ mes: '13' })], baseContext());
    expect(results[0].action).toBe('error');
    expect(results[0].erro).toContain('mês inválido');
  });

  it('aceita mês de um dígito, preenchendo com zero à esquerda', () => {
    const results = resolveFaturamentoImport([row({ mes: '7' })], baseContext());
    expect(results[0].action).toBe('create');
    expect(results[0].mes).toBe('07');
  });

  it('rejeita e-mail de CTV que não existe no tenant', () => {
    const results = resolveFaturamentoImport([row({ email_ctv: 'fantasma@metacampo.com' })], baseContext());
    expect(results[0].action).toBe('error');
    expect(results[0].erro).toContain('fantasma@metacampo.com');
  });

  it('rejeita segmento não reconhecido no tenant (bloqueia até conciliação manual)', () => {
    const results = resolveFaturamentoImport([row({ segmento: 'Agroquímicos' })], baseContext());
    expect(results[0].action).toBe('error');
    expect(results[0].erro).toContain('Agroquímicos');
  });

  it('resolve segmento case-insensitive e por apelido', () => {
    const ctx = baseContext({
      segmentoPorNomeOuApelido: new Map([['agroquimicos', 'Defensivos']]),
    });
    const results = resolveFaturamentoImport([row({ segmento: 'AGROQUIMICOS' })], ctx);
    expect(results[0].action).toBe('create');
    expect(results[0].segmentoResolvido).toBe('Defensivos');
  });

  it('rejeita valor_realizado zero ou negativo', () => {
    const results = resolveFaturamentoImport([row({ valor_realizado: '0' })], baseContext());
    expect(results[0].action).toBe('error');
    expect(results[0].erro).toContain('valor_realizado');
  });
});

describe('resolveFaturamentoImport — agrupamento e soma', () => {
  it('soma linhas do mesmo mes+ctv+segmento dentro do mesmo CSV', () => {
    const rows = [
      row({ valor_realizado: '1000,00' }),
      row({ valor_realizado: '500,00' }),
    ];
    const results = resolveFaturamentoImport(rows, baseContext());
    expect(results).toHaveLength(1);
    expect(results[0].valorRealizadoCentavos).toBe(150000);
  });

  it('NÃO soma linhas de meses diferentes', () => {
    const rows = [row({ mes: '07' }), row({ mes: '08' })];
    const results = resolveFaturamentoImport(rows, baseContext());
    expect(results).toHaveLength(2);
  });

  it('mantém linhas com erro isoladas, sem entrar no agrupamento das válidas', () => {
    const rows = [row(), row({ segmento: 'Fantasma' })];
    const results = resolveFaturamentoImport(rows, baseContext());
    expect(results).toHaveLength(2);
    expect(results.filter((r) => r.action === 'error')).toHaveLength(1);
    expect(results.filter((r) => r.action !== 'error')).toHaveLength(1);
  });
});

describe('resolveFaturamentoImport — meta e create vs update', () => {
  it('busca a meta pelo par ctvId+segmento resolvido', () => {
    const ctx = baseContext({
      metaPorCtvSegmento: new Map([['user-1|Sementes', 500000]]),
    });
    const results = resolveFaturamentoImport([row()], ctx);
    expect(results[0].valorMetaCentavos).toBe(500000);
  });

  it('meta 0 é válida (segmento vendido sem planejamento não é erro)', () => {
    const results = resolveFaturamentoImport([row()], baseContext());
    expect(results[0].action).toBe('create');
    expect(results[0].valorMetaCentavos).toBe(0);
  });

  it('vira "update" quando a combinação mes+ctv+segmento já existe', () => {
    const ctx = baseContext({ existentes: new Set(['07|user-1|Sementes']) });
    const results = resolveFaturamentoImport([row()], ctx);
    expect(results[0].action).toBe('update');
  });
});
