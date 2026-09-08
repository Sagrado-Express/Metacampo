"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Sprout,
  TreePine,
  Layers,
  X,
  Check,
  ArrowRightLeft,
  ChevronUp,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/utils";
import { CATALOGO_IBGE, type TipoCultura } from "@/data/culturas_ibge";
import { useConfirm } from "@/components/ConfirmDialog";

// ============================================================
// Types (local to this component, mirrors TenantClassificacao)
// ============================================================

export interface ClassificacaoItem {
  id: string;
  internalKey: string;
  parentKey: string | null;
  customName: string;
  aliases: string[];
  isActive: boolean;
  displayOrder: number;
  color: string;
}

export interface CulturaIbgeProdutoItem {
  produto: string;
  /** Null quando o produto não está no catálogo oficial (de-para livre). */
  tipo: TipoCultura | null;
}

export interface CulturaItem {
  id: string;
  internalKey: string;
  customName: string;
  aliases: string[];
  isActive: boolean;
  displayOrder: number;
  /** Produtos do catálogo IBGE associados (de-para) — 0, 1 ou N. Uma cultura
   *  própria (ex.: HF) pode agregar vários (ex.: Tomate + Batata-inglesa). */
  ibgeProdutos: CulturaIbgeProdutoItem[];
}

interface SegmentSettingsProps {
  /** Só é lido quando a seção de Grupo de Produtos está visível (showOnlyClassifications). */
  classificacoes?: ClassificacaoItem[];
  /** Só é lido quando a seção de Cultura está visível (showOnlyCulturas). */
  culturas?: CulturaItem[];
  onSaveClassificacao: (item: ClassificacaoItem) => Promise<void>;
  /** Troca um apelido com o nome de exibição atual. */
  onPromoteAlias: (id: string, alias: string) => Promise<void>;
  onCreateClassificacao: (customName: string, parentKey?: string | null) => Promise<void>;
  onDeleteClassificacao: (id: string) => Promise<void>;
  onSaveCultura: (item: CulturaItem) => Promise<void>;
  onCreateCultura: (customName: string) => Promise<void>;
  onDeleteCultura: (id: string) => Promise<void>;
  /** Habilita um produto do catálogo IBGE, reaproveitando o registro do tenant
   *  se ele já existiu e foi desligado. Sem isto, o campo de busca só cria
   *  culturas próprias (sem vínculo IBGE). */
  onHabilitarDoCatalogo?: (produto: string, tipo: TipoCultura) => Promise<void>;
  /** Cria um segundo cultivo apontando pro mesmo produto do catálogo, com nome
   *  próprio — caso de Milho safra vs. Milho safrinha. */
  onAdicionarVariante?: (produto: string, tipo: TipoCultura, customName: string) => Promise<void>;
  /** De-Para: associa mais um produto IBGE (ou fora do catálogo, tipo null)
   *  a uma cultura já existente. */
  onAddProdutoIbge?: (culturaId: string, produto: string, tipo: TipoCultura | null) => Promise<void>;
  /** Remove uma associação do de-para — a cultura em si não é afetada. */
  onRemoveProdutoIbge?: (culturaId: string, produto: string) => Promise<void>;
  /** Substitui uma cultura por outra já existente em todo o dado do tenant
   *  (clientes, Índice Tecnológico, planejamento) — pra permitir excluir a
   *  de origem depois sem reeditar cliente por cliente. */
  onSubstituirCultura?: (
    fromId: string,
    toId: string
  ) => Promise<{ areas: number; areasConflito: number; it: number; itConflito: number; planejamento: number; planejamentoConflito: number }>;
  /** When true, renders only the Culturas section (used by the Cultura tab). */
  showOnlyCulturas?: boolean;
  /** When true, renders only the Grupos de Produtos section (used by the Grupos de Produtos tab). */
  showOnlyClassifications?: boolean;
  /** Apelido do tenant pro conceito "Grupo de Produtos" (ex.: "Segmento").
   *  Undefined/vazio usa o rótulo padrão. */
  labelGrupoProduto?: string;
  /** Quando presente, o título da seção vira editável (clique pra trocar o
   *  apelido). null limpa o apelido e volta pro rótulo padrão. */
  onChangeLabelGrupoProduto?: (label: string | null) => Promise<void>;
  /** Pré-preenche a busca de cultura (deep-link do aviso "Cultura não
   *  cadastrada: X" em Meus Clientes, pra não obrigar o usuário a digitar o
   *  nome de novo). */
  initialCulturaSearch?: string;
}

// ============================================================
// Component
// ============================================================

/**
 * SegmentSettings: Tenant Parametrization Admin Page
 *
 * "Passo 0" — the tenant configures their product classifications
 * and crops here before any commercial setup.
 *
 * Per meeting Daniel × Marco Polo (16/06/2026):
 * "Como você quer chamar esse campo? O cara dá o nome."
 *
 * Design: Morning Dew (Glass cards, Framer Motion micro-animations)
 * UI Label: "Grupo de Produtos" (renomeado de "Classificação de Produtos"
 * a pedido do Marco Polo, 13/08/2026 — o tenant também pode trocar esse
 * rótulo pelo termo que já usa, ex. "Segmento" (17/08/2026).
 */
