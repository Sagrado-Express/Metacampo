import { describe, it, expect } from 'vitest';
import { buildItLookup, calcVpm, calcClientVpmTotal } from '../VpmService';

/**
 * Testa o módulo que de fato roda em produção — importado diretamente,
 * não reimplementado. É o motor usado por /api/clientes e
 * /api/planejamento/dashboard-full.
 *
 * A suíte anterior em domain/services/__tests__ testava aritmética copiada
 * à mão em cada arquivo de teste, nunca o código real. Nenhum dos bugs reais
 * encontrados nesta auditoria (RLS quebrado, apetite zerando a matriz,
 * rename de cultura como no-op) teria sido pego por aquilo — porque o teste
 * não tocava o código que continha o bug.
 */

describe('buildItLookup', () => {
  it('monta a chave CULTURA::SEGMENTO em maiúsculas', () => {
    const lookup = buildItLookup([
      { crop_name: 'Soja', segment_name: 'Sementes', value_per_hectare: 45000 },
    ]);
    expect(lookup['SOJA::SEMENTES']).toBe(45000);
  });

  it('aceita tanto o formato snake_case do banco quanto o camelCase da API', () => {
    const lookup = buildItLookup([
      { cultivo: 'Milho', segmento: 'Fertilizantes', valorPorHectareCentavos: 120000 },
    ]);
    expect(lookup['MILHO::FERTILIZANTES']).toBe(120000);
  });

  it('ignora linhas com valor zero ou negativo — não vira fallback silencioso', () => {
    const lookup = buildItLookup([
      { crop_name: 'Soja', segment_name: 'Sementes', value_per_hectare: 0 },
      { crop_name: 'Milho', segment_name: 'Sementes', value_per_hectare: -100 },
    ]);
    expect(Object.keys(lookup)).toHaveLength(0);
  });
});

describe('calcVpm', () => {
  const itLookup = buildItLookup([
    { crop_name: 'Soja', segment_name: 'Sementes', value_per_hectare: 45000 },
  ]);

  it('calcula hectares × Índice Tecnológico', () => {
    const vpm = calcVpm({ hectares: 1200, cropName: 'Soja', segmentName: 'Sementes', itLookup });
    expect(vpm).toBe(1200 * 45000);
  });

  it('é zero sem Índice Tecnológico para a combinação — não inventa valor', () => {
    const vpm = calcVpm({ hectares: 1200, cropName: 'Soja', segmentName: 'Fertilizantes', itLookup });
    expect(vpm).toBe(0);
  });

  it('é zero sem área, mesmo com Índice Tecnológico definido', () => {
    expect(calcVpm({ hectares: 0, cropName: 'Soja', segmentName: 'Sementes', itLookup })).toBe(0);
    expect(calcVpm({ hectares: null, cropName: 'Soja', segmentName: 'Sementes', itLookup })).toBe(0);
  });

  it('não diferencia caixa entre cultura/segmento salvos e consultados', () => {
    const vpm = calcVpm({ hectares: 100, cropName: 'soja', segmentName: 'SEMENTES', itLookup });
    expect(vpm).toBe(100 * 45000);
  });
});

describe('calcClientVpmTotal', () => {
  it('soma VPM por área através de todos os segmentos ativos', () => {
    const itLookup = buildItLookup([
      { crop_name: 'Soja', segment_name: 'Sementes', value_per_hectare: 45000 },
      { crop_name: 'Soja', segment_name: 'Fertilizantes', value_per_hectare: 120000 },
    ]);

    const result = calcClientVpmTotal({
      areas: [{ cropName: 'Soja', areaHa: 1200 }],
      segments: ['Sementes', 'Fertilizantes'],
      itLookup,
    });

    expect(result.vpmTotal).toBe(1200 * 45000 + 1200 * 120000);
    expect(result.areaDetails[0].indiceTecnologicoDefinido).toBe(true);
  });

  it('marca indiceTecnologicoDefinido como false quando nenhum segmento tem IT', () => {
    const result = calcClientVpmTotal({
      areas: [{ cropName: 'Quiabo', areaHa: 300 }],
      segments: ['Sementes'],
      itLookup: buildItLookup([]),
    });

    expect(result.vpmTotal).toBe(0);
    expect(result.areaDetails[0].indiceTecnologicoDefinido).toBe(false);
  });

  it('tenant sem segmento configurado não calcula VPM sobre segmento nenhum', () => {
    const itLookup = buildItLookup([
      { crop_name: 'Soja', segment_name: 'Sementes', value_per_hectare: 45000 },
    ]);
    const result = calcClientVpmTotal({
      areas: [{ cropName: 'Soja', areaHa: 1200 }],
      segments: [],
      itLookup,
    });
    expect(result.vpmTotal).toBe(0);
  });
});
