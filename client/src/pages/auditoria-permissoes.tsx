import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, ChevronDown, ChevronUp, Save, Settings } from 'lucide-react';

// ─── Tipos e constantes ────────────────────────────────────────────────────────
type NivelPermissao = 'sem_acesso' | 'leitura' | 'editar' | 'admin';
type PermissoesMap = Record<string, Record<string, NivelPermissao>>;

const MODULOS_PERMISSOES = [
  { modulo: 'meu-painel', label: 'Meu Painel', subabas: [
    { key: 'painel-agente', label: 'Meu Painel' },
  ]},
  { modulo: 'mensagem-dia', label: 'Mensagem do Dia', subabas: [
    { key: 'motivacional', label: 'Motivacional' },
    { key: 'minutos-sabedoria', label: 'Minutos de Sabedoria' },
    { key: 'salmos', label: 'Salmos' },
    { key: 'versiculos', label: 'Versículos' },
    { key: 'horoscopo', label: 'Horóscopo' },
    { key: 'orixas', label: 'Mensagem dos Orixás' },
  ]},
  { modulo: 'cadastros', label: 'Cadastros', subabas: [
    { key: 'agentes', label: 'Agentes' },
    { key: 'certificacoes', label: 'Certificações' },
    { key: 'tabela-comissao', label: 'Tabela Comissão' },
    { key: 'documentacao-agentes', label: 'Documentação Agentes' },
  ]},
  { modulo: 'financeiro', label: 'Financeiro', subabas: [
    { key: 'calculo', label: 'Cálculo' },
    { key: 'pagamentos', label: 'Pagamentos' },
    { key: 'despesas', label: 'Despesas Fixas' },
    { key: 'contas-lojas', label: 'Contas das Lojas' },
    { key: 'pro-rata', label: 'Pró Rata' },
  ]},
  { modulo: 'producao', label: 'Produção', subabas: [
    { key: 'bbdental', label: 'BB Dental' },
    { key: 'consignado-prod', label: 'Consignado' },
    { key: 'consorcio-prod', label: 'Consórcio' },
    { key: 'conta-corrente', label: 'Conta Corrente' },
    { key: 'ourocap-prod', label: 'OuroCap' },
    { key: 'seguros-prod', label: 'Seguros' },
  ]},
  { modulo: 'extratos', label: 'Extratos', subabas: [
    { key: 'consignado', label: 'Extrato Consignado' },
    { key: 'cc', label: 'Extrato C/C' },
    { key: 'consorcio', label: 'Extrato Consórcio' },
    { key: 'ourocap', label: 'Extrato Ourocap' },
    { key: 'seguros', label: 'Extrato Seguros' },
    { key: 'bbdental', label: 'Extrato BB Dental' },
    { key: 'perspectiva', label: 'Pré-Extrato' },
    { key: 'minha-tabela', label: 'Minha Tabela' },
  ]},
  { modulo: 'crm', label: 'CRM', subabas: [
    { key: 'atendimentos', label: 'Atendimentos' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'contratos-pdf', label: 'Contratos PDF' },
    { key: 'mailing', label: 'Mailing' },
    { key: 'nao-perturbe', label: 'Não Perturbe' },
    { key: 'oportunidades', label: 'Oportunidades' },
    { key: 'relatorios-crm', label: 'Relatórios CRM' },
    { key: 'tarefas', label: 'Tarefas / Follow-up' },
  ]},
  { modulo: 'febraban', label: 'Febraban', subabas: [
    { key: 'producao-bb', label: 'Produção BB' },
    { key: 'acompanhamento-diario', label: 'Acompanhamento Diário' },
    { key: 'graficos', label: 'Gráficos' },
    { key: 'relatorio-chavej', label: 'Relatório por Chave J' },
    { key: 'retorno-documentos', label: 'Retorno Documentos' },
  ]},
  { modulo: 'auditoria', label: 'Auditoria', subabas: [
    { key: 'logs', label: 'Logs de Acesso' },
    { key: 'feriados', label: 'Feriados' },
  ]},
];

