"use client";

import React from "react";
import { Passo1Viabilidade } from "@/components/dashboards/gtmgc/Passo1Viabilidade";
import { Passo3e6Cultivo } from "@/components/dashboards/gtmgc/Passo3e6Cultivo";
import { Passo5Apetite } from "@/components/dashboards/gtmgc/Passo5Apetite";
import { Passo7e8MatrizSegmento } from "@/components/dashboards/gtmgc/Passo7e8MatrizSegmento";
import { motion } from "framer-motion";

export default function CockpitGTMGCPage() {
  // Mock Data Baseado na Metodologia GTMGC Documentada
  const mockPasso1 = {
    metaVendas: 8000000,
    shareEstimado: 0.05,
    vpmRealCarteira: 112055000,
  };

  const mockCultivos = [
    { nome: "Café", areaHa: 11000, vpmReal: 97900000, previsaoVendas: 4853600 },
    { nome: "Soja", areaHa: 3450, vpmReal: 12075000, previsaoVendas: 3083750 },
    { nome: "Milho", areaHa: 800, vpmReal: 2080000, previsaoVendas: 7800 },
    { nome: "HF / Algodão", areaHa: 0, vpmReal: 0, previsaoVendas: 0 },
  ];

  const mockApetites = [
    { cliente: "Pedro", cultivo: "Café", valorMedioHa: 8000, itseReferencia: 8900, numSegmentos: 4, shareMedio: 0.89 },
    { cliente: "Paulo (Soja)", cultivo: "Soja", valorMedioHa: 600, itseReferencia: 3500, numSegmentos: 1, shareMedio: 0.17 },
    { cliente: "Rogério (Milho)", cultivo: "Milho", valorMedioHa: 200, itseReferencia: 2600, numSegmentos: 1, shareMedio: 0.07 },
    // Exemplo de Conservador
    { cliente: "José", cultivo: "Café", valorMedioHa: 500, itseReferencia: 8900, numSegmentos: 1, shareMedio: 0.05 },
    // Exemplo de Wishful Thinking
    { cliente: "Carlos", cultivo: "Soja", valorMedioHa: 3400, itseReferencia: 3500, numSegmentos: 1, shareMedio: 0.95 },
  ];

  const mockMatriz = [
    {
      segmento: "Agroquímicos",
      valoresPorCultivo: { Café: 2154400, Soja: 1354750, Milho: 1050 },
      totalSegmento: 3509200,
    },
    {
      segmento: "Fertilizantes",
      valoresPorCultivo: { Café: 1380000, Soja: 1205200, Milho: 3510 },
      totalSegmento: 2588710,
    },
    {
      segmento: "Regulador de Crescimento",
      valoresPorCultivo: { Café: 882000, Soja: 0, Milho: 0 },
      totalSegmento: 882000,
    },
    {
      segmento: "Nutrição",
      valoresPorCultivo: { Café: 357200, Soja: 56100, Milho: 480 },
      totalSegmento: 413780,
    },
    {
      segmento: "Sementes",
      valoresPorCultivo: { Café: 0, Soja: 370000, Milho: 2040 },
      totalSegmento: 372040,
    },
    {
      segmento: "Biológicos",
      valoresPorCultivo: { Café: 80000, Soja: 98700, Milho: 720 },
      totalSegmento: 179420,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-12"
      >
        <header className="border-b border-slate-800 pb-8">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            Cockpit de Inteligência Comercial
          </h1>
          <p className="text-slate-400 text-lg">
            Visão consolidada da carteira baseada na metodologia GTMGC. (Passos 1 a 8)
          </p>
        </header>

        {/* Passo 1 */}
        <section>
          <Passo1Viabilidade {...mockPasso1} />
        </section>

        {/* Passos 3 e 6 */}
        <section>
          <Passo3e6Cultivo cultivos={mockCultivos} />
        </section>

        {/* Passo 5 */}
        <section>
          <Passo5Apetite apetites={mockApetites} />
        </section>

        {/* Passos 7 e 8 */}
        <section>
          <Passo7e8MatrizSegmento matriz={mockMatriz} cultivosAtivos={["Café", "Soja", "Milho"]} />
        </section>
      </motion.div>
    </div>
  );
}