export function SegmentSettings({
  classificacoes = [],
  culturas = [],
  onSaveClassificacao,
  onPromoteAlias,
  onCreateClassificacao,
  onDeleteClassificacao,
  onSaveCultura,
  onCreateCultura,
  onDeleteCultura,
  onHabilitarDoCatalogo,
  onAdicionarVariante,
  onAddProdutoIbge,
  onRemoveProdutoIbge,
  onSubstituirCultura,
  showOnlyCulturas = false,
  showOnlyClassifications = false,
  labelGrupoProduto: labelGrupoProdutoProp,
  onChangeLabelGrupoProduto,
  initialCulturaSearch,
}: SegmentSettingsProps) {
  const labelGrupoProduto = labelGrupoProdutoProp?.trim() || "Grupo de Produtos";
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(labelGrupoProduto);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [newClassName, setNewClassName] = useState("");
  const [newSubClassName, setNewSubClassName] = useState<Record<string, string>>({});
  const [culturaSearch, setCulturaSearch] = useState(initialCulturaSearch || "");
  const [showCulturaSuggestions, setShowCulturaSuggestions] = useState(!!initialCulturaSearch);
  const [addingVarianteFor, setAddingVarianteFor] = useState<string | null>(null);
  const [varianteDraft, setVarianteDraft] = useState("");
  const [addingProdutoFor, setAddingProdutoFor] = useState<string | null>(null);
  const [produtoDraft, setProdutoDraft] = useState("");
  const [editingAliases, setEditingAliases] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<{ kind: "classificacao" | "cultura"; id: string } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  // Erro de nome duplicado (ou outro) destacado no próprio campo, além do
  // toast — um toast passa despercebido se o usuário já rolou a tela
  // (sugestão de UX, 05/09/2026).
  const [renameError, setRenameError] = useState<string | null>(null);
  const [dragCulturaIdx, setDragCulturaIdx] = useState<number | null>(null);
  const [dragClassificacaoIdx, setDragClassificacaoIdx] = useState<number | null>(null);
  // Índice sobre o qual o mouse está passando durante o arrasto — separado
  // do índice arrastado (dragCulturaIdx), pra poder destacar o ALVO do
  // drop, não só o item sendo movido (pedido do Marco Polo, 03/09/2026:
  // "não tá mostrando pra onde ele tá mudando quando arrasto").
  const [dragOverCulturaIdx, setDragOverCulturaIdx] = useState<number | null>(null);
  const [dragOverClassificacaoIdx, setDragOverClassificacaoIdx] = useState<number | null>(null);
  const [substituindoCultura, setSubstituindoCultura] = useState<string | null>(null);
  const [substituirDraft, setSubstituirDraft] = useState("");
  const [substituindo, setSubstituindo] = useState(false);
  const [editingAliasText, setEditingAliasText] = useState<{ itemId: string; alias: string } | null>(null);
  const [aliasEditDraft, setAliasEditDraft] = useState("");
  const [aliasEditError, setAliasEditError] = useState<string | null>(null);
  // Substitui window.confirm() nativo — some da tela sem seguir a
  // identidade visual e não dá pra automatizar em teste (achado 05/09/2026).
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Separate roots and children. Memoizado: qualquer tecla digitada em
  // qualquer campo da tela (busca, alias, nome de subgrupo) re-renderiza o
  // componente inteiro, e sem memo esse filter (e o de getChildren, chamado
  // uma vez por root) eram refeitos O(roots × classificacoes) a cada uma
  // dessas teclas. Achado em auditoria de performance 31/08/2026.
  const roots = useMemo(() => classificacoes.filter((c) => c.parentKey === null), [classificacoes]);
  const childrenByParentKey = useMemo(() => {
    const map = new Map<string, ClassificacaoItem[]>();
    for (const c of classificacoes) {
      if (c.parentKey === null) continue;
      if (!map.has(c.parentKey)) map.set(c.parentKey, []);
      map.get(c.parentKey)!.push(c);
    }
    return map;
  }, [classificacoes]);
  const getChildren = (parentKey: string) => childrenByParentKey.get(parentKey) || [];

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const commitLabelGrupoProduto = async () => {
    setEditingLabel(false);
    const trimmed = labelDraft.trim();
    if (!onChangeLabelGrupoProduto || trimmed === labelGrupoProduto) return;
    try {
      // Campo vazio = volta pro rótulo padrão "Grupo de Produtos".
      await onChangeLabelGrupoProduto(trimmed || null);
      toast.success("Nome do grupo de produtos atualizado");
    } catch (err) {
      setLabelDraft(labelGrupoProduto);
      toast.error(getErrorMessage(err) || "Erro ao salvar o nome");
    }
  };

  const handleCreateClassificacao = async () => {
    if (!newClassName.trim()) return;
    try {
      await onCreateClassificacao(newClassName.trim());
      setNewClassName("");
      toast.success("Grupo de produto criado");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao criar grupo de produto");
    }
  };

  const handleCreateSubClassificacao = async (parentKey: string) => {
    const name = newSubClassName[parentKey]?.trim();
    if (!name) return;
    try {
      await onCreateClassificacao(name, parentKey);
      setNewSubClassName((prev) => ({ ...prev, [parentKey]: "" }));
      toast.success("Subgrupo criado");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao criar subgrupo");
    }
  };

  // ─── Busca no catálogo IBGE + criação livre (tela unificada, 19/08/2026) ───
  // Produtos do catálogo que já têm uma cultura ATIVA vinculada não aparecem
  // mais como sugestão (não faz sentido "habilitar" de novo o que já está na
  // lista) — inativos continuam aparecendo, escolhê-los reativa o registro
  // existente (mesma lógica de onHabilitarDoCatalogo).
  const produtosAtivos = useMemo(() => {
    const set = new Set<string>();
    culturas.forEach((c) => {
      if (!c.isActive) return;
      c.ibgeProdutos.forEach((p) => set.add(p.produto));
    });
    return set;
  }, [culturas]);

  const normalizar = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const sugestoesCatalogo = useMemo(() => {
    const q = normalizar(culturaSearch.trim());
    if (!q) return [];
    return CATALOGO_IBGE.filter(
      (p) => !produtosAtivos.has(p.nome) && normalizar(p.nome).includes(q)
    ).slice(0, 6);
  }, [culturaSearch, produtosAtivos]);

  const handleSelecionarCatalogo = async (produto: string, tipo: TipoCultura) => {
    if (!onHabilitarDoCatalogo) return;
    setCulturaSearch("");
    setShowCulturaSuggestions(false);
    try {
      await onHabilitarDoCatalogo(produto, tipo);
      toast.success(`${produto} habilitada`);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao habilitar cultura");
    }
  };

  const handleCreateCultura = async () => {
    const nome = culturaSearch.trim();
    if (!nome) return;
    setCulturaSearch("");
    setShowCulturaSuggestions(false);
    try {
      await onCreateCultura(nome);
      toast.success("Cultura criada");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao criar cultura");
    }
  };

  const salvarVariante = async (produto: string, tipo: TipoCultura) => {
    const nome = varianteDraft.trim();
    setAddingVarianteFor(null);
    setVarianteDraft("");
    if (!nome || !onAdicionarVariante) return;
    try {
      await onAdicionarVariante(produto, tipo, nome);
      toast.success("Variante criada");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao criar variante");
    }
  };

  // ─── De-Para: N produtos IBGE por cultura (31/08/2026) ───
  // Sugestões do mini-buscador de associação, restritas aos produtos que
  // ESTA cultura ainda não tem — diferente de produtosAtivos (que olha o
  // tenant inteiro), aqui o mesmo produto só não pode repetir na MESMA
  // cultura (a unique é por tenant_cultura_id, não por tenant inteiro).
  const sugerirProdutosParaCultura = (cultura: CulturaItem, query: string) => {
    const q = normalizar(query.trim());
    if (!q) return [];
    const jaLigados = new Set(cultura.ibgeProdutos.map((p) => p.produto));
    return CATALOGO_IBGE.filter((p) => !jaLigados.has(p.nome) && normalizar(p.nome).includes(q)).slice(0, 5);
  };

  const salvarProdutoIbge = async (cultura: CulturaItem, produto: string, tipo: TipoCultura | null) => {
    setAddingProdutoFor(null);
    setProdutoDraft("");
    if (!produto.trim() || !onAddProdutoIbge) return;
    try {
      await onAddProdutoIbge(cultura.id, produto.trim(), tipo);
      toast.success("Produto associado");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao associar produto");
    }
  };

  const removerProdutoIbge = async (cultura: CulturaItem, produto: string) => {
    if (!onRemoveProdutoIbge) return;
    try {
      await onRemoveProdutoIbge(cultura.id, produto);
      toast.success("Associação removida");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao remover associação");
    }
  };

  const handleAddAlias = async (item: ClassificacaoItem) => {
    const alias = editingAliases[item.id]?.trim();
    if (!alias) return;

    const updatedAliases = [...item.aliases, alias];
    try {
      await onSaveClassificacao({ ...item, aliases: updatedAliases });
      setEditingAliases((prev) => ({ ...prev, [item.id]: "" }));
      toast.success("Apelido adicionado");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao adicionar apelido");
    }
  };

  const handlePromoteAlias = async (item: ClassificacaoItem, alias: string) => {
    const ok = await confirm({
      title: `Usar "${alias}" como nome deste grupo de produto?`,
      message:
        `"${item.customName}" passa a ser apelido, então o reconhecimento de CSV/ERP continua funcionando.\n` +
        `O código interno (${item.internalKey}) não muda.`,
      confirmLabel: "Usar como nome",
    });
    if (!ok) return;
    try {
      await onPromoteAlias(item.id, alias);
      toast.success(`"${alias}" agora é o nome`);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao trocar o nome");
    }
  };

  const handleRemoveAlias = async (item: ClassificacaoItem, aliasToRemove: string) => {
    const updatedAliases = item.aliases.filter((a) => a !== aliasToRemove);
    try {
      await onSaveClassificacao({ ...item, aliases: updatedAliases });
      toast.success("Apelido removido");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao remover apelido");
    }
  };

  // ─── Apelidos de cultura ───
  // Mesmo padrão de classificações (add/promover/remover), só que reaproveitando
  // onSaveCultura direto — cultura não tem um endpoint dedicado de "promover
  // alias" como classificação (onPromoteAlias), mas updateCultura já aceita
  // customName+aliases juntos no mesmo PATCH e já propaga o rename pras tabelas
  // dependentes, então não precisa de um endpoint novo pra isso.
  const handleAddCulturaAlias = async (item: CulturaItem) => {
    const alias = editingAliases[item.id]?.trim();
    if (!alias || item.aliases.includes(alias)) return;

    const updatedAliases = [...item.aliases, alias];
    try {
      await onSaveCultura({ ...item, aliases: updatedAliases });
      setEditingAliases((prev) => ({ ...prev, [item.id]: "" }));
      toast.success("Apelido adicionado");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao adicionar apelido");
    }
  };

  const handlePromoteCulturaAlias = async (item: CulturaItem, alias: string) => {
    const ok = await confirm({
      title: `Usar "${alias}" como nome desta cultura?`,
      message:
        `"${item.customName}" passa a ser apelido, então o reconhecimento de CSV/ERP continua funcionando.\n` +
        `O código interno (${item.internalKey}) não muda.`,
      confirmLabel: "Usar como nome",
    });
    if (!ok) return;
    const restantes = item.aliases.filter((a) => a.toLowerCase() !== alias.toLowerCase());
    const jaTem = restantes.some((a) => a.toLowerCase() === item.customName.toLowerCase());
    const novosAliases = jaTem ? restantes : [...restantes, item.customName];
    try {
      await onSaveCultura({ ...item, customName: alias, aliases: novosAliases });
      toast.success(`"${alias}" agora é o nome`);
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao trocar o nome");
    }
  };

  const handleRemoveCulturaAlias = async (item: CulturaItem, aliasToRemove: string) => {
    const updatedAliases = item.aliases.filter((a) => a !== aliasToRemove);
    try {
      await onSaveCultura({ ...item, aliases: updatedAliases });
      toast.success("Apelido removido");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao remover apelido");
    }
  };

  // ─── Editar o texto de um apelido já existente (sem remover e recriar) ───
  const startEditAliasText = (itemId: string, alias: string) => {
    setEditingAliasText({ itemId, alias });
    setAliasEditDraft(alias);
    setAliasEditError(null);
  };

  const commitEditCulturaAliasText = async (item: CulturaItem) => {
    if (!editingAliasText) return;
    const novo = aliasEditDraft.trim();
    const { alias: antigo } = editingAliasText;
    if (!novo || novo === antigo) {
      setEditingAliasText(null);
      setAliasEditError(null);
      return;
    }
    if (item.aliases.some((a) => a !== antigo && a.toLowerCase() === novo.toLowerCase())) {
      setAliasEditError(`"${novo}" já é um apelido desta cultura.`);
      return;
    }
    const updatedAliases = item.aliases.map((a) => (a === antigo ? novo : a));
    try {
      await onSaveCultura({ ...item, aliases: updatedAliases });
      setEditingAliasText(null);
      setAliasEditError(null);
      toast.success("Apelido atualizado");
    } catch (err) {
      const message = getErrorMessage(err) || "Erro ao atualizar apelido";
      setAliasEditError(message);
      toast.error(message);
    }
  };

  const commitEditClassificacaoAliasText = async (item: ClassificacaoItem) => {
    if (!editingAliasText) return;
    const novo = aliasEditDraft.trim();
    const { alias: antigo } = editingAliasText;
    if (!novo || novo === antigo) {
      setEditingAliasText(null);
      setAliasEditError(null);
      return;
    }
    if (item.aliases.some((a) => a !== antigo && a.toLowerCase() === novo.toLowerCase())) {
      setAliasEditError(`"${novo}" já é um apelido deste grupo de produto.`);
      return;
    }
    const updatedAliases = item.aliases.map((a) => (a === antigo ? novo : a));
    try {
      await onSaveClassificacao({ ...item, aliases: updatedAliases });
      setEditingAliasText(null);
      setAliasEditError(null);
      toast.success("Apelido atualizado");
    } catch (err) {
      const message = getErrorMessage(err) || "Erro ao atualizar apelido";
      setAliasEditError(message);
      toast.error(message);
    }
  };

  // ─── Substituição em massa (03/09/2026) ───
  // Repointa clientes/Índice Tecnológico/planejamento de uma cultura pra
  // outra já existente — pra viabilizar excluir a de origem sem reeditar
  // cliente por cliente. Conflitos (mesmo cliente/segmento com dado nas
  // duas) descartam o valor da origem, mantendo o da cultura de destino.
  const handleConfirmSubstituir = async (fromCultura: CulturaItem) => {
    const toId = substituirDraft;
    if (!toId || !onSubstituirCultura) return;
    const destino = culturas.find((c) => c.id === toId);
    if (!destino) return;
    const ok = await confirm({
      title: `Substituir "${fromCultura.customName}" por "${destino.customName}" em todo o sistema?`,
      message:
        `Todos os clientes, Índice Tecnológico e planejamento que hoje usam "${fromCultura.customName}" passam a usar "${destino.customName}". ` +
        `Onde o mesmo cliente/segmento já tiver dado nas duas culturas, o de "${destino.customName}" prevalece.\n\n` +
        `"${fromCultura.customName}" não é excluída automaticamente — fica sem uso, e o botão de excluir passa a funcionar nela.\n\n` +
        `Essa ação não pode ser desfeita.`,
      confirmLabel: "Substituir",
      danger: true,
    });
    if (!ok) return;
    setSubstituindo(true);
    try {
      const resultado = await onSubstituirCultura(fromCultura.id, toId);
      const partes: string[] = [];
      if (resultado.areas) partes.push(`${resultado.areas} área(s) de cliente`);
      if (resultado.it) partes.push(`${resultado.it} config. de Índice Tecnológico`);
      if (resultado.planejamento) partes.push(`${resultado.planejamento} linha(s) de planejamento`);
      const conflitos = resultado.areasConflito + resultado.itConflito + resultado.planejamentoConflito;
      toast.success(
        partes.length
          ? `Substituído: ${partes.join(", ")}${conflitos ? ` — ${conflitos} conflito(s) mantiveram o valor de "${destino.customName}"` : ""}`
          : "Nenhum dado precisou ser substituído"
      );
      setSubstituindoCultura(null);
      setSubstituirDraft("");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao substituir cultura");
    } finally {
      setSubstituindo(false);
    }
  };

  const handleToggleActive = async (item: ClassificacaoItem) => {
    try {
      await onSaveClassificacao({ ...item, isActive: !item.isActive });
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao atualizar");
    }
  };

  const handleColorChange = async (item: ClassificacaoItem, color: string) => {
    try {
      await onSaveClassificacao({ ...item, color });
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao alterar cor");
    }
  };

  // ─── Renomeação inline ───
  const startRename = (kind: "classificacao" | "cultura", id: string, currentName: string) => {
    setRenaming({ kind, id });
    setRenameDraft(currentName);
    setRenameError(null);
  };

  const commitRename = async (item: ClassificacaoItem | CulturaItem) => {
    const name = renameDraft.trim();
    if (!name || name === item.customName) {
      setRenaming(null);
      setRenameError(null);
      return;
    }
    try {
      if (renaming?.kind === "cultura") {
        await onSaveCultura({ ...(item as CulturaItem), customName: name });
      } else {
        await onSaveClassificacao({ ...(item as ClassificacaoItem), customName: name });
      }
      setRenaming(null);
      setRenameError(null);
      toast.success("Nome atualizado");
    } catch (err) {
      // Mantém o campo aberto com o erro destacado, em vez de fechar e só
      // avisar no toast — o usuário já está olhando pra esse input.
      const message = getErrorMessage(err) || "Erro ao renomear";
      setRenameError(message);
      toast.error(message);
    }
  };

  // ─── Exclusão com confirmação ───
  const handleDeleteCulturaClick = async (cultura: CulturaItem) => {
    const ok = await confirm({
      title: `Excluir "${cultura.customName}" de vez?`,
      message:
        "Só funciona se nenhum cliente, Índice Tecnológico ou planejamento já usa essa cultura — nesse caso, use o interruptor ao lado pra desabilitar em vez de excluir.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await onDeleteCultura(cultura.id);
      toast.success("Cultura excluída de vez");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao excluir cultura");
    }
  };

  const handleDeleteClassificacaoClick = async (item: ClassificacaoItem) => {
    const ok = await confirm({
      title: `Excluir o grupo de produto "${item.customName}"?`,
      message: "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      danger: true,
    });
    if (!ok) return;
    try {
      await onDeleteClassificacao(item.id);
      toast.success("Grupo de produto excluído");
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao excluir grupo de produto");
    }
  };

  // ─── Reordenação por arrastar (GripVertical) ───
  // displayOrder é reatribuído sequencialmente (0..N-1) pra lista inteira a
  // cada drop, não só pros dois itens trocados: a maioria dos registros
  // existentes nasceu com displayOrder 0 (default), então só mexer nos dois
  // extremos não bastaria pra fixar uma ordem real.
  const handleReorderCulturas = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const reordered = [...culturas];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    try {
      await Promise.all(
        reordered
          .map((c, displayOrder) => ({ c, displayOrder }))
          .filter(({ c, displayOrder }) => c.displayOrder !== displayOrder)
          .map(({ c, displayOrder }) => onSaveCultura({ ...c, displayOrder }))
      );
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao reordenar");
    }
  };

  const handleReorderClassificacoes = async (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const reordered = [...roots];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    try {
      await Promise.all(
        reordered
          .map((c, displayOrder) => ({ c, displayOrder }))
          .filter(({ c, displayOrder }) => c.displayOrder !== displayOrder)
          .map(({ c, displayOrder }) => onSaveClassificacao({ ...c, displayOrder }))
      );
    } catch (err) {
      toast.error(getErrorMessage(err) || "Erro ao reordenar");
    }
  };

  // Input de renomeação reutilizável
  const renderRenameInput = (item: ClassificacaoItem | CulturaItem) => (
    <span className="relative inline-block">
      <input
        autoFocus
        type="text"
        value={renameDraft}
        onChange={(e) => {
          setRenameDraft(e.target.value);
          if (renameError) setRenameError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitRename(item);
          else if (e.key === "Escape") {
            setRenaming(null);
            setRenameError(null);
          }
        }}
        onBlur={() => commitRename(item)}
        className={`px-2 py-1 rounded-lg border-2 bg-white text-sm font-medium outline-none w-44 ${
          renameError ? "border-red-400 focus:ring-1 focus:ring-red-300" : "border-primary/60"
        }`}
      />
      {renameError && (
        <span className="absolute left-0 top-full mt-1 z-10 w-56 text-[10px] leading-snug text-red-600 bg-white border border-red-200 rounded-lg px-2 py-1 shadow-md">
          {renameError}
        </span>
      )}
    </span>
  );

  // ============================================================
  // Render
  // ============================================================

  // Determine which sections to show
  const showCulturas = !showOnlyClassifications;
  const showClassificacoes = !showOnlyCulturas;

  return (
    <div className="space-y-8">
      {confirmDialog}
      {/* Header — only shown when rendering both sections */}
      {!showOnlyCulturas && !showOnlyClassifications && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Parametrização</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure as culturas e grupos de produtos do seu negócio.
            O sistema usará esses nomes em todos os relatórios e dashboards.
          </p>
        </div>
      )}

      {/* ========================================== */}
      {/* Section 1: Culturas */}
      {/* ========================================== */}
      {showCulturas && (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-green-500/10 text-green-600">
            <Sprout size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Cultura</h2>
            <p className="text-xs text-muted-foreground">
              Quais culturas sua empresa trabalha? Esta é a lista usada no
              planejamento (VPM). Digite pra buscar no catálogo oficial do
              IBGE — habilitar de lá poupa digitação — ou crie uma cultura
              própria, sem correspondência no catálogo (ex.: <strong>HF</strong>).
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Catálogo: PAM/IBGE (Produção Agrícola Municipal). Milho, Feijão,
              Batata-inglesa e Amendoim já vêm separados por safra, e Café por
              variedade — segundo o LSPA/IBGE (Levantamento Sistemático da
              Produção Agrícola), fonte de referência para essa separação.
            </p>
          </div>
        </div>

        {/* Cultura list */}
        <div className="space-y-2 mb-4">
          {culturas.map((cultura, index) => (
            <motion.div
              key={cultura.id}
              layout
              draggable
              onDragStart={() => setDragCulturaIdx(index)}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => {
                if (dragCulturaIdx !== null && dragCulturaIdx !== index) setDragOverCulturaIdx(index);
              }}
              onDrop={() => {
                if (dragCulturaIdx !== null) handleReorderCulturas(dragCulturaIdx, index);
                setDragCulturaIdx(null);
                setDragOverCulturaIdx(null);
              }}
              onDragEnd={() => {
                setDragCulturaIdx(null);
                setDragOverCulturaIdx(null);
              }}
              className={`rounded-xl border-2 transition-all ${
                dragCulturaIdx === index
                  ? "opacity-40 border-transparent bg-white/60"
                  : dragOverCulturaIdx === index
                  ? "border-emerald-400 border-dashed bg-emerald-50/60"
                  : cultura.isActive
                  ? "border-border/50 bg-white/60"
                  : "border-border/20 bg-muted/20 opacity-50"
              }`}
            >
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    <GripVertical size={14} className="text-muted-foreground/40 cursor-grab" />
                    {/* Alternativa ao arrastar — teclado, touch e leitor de
                        tela não lidam bem com drag-and-drop nativo (sugestão
                        de UX, 05/09/2026). */}
                    <div className="flex flex-col -my-1 ml-0.5">
                      <button
                        onClick={() => handleReorderCulturas(index, index - 1)}
                        disabled={index === 0}
                        className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Mover pra cima"
                        aria-label={`Mover "${cultura.customName}" pra cima`}
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        onClick={() => handleReorderCulturas(index, index + 1)}
                        disabled={index === culturas.length - 1}
                        className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Mover pra baixo"
                        aria-label={`Mover "${cultura.customName}" pra baixo`}
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                  </div>
                  {renaming?.kind === "cultura" && renaming.id === cultura.id ? (
                    renderRenameInput(cultura)
                  ) : (
                    <span
                      className="font-medium text-sm cursor-text hover:bg-amber-50 rounded px-1 -mx-1 transition-colors"
                      title="Duplo clique para renomear"
                      onDoubleClick={() => startRename("cultura", cultura.id, cultura.customName)}
                    >
                      {cultura.customName}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-full">
                    {cultura.internalKey}
                  </span>
                  {cultura.ibgeProdutos.length > 0 && (
                    <span
                      className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full"
                      title={`De-para IBGE: ${cultura.ibgeProdutos.map((p) => p.produto).join(", ")}`}
                    >
                      {cultura.ibgeProdutos[0].tipo === "permanente" ? (
                        <TreePine size={10} />
                      ) : (
                        <Sprout size={10} />
                      )}
                      IBGE{cultura.ibgeProdutos.length > 1 ? ` ×${cultura.ibgeProdutos.length}` : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpand(`cultura-aliases-${cultura.id}`)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    <Tag size={10} />
                    {cultura.aliases.length} apelido{cultura.aliases.length !== 1 && "s"}
                  </button>
                  <button
                    onClick={() =>
                      onSaveCultura({ ...cultura, isActive: !cultura.isActive })
                    }
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {cultura.isActive ? (
                      <ToggleRight size={20} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={20} />
                    )}
                  </button>
                  {onSubstituirCultura && culturas.some((c) => c.id !== cultura.id && c.isActive) && (
                    <button
                      onClick={() => {
                        setSubstituindoCultura(
                          substituindoCultura === cultura.id ? null : cultura.id
                        );
                        setSubstituirDraft("");
                      }}
                      className="text-muted-foreground/50 hover:text-blue-600 transition-colors"
                      title="Substituir esta cultura por outra em todo o sistema"
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCulturaClick(cultura)}
                    className="text-muted-foreground/50 hover:text-destructive transition-colors"
                    title="Excluir cultura"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Painel de substituição em massa */}
              <AnimatePresence>
                {substituindoCultura === cultura.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Substitui &quot;{cultura.customName}&quot; por outra cultura em todos os
                        clientes, Índice Tecnológico e planejamento — útil pra depois conseguir
                        excluir &quot;{cultura.customName}&quot; sem reeditar cliente por cliente.
                      </p>
                      <div className="flex gap-1.5">
                        <select
                          value={substituirDraft}
                          onChange={(e) => setSubstituirDraft(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-border/30 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          <option value="">Substituir por...</option>
                          {culturas
                            // Só ativas: migrar pra uma cultura desabilitada
                            // recriaria o mesmo bug de VPM órfão da auditoria
                            // de 31/08 (dado passa a apontar pra uma cultura
                            // que o cálculo de VPM ignora).
                            .filter((c) => c.id !== cultura.id && c.isActive)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.customName}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => handleConfirmSubstituir(cultura)}
                          disabled={!substituirDraft || substituindo}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {substituindo ? "Substituindo..." : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Apelidos panel */}
              <AnimatePresence>
                {expandedItems.has(`cultura-aliases-${cultura.id}`) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-bold">
                        Apelidos (nomes alternativos para matching do CSV/ERP)
                      </p>
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {/* O nome em uso aparece junto dos apelidos, mesmo padrão do
                            Grupo de Produtos — deixa claro qual rótulo vale hoje. */}
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <Check size={10} />
                          {cultura.customName}
                          <span className="font-normal opacity-70">em uso</span>
                        </span>
                        {cultura.aliases.map((alias) =>
                          editingAliasText?.itemId === cultura.id && editingAliasText.alias === alias ? (
                            <span key={alias} className="relative inline-block">
                            <input
                              autoFocus
                              value={aliasEditDraft}
                              onChange={(e) => {
                                setAliasEditDraft(e.target.value);
                                if (aliasEditError) setAliasEditError(null);
                              }}
                              onBlur={() => commitEditCulturaAliasText(cultura)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEditCulturaAliasText(cultura);
                                if (e.key === "Escape") {
                                  setEditingAliasText(null);
                                  setAliasEditError(null);
                                }
                              }}
                              className={`px-2 py-1 rounded-full border bg-white text-[11px] outline-none w-28 ${
                                aliasEditError ? "border-red-400" : "border-primary/60"
                              }`}
                            />
                            {aliasEditError && (
                              <span className="absolute left-0 top-full mt-1 z-10 w-48 text-[10px] leading-snug text-red-600 bg-white border border-red-200 rounded-lg px-2 py-1 shadow-md">
                                {aliasEditError}
                              </span>
                            )}
                            </span>
                          ) : (
                            <span
                              key={alias}
                              className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-muted/40 text-[11px]"
                            >
                              <span
                                className="cursor-text hover:underline decoration-dotted"
                                title="Duplo clique para editar o texto do apelido"
                                onDoubleClick={() => startEditAliasText(cultura.id, alias)}
                              >
                                {alias}
                              </span>
                              <button
                                onClick={() => handlePromoteCulturaAlias(cultura, alias)}
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 transition-colors"
                                title={`Usar "${alias}" como nome desta cultura`}
                              >
                                usar como nome
                              </button>
                              <button
                                onClick={() => handleRemoveCulturaAlias(cultura, alias)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                title="Remover apelido"
                              >
                                <X size={10} />
                              </button>
                            </span>
                          )
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Trocar o nome (duplo clique) sobrescreve sem guardar o anterior — pra
                        manter o reconhecimento de arquivos já importados, adicione o nome
                        antigo aqui como apelido antes de renomear.
                      </p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={editingAliases[cultura.id] || ""}
                          onChange={(e) =>
                            setEditingAliases((p) => ({
                              ...p,
                              [cultura.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddCulturaAlias(cultura)
                          }
                          placeholder="Novo apelido..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-border/30 bg-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        <button
                          onClick={() => handleAddCulturaAlias(cultura)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* De-Para: produtos IBGE associados a esta cultura (0, 1 ou N) */}
                      <div className="mt-2 pt-2 border-t border-border/20">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-bold">
                          Produtos IBGE associados (de-para)
                        </p>
                        {cultura.ibgeProdutos.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {cultura.ibgeProdutos.map((p) => (
                              <span
                                key={p.produto}
                                className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px]"
                                title={p.tipo ? "Do catálogo IBGE" : "Fora do catálogo oficial"}
                              >
                                {p.tipo === "permanente" ? (
                                  <TreePine size={10} />
                                ) : p.tipo === "temporaria" ? (
                                  <Sprout size={10} />
                                ) : null}
                                {p.produto}
                                {onRemoveProdutoIbge && (
                                  <button
                                    onClick={() => removerProdutoIbge(cultura, p.produto)}
                                    className="text-emerald-700/60 hover:text-destructive transition-colors"
                                    title="Remover associação"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                        {onAddProdutoIbge &&
                          (addingProdutoFor === cultura.id ? (() => {
                            const sugestoes = sugerirProdutosParaCultura(cultura, produtoDraft);
                            return (
                            <div className="relative">
                              <div className="flex gap-1.5">
                                <input
                                  autoFocus
                                  value={produtoDraft}
                                  onChange={(e) => setProdutoDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") salvarProdutoIbge(cultura, produtoDraft, null);
                                    if (e.key === "Escape") {
                                      setAddingProdutoFor(null);
                                      setProdutoDraft("");
                                    }
                                  }}
                                  placeholder="Buscar no catálogo ou digitar livre..."
                                  className="px-2 py-1 rounded-lg border border-emerald-300 text-xs w-56 focus:outline-none"
                                />
                                <button
                                  onClick={() => salvarProdutoIbge(cultura, produtoDraft, null)}
                                  className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wide hover:bg-emerald-700 transition-colors"
                                >
                                  Associar
                                </button>
                              </div>
                              {sugestoes.length > 0 && (
                                <div
                                  onMouseDown={(e) => e.preventDefault()}
                                  className="absolute z-10 mt-1 w-56 bg-white rounded-lg border border-border/40 shadow-lg overflow-hidden"
                                >
                                  {sugestoes.map((p) => (
                                    <button
                                      key={p.nome}
                                      onClick={() => salvarProdutoIbge(cultura, p.nome, p.tipo)}
                                      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-left hover:bg-emerald-50 transition-colors"
                                    >
                                      {p.tipo === "permanente" ? (
                                        <TreePine size={11} className="text-muted-foreground/60 shrink-0" />
                                      ) : (
                                        <Sprout size={11} className="text-muted-foreground/60 shrink-0" />
                                      )}
                                      {p.nome}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            );
                          })() : (
                            <button
                              onClick={() => {
                                setAddingProdutoFor(cultura.id);
                                setProdutoDraft("");
                              }}
                              className="text-[10px] text-emerald-700 hover:underline font-semibold"
                              title="Associar mais um produto do catálogo IBGE (ou fora dele) a esta cultura"
                            >
                              + associar produto IBGE
                            </button>
                          ))}
                      </div>

                      {/* Segundo cultivo no mesmo produto — ex.: separar por safra. Só
                          faz sentido quando a cultura tem exatamente 1 produto — "+variante"
                          divide um produto oficial em sub-cultivares, diferente do de-para
                          acima, que agrega vários produtos numa cultura só. */}
                      {cultura.ibgeProdutos.length === 1 && onAdicionarVariante && (
                        <div className="mt-2 pt-2 border-t border-border/20">
                          {addingVarianteFor === cultura.ibgeProdutos[0].produto ? (
                            <input
                              autoFocus
                              value={varianteDraft}
                              onChange={(e) => setVarianteDraft(e.target.value)}
                              onBlur={() =>
                                salvarVariante(cultura.ibgeProdutos[0].produto, cultura.ibgeProdutos[0].tipo!)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  salvarVariante(cultura.ibgeProdutos[0].produto, cultura.ibgeProdutos[0].tipo!);
                                if (e.key === "Escape") {
                                  setAddingVarianteFor(null);
                                  setVarianteDraft("");
                                }
                              }}
                              placeholder="ex: Milho safrinha"
                              className="px-2 py-1 rounded-lg border border-emerald-300 text-xs w-40 focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setAddingVarianteFor(cultura.ibgeProdutos[0].produto);
                                setVarianteDraft("");
                              }}
                              className="text-[10px] text-emerald-700 hover:underline font-semibold"
                              title="Criar outro cultivo apontando pra este mesmo produto — ex.: separar por safra"
                            >
                              + variante (outra safra/uso)
                            </button>
                          )}
                        </div>
                      )}
                      {cultura.ibgeProdutos.length > 1 && onAdicionarVariante && (
                        <p className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
                          &ldquo;+variante&rdquo; só aparece com 1 produto IBGE associado — esta cultura já tem {cultura.ibgeProdutos.length} (de-para acima).
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Add Cultura — busca no catálogo IBGE com fallback pra criação livre */}
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={culturaSearch}
              onChange={(e) => {
                setCulturaSearch(e.target.value);
                setShowCulturaSuggestions(true);
              }}
              onFocus={() => setShowCulturaSuggestions(true)}
              onBlur={() => {
                // Delay pra permitir o clique numa sugestão antes do dropdown sumir.
                setTimeout(() => setShowCulturaSuggestions(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCultura();
                if (e.key === "Escape") setShowCulturaSuggestions(false);
              }}
              placeholder="Buscar no catálogo IBGE ou digitar uma cultura própria..."
              className="flex-1 px-4 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={handleCreateCultura}
              disabled={!culturaSearch.trim()}
              className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Cria uma cultura própria, sem vínculo com o catálogo IBGE"
            >
              <Plus size={14} />
              Criar própria
            </button>
          </div>

          {showCulturaSuggestions && sugestoesCatalogo.length > 0 && onHabilitarDoCatalogo && (
            <div
              // onMouseDown com preventDefault evita que o clique numa
              // sugestão dispare blur no input antes do onClick rodar — sem
              // isso, o fechamento do dropdown por blur (mais abaixo) podia
              // vencer a corrida contra o clique em conexões/interações mais
              // lentas, e o clique "não fazia nada" (bug real reportado pelo
              // Marco Polo, 25/08/2026, não reproduzia sempre).
              onMouseDown={(e) => e.preventDefault()}
              className="absolute z-10 mt-1 w-full max-w-md bg-white rounded-xl border border-border/40 shadow-lg overflow-hidden"
            >
              <p className="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                Do catálogo IBGE
              </p>
              {sugestoesCatalogo.map((p) => (
                <button
                  key={p.nome}
                  onClick={() => handleSelecionarCatalogo(p.nome, p.tipo)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-emerald-50 transition-colors"
                >
                  {p.tipo === "permanente" ? (
                    <TreePine size={13} className="text-muted-foreground/60 shrink-0" />
                  ) : (
                    <Sprout size={13} className="text-muted-foreground/60 shrink-0" />
                  )}
                  {p.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Totalizador */}
        {culturas.length > 0 && (() => {
          const ativasCount = culturas.filter(c => c.isActive).length;
          const inativasCount = culturas.length - ativasCount;
          return (
            <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <strong className="text-foreground">{ativasCount}</strong> cultura{ativasCount !== 1 ? "s" : ""} ativa{ativasCount !== 1 ? "s" : ""} de <strong className="text-foreground">{culturas.length}</strong> total
              </span>
              {inativasCount > 0 && (
                <span className="text-amber-600 font-medium">
                  {inativasCount} desabilitada{inativasCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          );
        })()}
      </motion.section>
      )}

      {/* ========================================== */}
      {/* Section 2: Grupo de Produtos */}
      {/* ========================================== */}
      {showClassificacoes && (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
            <Layers size={20} />
          </div>
          <div>
            {onChangeLabelGrupoProduto && editingLabel ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={commitLabelGrupoProduto}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    setLabelDraft(labelGrupoProduto);
                    setEditingLabel(false);
                  }
                }}
                placeholder="Grupo de Produtos"
                className="text-lg font-semibold px-2 py-0.5 -mx-2 rounded-lg border-2 border-primary/60 bg-white outline-none w-56"
              />
            ) : onChangeLabelGrupoProduto ? (
              <button
                onClick={() => {
                  setLabelDraft(labelGrupoProduto);
                  setEditingLabel(true);
                }}
                className="text-lg font-semibold underline decoration-dotted decoration-blue-400 underline-offset-4 hover:text-blue-700 transition-colors"
                title="Clique pra dar seu próprio nome (ex.: Segmento)"
              >
                {labelGrupoProduto}
              </button>
            ) : (
              <h2 className="text-lg font-semibold">{labelGrupoProduto}</h2>
            )}
            <p className="text-xs text-muted-foreground">
              Como você organiza seu portfólio? Dê o nome que quiser
              {onChangeLabelGrupoProduto && (
                <>
                  {" "}— inclusive pro guarda-chuva em si, clicando no título
                  acima (ex.: chamar de &quot;Segmento&quot;).
                </>
              )}
            </p>
          </div>
        </div>

        {/* Classification tree */}
        <div className="space-y-3 mb-4">
          {roots.map((root, index) => {
            const children = getChildren(root.internalKey);
            const isExpanded = expandedItems.has(root.internalKey);
            const isDraggingThis = dragClassificacaoIdx === index;
            const isDragOverThis = dragOverClassificacaoIdx === index && dragClassificacaoIdx !== index;

            return (
              <motion.div
                key={root.id}
                layout
                draggable
                onDragStart={() => setDragClassificacaoIdx(index)}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={() => {
                  if (dragClassificacaoIdx !== null && dragClassificacaoIdx !== index) setDragOverClassificacaoIdx(index);
                }}
                onDrop={() => {
                  if (dragClassificacaoIdx !== null) handleReorderClassificacoes(dragClassificacaoIdx, index);
                  setDragClassificacaoIdx(null);
                  setDragOverClassificacaoIdx(null);
                }}
                onDragEnd={() => {
                  setDragClassificacaoIdx(null);
                  setDragOverClassificacaoIdx(null);
                }}
                className={`space-y-1 ${isDraggingThis ? "opacity-40" : ""}`}
              >
                {/* Root classification */}
                <div
                  className={`rounded-xl border-2 transition-all ${
                    isDragOverThis
                      ? "border-blue-400 border-dashed bg-blue-50/60"
                      : root.isActive
                      ? "border-border/50 bg-white/60"
                      : "border-border/20 bg-muted/20 opacity-50"
                  }`}
                >
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        <GripVertical
                          size={14}
                          className="text-muted-foreground/40 cursor-grab"
                        />
                        {/* Alternativa ao arrastar — teclado, touch e leitor
                            de tela não lidam bem com drag-and-drop nativo
                            (sugestão de UX, 05/09/2026). */}
                        <div className="flex flex-col -my-1 ml-0.5">
                          <button
                            onClick={() => handleReorderClassificacoes(index, index - 1)}
                            disabled={index === 0}
                            className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title="Mover pra cima"
                            aria-label={`Mover "${root.customName}" pra cima`}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            onClick={() => handleReorderClassificacoes(index, index + 1)}
                            disabled={index === roots.length - 1}
                            className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                            title="Mover pra baixo"
                            aria-label={`Mover "${root.customName}" pra baixo`}
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      </div>
                      {/* Color swatch */}
                      <input
                        type="color"
                        value={root.color}
                        onChange={(e) => handleColorChange(root, e.target.value)}
                        className="w-5 h-5 rounded-full border-0 cursor-pointer p-0"
                        title="Cor nos gráficos"
                      />
                      {renaming?.kind === "classificacao" && renaming.id === root.id ? (
                        renderRenameInput(root)
                      ) : (
                        <span
                          className="font-medium text-sm cursor-text hover:bg-blue-50 rounded px-1 -mx-1 transition-colors"
                          title="Duplo clique para renomear"
                          onDoubleClick={() => startRename("classificacao", root.id, root.customName)}
                        >
                          {root.customName}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-full">
                        {root.internalKey}
                      </span>
                      {children.length > 0 && (
                        <button
                          onClick={() => toggleExpand(root.internalKey)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Aliases count */}
                      <button
                        onClick={() => toggleExpand(`aliases-${root.id}`)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                      >
                        <Tag size={10} />
                        {root.aliases.length} apelido{root.aliases.length !== 1 && "s"}
                      </button>
                      <button
                        onClick={() => handleToggleActive(root)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {root.isActive ? (
                          <ToggleRight size={20} className="text-green-500" />
                        ) : (
                          <ToggleLeft size={20} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteClassificacaoClick(root)}
                        className="text-muted-foreground/50 hover:text-destructive transition-colors"
                        title="Excluir grupo de produto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Aliases panel */}
                  <AnimatePresence>
                    {expandedItems.has(`aliases-${root.id}`) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pt-1 border-t border-border/30">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-bold">
                            Apelidos (nomes alternativos para matching do CSV/ERP)
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-1">
                            {/* O nome em uso aparece junto dos apelidos para deixar
                                claro qual dos rótulos está valendo hoje. */}
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <Check size={10} />
                              {root.customName}
                              <span className="font-normal opacity-70">em uso</span>
                            </span>
                            {root.aliases.map((alias) =>
                              editingAliasText?.itemId === root.id && editingAliasText.alias === alias ? (
                                <span key={alias} className="relative inline-block">
                                <input
                                  autoFocus
                                  value={aliasEditDraft}
                                  onChange={(e) => {
                                    setAliasEditDraft(e.target.value);
                                    if (aliasEditError) setAliasEditError(null);
                                  }}
                                  onBlur={() => commitEditClassificacaoAliasText(root)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitEditClassificacaoAliasText(root);
                                    if (e.key === "Escape") {
                                      setEditingAliasText(null);
                                      setAliasEditError(null);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded-full border bg-white text-[11px] outline-none w-28 ${
                                    aliasEditError ? "border-red-400" : "border-primary/60"
                                  }`}
                                />
                                {aliasEditError && (
                                  <span className="absolute left-0 top-full mt-1 z-10 w-48 text-[10px] leading-snug text-red-600 bg-white border border-red-200 rounded-lg px-2 py-1 shadow-md">
                                    {aliasEditError}
                                  </span>
                                )}
                                </span>
                              ) : (
                              <span
                                key={alias}
                                className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-full bg-muted/40 text-[11px]"
                              >
                                <span
                                  className="cursor-text hover:underline decoration-dotted"
                                  title="Duplo clique para editar o texto do apelido"
                                  onDoubleClick={() => startEditAliasText(root.id, alias)}
                                >
                                  {alias}
                                </span>
                                <button
                                  onClick={() => handlePromoteAlias(root, alias)}
                                  className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-100 transition-colors"
                                  title={`Usar "${alias}" como nome deste grupo de produto`}
                                >
                                  usar como nome
                                </button>
                                <button
                                  onClick={() => handleRemoveAlias(root, alias)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  title="Remover apelido"
                                >
                                  <X size={10} />
                                </button>
                              </span>
                              )
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-2">
                            Trocar o nome mantém o código interno e move o nome anterior para
                            os apelidos, preservando o reconhecimento de arquivos já importados.
                          </p>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={editingAliases[root.id] || ""}
                              onChange={(e) =>
                                setEditingAliases((p) => ({
                                  ...p,
                                  [root.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleAddAlias(root)
                              }
                              placeholder="Novo apelido..."
                              className="flex-1 px-3 py-1.5 rounded-lg border border-border/30 bg-white/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                            />
                            <button
                              onClick={() => handleAddAlias(root)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Sub-classifications */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 space-y-1 overflow-hidden"
                    >
                      {children.map((child) => (
                        <div
                          key={child.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                            child.isActive
                              ? "bg-white/40 border-border/30"
                              : "bg-muted/10 border-border/10 opacity-40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={child.color}
                              onChange={(e) =>
                                handleColorChange(child, e.target.value)
                              }
                              className="w-4 h-4 rounded-full border-0 cursor-pointer p-0"
                            />
                            {renaming?.kind === "classificacao" && renaming.id === child.id ? (
                              renderRenameInput(child)
                            ) : (
                              <span
                                className="text-sm cursor-text hover:bg-blue-50 rounded px-1 -mx-1 transition-colors"
                                title="Duplo clique para renomear"
                                onDoubleClick={() => startRename("classificacao", child.id, child.customName)}
                              >
                                {child.customName}
                              </span>
                            )}
                            <span className="text-[9px] text-muted-foreground font-mono bg-muted/30 px-1.5 py-0.5 rounded-full">
                              {child.internalKey}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleActive(child)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {child.isActive ? (
                                <ToggleRight size={16} className="text-green-500" />
                              ) : (
                                <ToggleLeft size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteClassificacaoClick(child)}
                              className="text-muted-foreground/50 hover:text-destructive transition-colors"
                              title="Excluir subgrupo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add sub-classification */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newSubClassName[root.internalKey] || ""}
                          onChange={(e) =>
                            setNewSubClassName((p) => ({
                              ...p,
                              [root.internalKey]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            handleCreateSubClassificacao(root.internalKey)
                          }
                          placeholder={`Nova sub de "${root.customName}"...`}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-dashed border-border/40 bg-white/30 text-xs focus:outline-none focus:ring-1 focus:ring-primary/20"
                        />
                        <button
                          onClick={() =>
                            handleCreateSubClassificacao(root.internalKey)
                          }
                          className="px-3 py-1.5 rounded-lg bg-muted/30 text-muted-foreground text-xs hover:bg-muted/50 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Add root classification */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateClassificacao()}
            placeholder="Nome do grupo de produto (ex: Defensivos, Sementes...)"
            className="flex-1 px-4 py-2 rounded-xl border border-border/50 bg-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleCreateClassificacao}
            disabled={!newClassName.trim()}
            className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>
      </motion.section>
      )}
    </div>
  );
}
