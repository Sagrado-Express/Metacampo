import { Forecast } from '../types/blueprint';

export class ForecastEngine {
  /**
   * Passo 7: Motor de Forecast "TO GO"
   * Racional: O planejamento original (CTV) é o alvo. 
   * O faturamento realizado (Real YTD) subtrai desse alvo para gerar o "TO GO".
   */
  static calculateToGo(realYTD: number, previsaoOriginal: number): Forecast {
    const toGo = Math.max(0, previsaoOriginal - realYTD);
    const forecastTotal = realYTD + toGo;
    
    let status: 'GAP' | 'ON_TRACK' | 'OVER' = 'ON_TRACK';
    
    // Se o realizado já passou a previsão original
    if (realYTD > previsaoOriginal) {
      status = 'OVER';
    } else if (forecastTotal < previsaoOriginal) {
      // Isso tecnicamente não aconteceria na fórmula Forecast = Real + TO_GO 
      // a menos que o TO GO seja limitado por alguma regra.
      status = 'GAP';
    }

    return {
      realYTD,
      previsaoOriginal,
      toGo,
      forecastTotal,
      status
    };
  }

  /**
   * Compara o Forecast com o Budget definido pelo Gestor
   */
  static compareWithBudget(forecast: number, budget: number): { 
    hasGap: boolean; 
    gapValue: number;
    percent: number;
  } {
    const gapValue = budget - forecast;
    const hasGap = gapValue > 0;
    const percent = budget > 0 ? (forecast / budget) * 100 : 0;

    return {
      hasGap,
      gapValue: Math.max(0, gapValue),
      percent
    };
  }
}
