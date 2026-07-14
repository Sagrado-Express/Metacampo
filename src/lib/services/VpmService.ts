/**
 * VpmService — Centralized VPM Calculation
 *
 * VPM = hectares(cliente, cultura) × IT(cultura, segmento)
 *
 * Rules:
 * - No IT configured → VPM = 0 (NO fallback, NO default)
 * - Area = 0 or null → VPM = 0
 * - IT = 0 or null → VPM = 0
 *
 * The IT lookup uses crop name (string) and segment name (string) as keys,
 * matching the schema of it_se_configurations (crop_name, segment_name).
 */

export interface ItLookup {
  [key: string]: number; // key: `${cropName}::${segmentName}` → value in centavos per hectare
}

export function buildItLookup(itRows: Array<{
  cultivo?: string;
  crop_name?: string;
  segmento?: string;
  segment_name?: string;
  valorPorHectareCentavos?: number;
  value_per_hectare?: number;
}>): ItLookup {
  const lookup: ItLookup = {};
  for (const row of itRows) {
    const cropName = (row.cultivo || row.crop_name || '').toUpperCase();
    const segName = (row.segmento || row.segment_name || '').toUpperCase();
    const value = Number(row.valorPorHectareCentavos ?? row.value_per_hectare ?? 0);

    // Only include if IT value is a positive number
    if (cropName && segName && value > 0) {
      lookup[`${cropName}::${segName}`] = value;
    }
  }
  return lookup;
}

export function calcVpm(params: {
  hectares: number | null | undefined;
  cropName: string;
  segmentName: string;
  itLookup: ItLookup;
}): number {
  const { hectares, cropName, segmentName, itLookup } = params;

  // Rule 1: no area → VPM 0
  if (!hectares || hectares <= 0) return 0;

  // Rule 2: no IT configured → VPM 0 (NO fallback, NO default)
  const key = `${cropName.toUpperCase()}::${segmentName.toUpperCase()}`;
  const it = itLookup[key];
  if (it == null || it <= 0) return 0;

  return Math.round(hectares * it);
}

/**
 * Calculate total VPM for a client across all their crop areas and all active segments.
 */
export function calcClientVpmTotal(params: {
  areas: Array<{ cropName: string; areaHa: number }>;
  segments: string[];
  itLookup: ItLookup;
}): {
  vpmTotal: number;
  vpmPorCultura: Record<string, number>;
  vpmPorSegmento: Record<string, number>;
  areaDetails: Array<{
    cropName: string;
    areaHa: number;
    vpmCentavos: number;
    indiceTecnologicoDefinido: boolean;
  }>;
} {
  const { areas, segments, itLookup } = params;
  let vpmTotal = 0;
  const vpmPorCultura: Record<string, number> = {};
  const vpmPorSegmento: Record<string, number> = {};
  const areaDetails: Array<{
    cropName: string;
    areaHa: number;
    vpmCentavos: number;
    indiceTecnologicoDefinido: boolean;
  }> = [];

  for (const area of areas) {
    let areaTotalVpm = 0;
    let hasAnyIt = false;

    for (const seg of segments) {
      const vpm = calcVpm({
        hectares: area.areaHa,
        cropName: area.cropName,
        segmentName: seg,
        itLookup,
      });
      areaTotalVpm += vpm;
      if (vpm > 0) hasAnyIt = true;

      // Track per-segment totals
      vpmPorSegmento[seg] = (vpmPorSegmento[seg] || 0) + vpm;
    }

    vpmPorCultura[area.cropName] = (vpmPorCultura[area.cropName] || 0) + areaTotalVpm;
    vpmTotal += areaTotalVpm;

    areaDetails.push({
      cropName: area.cropName,
      areaHa: area.areaHa,
      vpmCentavos: areaTotalVpm,
      indiceTecnologicoDefinido: hasAnyIt,
    });
  }

  return { vpmTotal, vpmPorCultura, vpmPorSegmento, areaDetails };
}
