export class VisitService {
  /**
   * Passo 9: Calcula a demanda total de visitas e valida contra a capacidade
   */
  static calculateCapacity(
    counts: { azul: number; verde: number; amarelo: number; vermelho: number },
    frequencies: { azul: number; verde: number; amarelo: number; vermelho: number },
    workingDays: number = 20
  ): {
    demandaTotal: number;
    isPossivel: boolean;
    excesso: number;
  } {
    const demandaTotal = 
      (counts.azul * frequencies.azul) +
      (counts.verde * frequencies.verde) +
      (counts.amarelo * frequencies.amarelo) +
      (counts.vermelho * frequencies.vermelho);

    const isPossivel = demandaTotal <= workingDays;
    const excesso = Math.max(0, demandaTotal - workingDays);

    return {
      demandaTotal,
      isPossivel,
      excesso
    };
  }
}