const NIVEIS: { value: NivelPermissao; label: string; color: string; bg: string }[] = [
  { value: 'sem_acesso', label: 'Sem Acesso', color: 'text-red-700', bg: 'bg-red-100 border-red-300' },
  { value: 'leitura',    label: 'Leitura',    color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-300' },
  { value: 'editar',     label: 'Editar',     color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' },
  { value: 'admin',      label: 'Admin',      color: 'text-green-700', bg: 'bg-green-100 border-green-300' },
];

function nivelColor(nivel: NivelPermissao) {
  return NIVEIS.find(n => n.value === nivel) ?? NIVEIS[0];
}

function buildDefaultPermissoes(nivel: NivelPermissao): PermissoesMap {
  const map: PermissoesMap = {};
  for (const m of MODULOS_PERMISSOES) {
    map[m.modulo] = {};
    for (const s of m.subabas) {
      map[m.modulo][s.key] = nivel;
    }
  }
  return map;
}

// Mescla o JSON salvo no banco com os defaults.
// Para módulos/subabas não presentes no JSON salvo, usa o fallbackNivel (padrão: sem_acesso).
function mergeComDefaults(savedJson: string | null, fallbackNivel: NivelPermissao = 'sem_acesso'): PermissoesMap {
  let saved: PermissoesMap = {};
  try { saved = JSON.parse(savedJson ?? '{}') ?? {}; } catch { saved = {}; }
  const result: PermissoesMap = {};
  for (const m of MODULOS_PERMISSOES) {
    result[m.modulo] = {};
    for (const s of m.subabas) {
      result[m.modulo][s.key] = saved[m.modulo]?.[s.key] ?? fallbackNivel;
    }
  }
  return result;
}

// ─── Componente de seletor de nível ───────────────────────────────────────────
function NivelSelect({ value, onChange }: { value: NivelPermissao; onChange: (v: NivelPermissao) => void }) {
  const n = nivelColor(value);
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as NivelPermissao)}
      className={`text-xs border rounded px-1.5 py-0.5 font-medium cursor-pointer ${n.bg} ${n.color}`}
    >
      {NIVEIS.map(n => (
        <option key={n.value} value={n.value}>{n.label}</option>
      ))}
    </select>
  );
}

