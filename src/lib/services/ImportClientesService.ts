/**
 * Regra de negócio pura da importação de clientes em massa por CSV — sem
 * I/O, testável do mesmo jeito que VpmService.ts. Extraído de
 * src/app/api/clientes/import/route.ts (que continua fazendo toda a busca
 * no banco e a gravação; só a resolução/validação de cada grupo mora aqui).
 *
 * Regras de agrupamento (uma linha = cliente × cultivo):
 * - Linhas com o mesmo `documento` sempre viram o mesmo cliente.
 * - Linhas SEM `documento` nunca se fundem entre si (evita duas fazendas de
 *   nome igual virarem uma só por engano) — cada uma só vira "atualização"
 *   se bater nome+cidade+uf+ctv com um cliente JÁ EXISTENTE no tenant.
 */

// Uma linha do CSV enviado pelo usuário — campos crus, sem validação ainda.
export interface CsvRow {
  documento?: string;
  nome_cliente?: string;
  cidade?: string;
  uf?: string;
  email_ctv?: string;
  grupo_economico?: string;
  cultivo?: string;
  hectares?: string | number;
}

// Linhas do Supabase (snake_case), só os campos selecionados nas queries
// da rota.
export interface ClienteExistenteRow {
  id: string;
  document: string | null;
  name: string;
  city: string;
  state: string;
  ctv_id: string;
}

export interface AreaExistenteRow {
  id: string;
  customer_id: string;
  crop_name: string;
  area_ha: number;
}

export interface GrupoEconomicoRow {
  id: string;
  nome: string;
}

export interface MemberLike {
  userId: string;
  email: string;
}

export interface AreaResolvida {
  cultivo: string;
  hectares: number;
  valida: boolean;
  motivo?: string;
  areaAnteriorHa?: number | null;
}

export interface GroupResult {
  key: string;
  documento: string | null;
  nome: string;
  cidade: string;
  uf: string;
  ctvEmail: string;
  ctvId: string | null;
  grupoEconomicoNome: string | null;
  grupoEconomicoId: string | null;
  clienteExistenteId: string | null;
  action: 'create' | 'update' | 'error';
  erro: string | null;
  areas: AreaResolvida[];
  resultado?: 'criado' | 'atualizado' | 'erro';
  erroCommit?: string | null;
}

export interface ResolveImportContext {
  /** e-mail (lowercase) -> membro do tenant, pra resolver email_ctv. */
  membersByEmail: Map<string, MemberLike>;
  /** NOME_CULTIVO (uppercase) -> nome de exibição, pra validar `cultivo`. */
  culturasAtivas: Map<string, string>;
  clientesExistentes: ClienteExistenteRow[];
  areasExistentes: AreaExistenteRow[];
  /** NOME_GRUPO (uppercase) -> linha do grupo econômico existente. */
  gruposExistentes: Map<string, GrupoEconomicoRow>;
}

/** Agrupa as linhas cruas do CSV em clientes, por `documento` quando presente. */
function agruparPorCliente(rows: CsvRow[]): { documento: string | null; rows: CsvRow[] }[] {
  const groupsByDoc = new Map<string, CsvRow[]>();
  const rowsSemDoc: CsvRow[] = [];

  for (const row of rows) {
    const doc = String(row.documento || '').trim();
    if (doc) {
      if (!groupsByDoc.has(doc)) groupsByDoc.set(doc, []);
      groupsByDoc.get(doc)!.push(row);
    } else {
      rowsSemDoc.push(row);
    }
  }

  return [
    ...Array.from(groupsByDoc.entries()).map(([documento, groupRows]) => ({ documento, rows: groupRows })),
    ...rowsSemDoc.map((row) => ({ documento: null, rows: [row] })),
  ];
}

/**
 * Agrupa e resolve/valida cada grupo de linhas do CSV contra o estado atual
 * do tenant (membros, culturas, clientes e áreas já cadastrados). Nunca
 * grava nada — é a mesma função usada tanto no preview (`dryRun=true`)
 * quanto no commit, pra preview e gravação nunca divergirem de regra.
 */
