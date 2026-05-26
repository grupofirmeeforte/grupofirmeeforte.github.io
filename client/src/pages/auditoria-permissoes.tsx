import { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, ChevronDown, ChevronUp, Save, Copy } from 'lucide-react';

// ─── Tipos e constantes ────────────────────────────────────────────────────────
type NivelPermissao = 'sem_acesso' | 'leitura' | 'editar' | 'admin';
type PermissoesMap = Record<string, Record<string, NivelPermissao>>;

const MODULOS_PERMISSOES = [
  { modulo: 'meu-painel', label: 'Meu Painel', subabas: [
    { key: 'painel-agente', label: 'Meu Painel' },
    { key: 'mensagem-do-dia', label: 'Mensagem do Dia' },
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
    { key: 'perspectiva', label: 'Perspectiva de Ganho' },
    { key: 'minha-tabela', label: 'Minha Tabela' },
  ]},
  { modulo: 'crm', label: 'CRM', subabas: [
    { key: 'atendimentos', label: 'Atendimentos' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'mailing', label: 'Mailing' },
    { key: 'oportunidades', label: 'Oportunidades' },
    { key: 'relatorios-crm', label: 'Relatórios CRM' },
    { key: 'tarefas', label: 'Tarefas / Follow-up' },
  ]},
  { modulo: 'febraban', label: 'Febraban', subabas: [
    { key: 'producao-bb', label: 'Produção BB' },
    { key: 'acompanhamento-diario', label: 'Acompanhamento Diário' },
    { key: 'graficos', label: 'Gráficos' },
    { key: 'relatorio-chavej', label: 'Relatório por Chave J' },
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

// ─── Painel de template por cargo ─────────────────────────────────────────────
function TemplateCargo({ cargos, onAplicar }: { cargos: string[]; onAplicar: (cargo: string, nivelGeral: NivelPermissao, mapa: PermissoesMap) => void }) {
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [nivelGlobal, setNivelGlobal] = useState<NivelPermissao>('leitura');
  const [mapa, setMapa] = useState<PermissoesMap>(() => buildDefaultPermissoes('leitura'));
  const [expandido, setExpandido] = useState<string | null>(null);

  const aplicarGlobal = (nivel: NivelPermissao) => {
    setNivelGlobal(nivel);
    setMapa(buildDefaultPermissoes(nivel));
  };

  const setNivelModulo = (modulo: string, nivel: NivelPermissao) => {
    setMapa(prev => {
      const novo = { ...prev, [modulo]: { ...prev[modulo] } };
      for (const key of Object.keys(novo[modulo])) novo[modulo][key] = nivel;
      return novo;
    });
  };

  const setNivelSubaba = (modulo: string, key: string, nivel: NivelPermissao) => {
    setMapa(prev => ({ ...prev, [modulo]: { ...prev[modulo], [key]: nivel } }));
  };

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-blue-800 text-base">Aplicar Template por Cargo</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Configure um template de permissões e aplique para <strong>todos os agentes</strong> de um cargo de uma só vez.
      </p>

      {/* Seletor de cargo e nível global */}
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
      </div>

      {/* Módulos expansíveis */}
      <div className="space-y-1 mb-4">
        {MODULOS_PERMISSOES.map(m => {
          const aberto = expandido === m.modulo;
          // Nível predominante do módulo
          const niveis = Object.values(mapa[m.modulo] ?? {});
          const nivelMod = niveis.length > 0 ? (niveis.every(v => v === niveis[0]) ? niveis[0] : 'editar') : 'sem_acesso';
          return (
            <div key={m.modulo} className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandido(aberto ? null : m.modulo)}
              >
                <div className="flex items-center gap-2">
                  {aberto ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                  <span className="text-sm font-medium text-gray-700">{m.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${nivelColor(nivelMod as NivelPermissao).bg} ${nivelColor(nivelMod as NivelPermissao).color}`}>
                    {nivelColor(nivelMod as NivelPermissao).label}
                  </span>
                </div>
                <NivelSelect value={nivelMod as NivelPermissao} onChange={v => setNivelModulo(m.modulo, v)} />
              </div>
              {aberto && (
                <div className="px-4 py-2 space-y-1.5 bg-white">
                  {m.subabas.map(s => (
                    <div key={s.key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{s.label}</span>
                      <NivelSelect value={mapa[m.modulo]?.[s.key] ?? 'sem_acesso'} onChange={v => setNivelSubaba(m.modulo, s.key, v)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button
        disabled={!cargoSelecionado}
        onClick={() => {
          if (!cargoSelecionado) return;
          onAplicar(cargoSelecionado, nivelGlobal, mapa);
        }}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Shield className="w-4 h-4 mr-2" />
        Aplicar para todos os {cargoSelecionado || 'agentes do cargo'}
      </Button>
    </div>
  );
}

// ─── Linha individual de agente ───────────────────────────────────────────────
function AgentePermissaoRow({ agente, onSalvar }: {
  agente: { id: number; nomeAgente: string | null; chaveJ: string | null; empresa: string | null; cargo: string | null; situacao: string | null; permissoes: string | null; permissoesModulos: string | null };
  onSalvar: (id: number, permissoes: string, permissoesModulos: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [mapa, setMapa] = useState<PermissoesMap>(() => {
    try { return JSON.parse(agente.permissoesModulos ?? '{}'); } catch { return {}; }
  });
  const [nivelGeral, setNivelGeral] = useState<NivelPermissao>((agente.permissoes as NivelPermissao) ?? 'sem_acesso');
  const [alterado, setAlterado] = useState(false);

  // Sincronizar estado local quando os dados do agente mudarem (ex: após aplicar template)
  useEffect(() => {
    try { setMapa(JSON.parse(agente.permissoesModulos ?? '{}')); } catch { setMapa({}); }
    setNivelGeral((agente.permissoes as NivelPermissao) ?? 'sem_acesso');
    setAlterado(false);
  }, [agente.permissoesModulos, agente.permissoes]);

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

  // Resumo de permissões por módulo
  const resumo = MODULOS_PERMISSOES.map(m => {
    const niveis = m.subabas.map(s => mapa[m.modulo]?.[s.key] ?? 'sem_acesso');
    const predominante = niveis.every(v => v === niveis[0]) ? niveis[0] : 'editar';
    return { ...m, nivel: predominante as NivelPermissao };
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
      </TableCell>
      <TableCell>
        <NivelSelect value={nivelGeral} onChange={setNivelGlobal} />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {resumo.map(m => {
            const n = nivelColor(m.nivel);
            return (
              <span key={m.modulo} className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${n.bg} ${n.color}`}>
                {m.label}
              </span>
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
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroNome, setFiltroNome] = useState('');

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
    <div className="space-y-6">
      {/* Template em massa */}
      <TemplateCargo
        cargos={(cargos as string[]).filter(Boolean)}
        onAplicar={(cargo, nivelGeral, mapa) => {
          aplicarTemplate.mutate({
            cargo,
            permissoes: nivelGeral,
            permissoesModulos: JSON.stringify(mapa),
          });
        }}
      />

      {/* Lista individual */}
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
    </div>
  );
}