// ─── Editor de permissões reutilizável ────────────────────────────────────────
function PermissoesEditor({
  mapa,
  onChange,
}: {
  mapa: PermissoesMap;
  onChange: (mapa: PermissoesMap) => void;
}) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const toggleModulo = (modulo: string) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(modulo)) next.delete(modulo);
      else next.add(modulo);
      return next;
    });
  };

  const expandirTodos = () => setExpandidos(new Set(MODULOS_PERMISSOES.map(m => m.modulo)));
  const recolherTodos = () => setExpandidos(new Set());
  const todosExpandidos = expandidos.size === MODULOS_PERMISSOES.length;

  const setNivelModulo = (modulo: string, nivel: NivelPermissao) => {
    const moduloDef = MODULOS_PERMISSOES.find(m => m.modulo === modulo);
    const subabas = moduloDef ? moduloDef.subabas.map(s => s.key) : Object.keys(mapa[modulo] ?? {});
    const novoModulo: Record<string, NivelPermissao> = {};
    for (const key of subabas) novoModulo[key] = nivel;
    onChange({ ...mapa, [modulo]: novoModulo });
  };

  const setNivelSubaba = (modulo: string, key: string, nivel: NivelPermissao) => {
    onChange({ ...mapa, [modulo]: { ...mapa[modulo], [key]: nivel } });
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={todosExpandidos ? recolherTodos : expandirTodos}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          {todosExpandidos ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {todosExpandidos ? 'Recolher tudo' : 'Expandir tudo'}
        </button>
      </div>
      {MODULOS_PERMISSOES.map(m => {
        const aberto = expandidos.has(m.modulo);
        const niveis = m.subabas.map(s => mapa[m.modulo]?.[s.key] ?? 'sem_acesso');
        const nivelMod: NivelPermissao = niveis.length === 0
          ? 'sem_acesso'
          : niveis.every(v => v === niveis[0]) ? (niveis[0] as NivelPermissao) : 'editar';
        return (
          <div key={m.modulo} className="border rounded-lg overflow-hidden">
            <div
              className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
              onClick={() => toggleModulo(m.modulo)}
            >
              <div className="flex items-center gap-2">
                {aberto ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                <span className="text-sm font-medium text-gray-700">{m.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${nivelColor(nivelMod).bg} ${nivelColor(nivelMod).color}`}>
                  {nivelColor(nivelMod).label}
                </span>
              </div>
              <NivelSelect value={nivelMod} onChange={v => { setNivelModulo(m.modulo, v); }} />
            </div>
            {aberto && (
              <div className="px-4 py-2 space-y-1.5 bg-white">
                {m.subabas.map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{s.label}</span>
                    <NivelSelect
                      value={mapa[m.modulo]?.[s.key] ?? 'sem_acesso'}
                      onChange={v => setNivelSubaba(m.modulo, s.key, v)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Painel de templates por cargo ────────────────────────────────────────────
function TemplatesCargo({ cargos }: { cargos: string[] }) {
  const utils = trpc.useUtils();
  const { data: templates = [] } = trpc.cargoPermissoes.list.useQuery();
  const salvarTemplate = trpc.cargoPermissoes.salvar.useMutation({
    onSuccess: () => {
      toast.success('Template salvo!');
      utils.cargoPermissoes.list.invalidate();
    },
    onError: () => toast.error('Erro ao salvar template'),
  });

  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [nivelGlobal, setNivelGlobal] = useState<NivelPermissao>('sem_acesso');
  const [mapa, setMapa] = useState<PermissoesMap>(() => buildDefaultPermissoes('sem_acesso'));

  // Quando selecionar um cargo, carregar o template existente (se houver)
  useEffect(() => {
    if (!cargoSelecionado) return;
    const tpl = templates.find(t => t.cargo === cargoSelecionado);
    if (tpl) {
      const nivel = (tpl.nivelGeral as NivelPermissao) ?? 'sem_acesso';
      setNivelGlobal(nivel);
      setMapa(mergeComDefaults(tpl.permissoesModulos, nivel));
    } else {
      setNivelGlobal('sem_acesso');
      setMapa(buildDefaultPermissoes('sem_acesso'));
    }
  }, [cargoSelecionado, templates]);

  const aplicarGlobal = (nivel: NivelPermissao) => {
    setNivelGlobal(nivel);
    setMapa(buildDefaultPermissoes(nivel));
  };

  const todosCargos = Array.from(new Set([
    ...cargos,
    ...templates.map(t => t.cargo),
  ])).filter(Boolean).sort();

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Settings className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-800 text-base">Templates de Permissão por Cargo</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Configure as permissões padrão para cada cargo. Ao abrir um agente sem permissões individuais, o sistema usará o template do cargo dele automaticamente.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Cargo</label>
          <select
            value={cargoSelecionado}
            onChange={e => setCargoSelecionado(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm min-w-[180px]"
          >
            <option value="">-- Selecione um cargo --</option>
            {todosCargos.map(c => (
              <option key={c} value={c}>
                {c} {templates.find(t => t.cargo === c) ? '✓' : ''}
              </option>
            ))}
          </select>
        </div>
        {cargoSelecionado && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nível padrão</label>
            <select
              value={nivelGlobal}
              onChange={e => aplicarGlobal(e.target.value as NivelPermissao)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {cargoSelecionado && (
        <>
          <div className="mb-4">
            <PermissoesEditor mapa={mapa} onChange={setMapa} />
          </div>
          <Button
            onClick={() => salvarTemplate.mutate({
              cargo: cargoSelecionado,
              nivelGeral: nivelGlobal,
              permissoesModulos: JSON.stringify(mapa),
            })}
            disabled={salvarTemplate.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Template para "{cargoSelecionado}"
          </Button>
        </>
      )}

      {templates.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-gray-600 mb-2">Templates configurados:</p>
          <div className="flex flex-wrap gap-2">
            {templates.map(t => {
              const n = nivelColor((t.nivelGeral as NivelPermissao) ?? 'sem_acesso');
              return (
                <span key={t.cargo} className={`text-xs px-2 py-1 rounded border font-medium ${n.bg} ${n.color}`}>
                  {t.cargo} → {n.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Painel de aplicação em massa por cargo ───────────────────────────────────
function AplicarEmMassa({ cargos, onAplicar }: {
  cargos: string[];
  onAplicar: (cargo: string, nivelGeral: NivelPermissao, mapa: PermissoesMap) => void;
}) {
  const { data: templates = [] } = trpc.cargoPermissoes.list.useQuery();
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [nivelGlobal, setNivelGlobal] = useState<NivelPermissao>('sem_acesso');
  const [mapa, setMapa] = useState<PermissoesMap>(() => buildDefaultPermissoes('sem_acesso'));
  // Ao selecionar cargo, pré-carregar o template salvo para esse cargo
  useEffect(() => {
    if (!cargoSelecionado) return;
    const tpl = templates.find(t => t.cargo === cargoSelecionado);
    if (tpl) {
      const nivel = (tpl.nivelGeral as NivelPermissao) ?? 'sem_acesso';
      setNivelGlobal(nivel);
      setMapa(mergeComDefaults(tpl.permissoesModulos, nivel));
    } else {
      setNivelGlobal('sem_acesso');
      setMapa(buildDefaultPermissoes('sem_acesso'));
    }
  }, [cargoSelecionado, templates]);

  const aplicarGlobal = (nivel: NivelPermissao) => {
    setNivelGlobal(nivel);
    setMapa(buildDefaultPermissoes(nivel));
  };

  return (
    <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-orange-800 text-base">Aplicar Permissões em Massa por Cargo</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Aplica as permissões para <strong>todos os agentes</strong> de um cargo de uma só vez. Pré-carrega o template salvo para o cargo selecionado.
      </p>

      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Cargo alvo</label>
          <select
            value={cargoSelecionado}
            onChange={e => setCargoSelecionado(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm min-w-[160px]"
          >
            <option value="">-- Selecione --</option>
            {cargos.map(c => <option key={c} value={c!}>{c}</option>)}
          </select>
        </div>
        {cargoSelecionado && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nível padrão (aplica a todos os módulos)</label>
            <select
              value={nivelGlobal}
              onChange={e => aplicarGlobal(e.target.value as NivelPermissao)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {cargoSelecionado && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Ajuste módulo por módulo (clique para expandir sub-abas):</p>
          <PermissoesEditor mapa={mapa} onChange={setMapa} />
        </div>
      )}

      <Button
        disabled={!cargoSelecionado}
        onClick={() => {
          if (!cargoSelecionado) return;
          onAplicar(cargoSelecionado, nivelGlobal, mapa);
        }}
        className="bg-orange-600 hover:bg-orange-700 text-white"
      >
        <Shield className="w-4 h-4 mr-2" />
        Aplicar para todos os {cargoSelecionado || 'agentes do cargo'}
      </Button>
    </div>
  );
}

// ─── Linha individual de agente ───────────────────────────────────────────────
function AgentePermissaoRow({ agente, templatesCargo, onSalvar }: {
  agente: {
    id: number;
    nomeAgente: string | null;
    chaveJ: string | null;
    empresa: string | null;
    cargo: string | null;
    situacao: string | null;
    permissoes: string | null;
    permissoesModulos: string | null;
  };
  templatesCargo: Array<{ cargo: string; nivelGeral: string | null; permissoesModulos: string | null }>;
  onSalvar: (id: number, permissoes: string, permissoesModulos: string) => void;
}) {
  // Determinar o fallback: template do cargo do agente (se existir)
  const templateDoCargo = templatesCargo.find(t => t.cargo === agente.cargo);
  const fallbackNivel = (templateDoCargo?.nivelGeral as NivelPermissao) ?? 'sem_acesso';

  // Se o agente tem permissoesModulos salvas, usa elas (mesclando com defaults do cargo)
  // Se não tem, usa o template do cargo como base
  const calcularMapa = (permissoesModulosJson: string | null) => {
    if (permissoesModulosJson && permissoesModulosJson !== '{}' && permissoesModulosJson !== 'null') {
      // Agente tem permissões individuais: mescla com defaults do cargo
      return mergeComDefaults(permissoesModulosJson, fallbackNivel);
    } else if (templateDoCargo?.permissoesModulos) {
      // Agente sem permissões individuais: usa template do cargo
      return mergeComDefaults(templateDoCargo.permissoesModulos, fallbackNivel);
    } else {
      // Sem template de cargo: tudo sem_acesso
      return buildDefaultPermissoes('sem_acesso');
    }
  };

  const calcularNivelGeral = (permissoesJson: string | null) => {
    if (permissoesJson) return permissoesJson as NivelPermissao;
    return fallbackNivel;
  };

  const [expandido, setExpandido] = useState(false);
  const [mapa, setMapa] = useState<PermissoesMap>(() => calcularMapa(agente.permissoesModulos));
  const [nivelGeral, setNivelGeral] = useState<NivelPermissao>(() => calcularNivelGeral(agente.permissoes));
  const [alterado, setAlterado] = useState(false);

  // Sincronizar quando os dados do agente ou templates mudarem
  useEffect(() => {
    setMapa(calcularMapa(agente.permissoesModulos));
    setNivelGeral(calcularNivelGeral(agente.permissoes));
    setAlterado(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agente.permissoesModulos, agente.permissoes, agente.cargo, templatesCargo]);

  const setNivelSubaba = (modulo: string, key: string, nivel: NivelPermissao) => {
    setMapa(prev => ({ ...prev, [modulo]: { ...prev[modulo], [key]: nivel } }));
    setAlterado(true);
  };

  const setNivelGlobal = (nivel: NivelPermissao) => {
    setNivelGeral(nivel);
    setMapa(buildDefaultPermissoes(nivel));
    setAlterado(true);
  };

  const salvar = () => {
    onSalvar(agente.id, nivelGeral, JSON.stringify(mapa));
    setAlterado(false);
  };

  // Badge indicando se está usando template do cargo ou permissões individuais
  const usandoTemplate = !agente.permissoesModulos || agente.permissoesModulos === '{}';

  // Resumo de permissões por módulo
  const resumo = MODULOS_PERMISSOES.map(m => {
    const niveis = m.subabas.map(s => mapa[m.modulo]?.[s.key] ?? 'sem_acesso');
    const predominante: NivelPermissao = niveis.length === 0
      ? 'sem_acesso'
      : niveis.every(v => v === niveis[0])
        ? (niveis[0] as NivelPermissao)
        : 'editar';
    return { ...m, nivel: predominante };
  });

  return (
    <TableRow className="align-top hover:bg-blue-50/30">
      <TableCell className="min-w-[180px]">
        <div className="flex items-center gap-1">
          <span className="font-mono text-sm font-semibold text-blue-700">{agente.chaveJ || '-'}</span>
          {agente.situacao && (
            <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${agente.situacao.startsWith('Ativo') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {agente.situacao}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-800">{agente.nomeAgente || '-'}</div>
        <div className="text-[11px] text-gray-500">{agente.empresa} · {agente.cargo}</div>
        {usandoTemplate && templateDoCargo && (
          <span className="text-[10px] text-blue-500 italic">usando template do cargo</span>
        )}
      </TableCell>
      <TableCell>
        <NivelSelect value={nivelGeral} onChange={setNivelGlobal} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {resumo.map(m => {
            const n = nivelColor(m.nivel);
            const CICLO: NivelPermissao[] = ['sem_acesso', 'leitura', 'editar', 'admin'];
            const handleClickBadge = () => {
              const idx = CICLO.indexOf(m.nivel);
              const novoNivel = CICLO[(idx + 1) % CICLO.length];
              const moduloDef = MODULOS_PERMISSOES.find(md => md.modulo === m.modulo);
              const subabas = moduloDef ? moduloDef.subabas.map(s => s.key) : [];
              const novoMapa = { ...mapa, [m.modulo]: Object.fromEntries(subabas.map(k => [k, novoNivel])) };
              setMapa(novoMapa);
              setAlterado(true);
            };
            return (
              <button
                key={m.modulo}
                type="button"
                title={`${m.label}: ${n.label} — clique para alterar`}
                onClick={handleClickBadge}
                className={`text-[10px] px-1.5 py-0.5 rounded border font-medium cursor-pointer hover:opacity-75 active:scale-95 transition-all select-none ${n.bg} ${n.color}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <button
          className="text-[10px] text-blue-500 hover:underline mt-1 flex items-center gap-0.5"
          onClick={() => setExpandido(!expandido)}
        >
          {expandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expandido ? 'Fechar detalhes' : 'Editar por módulo'}
        </button>
        {expandido && (
          <div className="mt-2 space-y-2 border rounded-lg p-3 bg-gray-50">
            {MODULOS_PERMISSOES.map(m => (
              <div key={m.modulo}>
                <div className="text-xs font-semibold text-gray-700 mb-1">{m.label}</div>
                <div className="space-y-1 pl-2">
                  {m.subabas.map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-600">{s.label}</span>
                      <NivelSelect
                        value={mapa[m.modulo]?.[s.key] ?? 'sem_acesso'}
                        onChange={v => setNivelSubaba(m.modulo, s.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="text-right">
        {alterado && (
          <Button size="sm" onClick={salvar} className="bg-green-600 hover:bg-green-700 text-white text-xs">
            <Save className="w-3 h-3 mr-1" /> Salvar
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AuditoriaPermissoes() {
  const utils = trpc.useUtils();
  const { data: agentesLista = [], isLoading } = trpc.agentes.listComPermissoes.useQuery();
  const { data: cargos = [] } = trpc.agentes.getCargos.useQuery();
  const { data: templates = [] } = trpc.cargoPermissoes.list.useQuery();
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [aba, setAba] = useState<'individuais' | 'templates' | 'massa'>('individuais');

  const aplicarTemplate = trpc.agentes.aplicarTemplatePermissoes.useMutation({
    onSuccess: (data) => {
      toast.success(`Permissões aplicadas para ${data.atualizados} agente(s)!`);
      utils.agentes.listComPermissoes.invalidate();
    },
    onError: () => toast.error('Erro ao aplicar template'),
  });

  const atualizarPermissoes = trpc.agentes.atualizarPermissoes.useMutation({
    onSuccess: () => {
      toast.success('Permissões salvas!');
      utils.agentes.listComPermissoes.invalidate();
    },
    onError: () => toast.error('Erro ao salvar permissões'),
  });

  const listaFiltrada = useMemo(() => {
    return agentesLista.filter(a => {
      const okCargo = !filtroCargo || a.cargo === filtroCargo;
      const okNome = !filtroNome || (a.nomeAgente ?? '').toLowerCase().includes(filtroNome.toLowerCase()) || (a.chaveJ ?? '').toLowerCase().includes(filtroNome.toLowerCase());
      return okCargo && okNome;
    });
  }, [agentesLista, filtroCargo, filtroNome]);

  return (
    <div className="space-y-4">
      {/* Abas de navegação */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'individuais', label: 'Permissões Individuais' },
          { key: 'templates', label: 'Templates por Cargo' },
          { key: 'massa', label: 'Aplicar em Massa' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setAba(tab.key as typeof aba)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              aba === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Aba: Templates por Cargo */}
      {aba === 'templates' && (
        <TemplatesCargo cargos={(cargos as string[]).filter(Boolean)} />
      )}

      {/* Aba: Aplicar em Massa */}
      {aba === 'massa' && (
        <AplicarEmMassa
          cargos={(cargos as string[]).filter(Boolean)}
          onAplicar={(cargo, nivelGeral, mapa) => {
            aplicarTemplate.mutate({
              cargo,
              permissoes: nivelGeral,
              permissoesModulos: JSON.stringify(mapa),
            });
          }}
        />
      )}

      {/* Aba: Permissões Individuais */}
      {aba === 'individuais' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 p-4 border-b">
            <Shield className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Permissões Individuais</h3>
            <div className="flex gap-2 ml-auto">
              <input
                placeholder="Buscar agente ou ChaveJ..."
                value={filtroNome}
                onChange={e => setFiltroNome(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-52"
              />
              <select
                value={filtroCargo}
                onChange={e => setFiltroCargo(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm"
              >
                <option value="">Todos os cargos</option>
                {(cargos as string[]).filter(Boolean).map(c => <option key={c} value={c!}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-700 hover:bg-blue-700">
                  <TableHead className="text-white font-semibold">Agente</TableHead>
                  <TableHead className="text-white font-semibold">Nível Geral</TableHead>
                  <TableHead className="text-white font-semibold">Permissões por Módulo</TableHead>
                  <TableHead className="text-white font-semibold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell></TableRow>
                ) : listaFiltrada.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-400">Nenhum agente encontrado.</TableCell></TableRow>
                ) : listaFiltrada.map(a => (
                  <AgentePermissaoRow
                    key={a.id}
                    agente={a}
                    templatesCargo={templates.map(t => ({
                      cargo: t.cargo,
                      nivelGeral: t.nivelGeral,
                      permissoesModulos: t.permissoesModulos,
                    }))}
                    onSalvar={(id, permissoes, permissoesModulos) =>
                      atualizarPermissoes.mutate({ id, permissoes, permissoesModulos })
                    }
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-slate-400 p-3">{listaFiltrada.length} agente(s)</p>
        </div>
      )}
    </div>
  );
}