export function resolveImportGroups(rows: CsvRow[], ctx: ResolveImportContext): GroupResult[] {
  const { membersByEmail, culturasAtivas, clientesExistentes, areasExistentes, gruposExistentes } = ctx;
  const rawGroups = agruparPorCliente(rows);

  return rawGroups.map((g, idx) => {
    const first = g.rows[0];
    const nome = String(first.nome_cliente || '').trim();
    const cidade = String(first.cidade || '').trim();
    const uf = String(first.uf || '').trim().toUpperCase();
    const ctvEmail = String(first.email_ctv || '').trim().toLowerCase();
    const grupoEconomicoNome = String(first.grupo_economico || '').trim() || null;

    const erros: string[] = [];

    if (!nome) erros.push('nome_cliente é obrigatório');
    if (!cidade) erros.push('cidade é obrigatória');
    if (!uf) erros.push('uf é obrigatória');
    if (!ctvEmail) erros.push('email_ctv é obrigatório');

    // Todas as linhas do grupo têm que concordar no CTV — evita atribuir
    // parte da carteira a um CTV e parte a outro por engano de digitação.
    const emailsDistintos = new Set(g.rows.map((r) => String(r.email_ctv || '').trim().toLowerCase()));
    if (emailsDistintos.size > 1) {
      erros.push('linhas deste cliente têm e-mails de CTV diferentes');
    }

    const member = ctvEmail ? membersByEmail.get(ctvEmail) : undefined;
    if (ctvEmail && !member) {
      erros.push(`e-mail de CTV não encontrado neste tenant: ${ctvEmail}`);
    }

    const existente = g.documento
      ? clientesExistentes.find((c) => c.document === g.documento)
      : clientesExistentes.find(
          (c) =>
            String(c.name).trim().toUpperCase() === nome.toUpperCase() &&
            String(c.city).trim().toUpperCase() === cidade.toUpperCase() &&
            String(c.state).trim().toUpperCase() === uf &&
            member &&
            c.ctv_id === member.userId
        );

    const areas: AreaResolvida[] = g.rows.map((row) => {
      const cultivoRaw = String(row.cultivo || '').trim();
      const hectares = Number(row.hectares);
      const cultivoResolvido = culturasAtivas.get(cultivoRaw.toUpperCase());

      if (!cultivoRaw) return { cultivo: cultivoRaw, hectares: 0, valida: false, motivo: 'cultivo é obrigatório' };
      if (!cultivoResolvido)
        return { cultivo: cultivoRaw, hectares: 0, valida: false, motivo: `cultivo não cadastrado no tenant: ${cultivoRaw}` };
      if (!hectares || hectares <= 0)
        return { cultivo: cultivoResolvido, hectares: 0, valida: false, motivo: 'hectares deve ser maior que zero' };

      const areaAnterior = existente
        ? areasExistentes.find(
            (a) => a.customer_id === existente.id && String(a.crop_name).toUpperCase() === cultivoResolvido.toUpperCase()
          )
        : undefined;

      return {
        cultivo: cultivoResolvido,
        hectares,
        valida: true,
        areaAnteriorHa: areaAnterior ? Number(areaAnterior.area_ha) : null,
      };
    });

    const areasValidas = areas.filter((a) => a.valida);
    if (areasValidas.length === 0) erros.push('nenhuma linha de cultivo válida para este cliente');

    const grupoResolvido = grupoEconomicoNome ? gruposExistentes.get(grupoEconomicoNome.toUpperCase()) : undefined;

    return {
      key: g.documento || `linha-${idx + 1}`,
      documento: g.documento,
      nome,
      cidade,
      uf,
      ctvEmail,
      ctvId: member ? member.userId : null,
      grupoEconomicoNome,
      grupoEconomicoId: grupoResolvido ? grupoResolvido.id : null,
      clienteExistenteId: existente ? existente.id : null,
      action: erros.length > 0 ? 'error' : existente ? 'update' : 'create',
      erro: erros.length > 0 ? erros.join('; ') : null,
      areas,
    };
  });
}
