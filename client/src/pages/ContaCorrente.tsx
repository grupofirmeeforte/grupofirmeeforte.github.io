import { useState, useRef, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

type ContaCorrente = {
  id: number;
  empresa?: string | null;
  mesAno?: string | null;
  chaveJ?: string | null;
  agente?: string | null;
  agencia?: string | null;
  contaCorrente?: string | null;
  tipoServ?: string | null;
  dataOperacao?: string | Date | null;
  produto?: string | null;
  modalidade?: string | null;
  agRelacionamento?: string | null;
  rbm?: string | number | null;
  percComissao?: string | number | null;
  comissao?: string | number | null;
  supervisor?: string | null;
};

type FormData = {
  empresa?: string;
  mesAno?: string;
  chaveJ?: string;
  agente?: string;
  agencia?: string;
  contaCorrente?: string;
  tipoServ?: string;
  dataOperacao?: string;
  produto?: string;
  modalidade?: string;
  agRelacionamento?: string;
  rbm?: string;
  percComissao?: string;
  comissao?: string;
  supervisor?: string;
};

const EMPTY_FORM: FormData = {};

function moeda(val: string | number | null | undefined) {
  if (val === null || val === undefined || val === '') return '-';
  const n = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(n)) return String(val);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(val: string | number | null | undefined) {
  if (val === null || val === undefined || val === '') return '-';
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(n)) return String(val);
  // Se maior que 1, já é percentual direto (ex: 60 → 60,00%)
  if (n > 1) return n.toFixed(2).replace('.', ',') + '%';
  return (n * 100).toFixed(2).replace('.', ',') + '%';
}

function strDate(val: string | Date | null | undefined) {
  if (!val) return '-';
  if (val instanceof Date) return val.toLocaleDateString('pt-BR');
  return val;
}

export default function ContaCorrente() {
  const [, setLocation] = useLocation();
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [calcInput, setCalcInput] = useState<{ chaveJ: string; rbm?: string } | null>(null);

  const utils = trpc.useUtils();

  const { data: registros = [], isLoading } = trpc.contaCorrente.listar.useQuery({
    mesAno: filtroMes || undefined,
    empresa: filtroEmpresa || undefined,
  }, { refetchInterval: 10000, refetchOnWindowFocus: true });

  const { data: meses = [] } = trpc.contaCorrente.listarMeses.useQuery(undefined, { refetchInterval: 10000, refetchOnWindowFocus: true });
  const { data: empresas = [] } = trpc.contaCorrente.listarEmpresas.useQuery(undefined, { refetchInterval: 10000, refetchOnWindowFocus: true });

  // Cálculo automático ao digitar ChaveJ
  const { data: formulasData } = trpc.contaCorrente.calcularFormulas.useQuery(
    calcInput || { chaveJ: '' },
    { enabled: !!(calcInput && calcInput.chaveJ.length >= 5), refetchInterval: 10000, refetchOnWindowFocus: true }
  );

  useEffect(() => {
    if (!formulasData || 'erro' in formulasData) return;
    setForm(prev => ({
      ...prev,
      empresa: formulasData.empresa || prev.empresa,
      agente: formulasData.agente || prev.agente,
      supervisor: formulasData.supervisor || prev.supervisor,
      percComissao: formulasData.percComissao || prev.percComissao,
      comissao: formulasData.comissao || prev.comissao,
    }));
  }, [formulasData]);

  const criar = trpc.contaCorrente.criar.useMutation({
    onSuccess: () => {
      utils.contaCorrente.listar.invalidate();
      utils.contaCorrente.listarMeses.invalidate();
      utils.contaCorrente.listarEmpresas.invalidate();
      toast.success('Registro criado!');
      setModalAberto(false);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const atualizar = trpc.contaCorrente.atualizar.useMutation({
    onSuccess: () => {
      utils.contaCorrente.listar.invalidate();
      toast.success('Registro atualizado!');
      setModalAberto(false);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const excluir = trpc.contaCorrente.excluir.useMutation({
    onSuccess: () => {
      utils.contaCorrente.listar.invalidate();
      toast.success('Registro excluído!');
      setConfirmandoExclusao(null);
    },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const importar = trpc.contaCorrente.importar.useMutation({
    onSuccess: (r) => {
      utils.contaCorrente.listar.invalidate();
      utils.contaCorrente.listarMeses.invalidate();
      utils.contaCorrente.listarEmpresas.invalidate();
      toast.success(`${r.count} registros importados!`);
    },
    onError: (e) => toast.error('Erro na importação: ' + e.message),
  });

  function setField(field: keyof FormData, value: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (['chaveJ', 'rbm'].includes(field)) {
        const chaveJ = field === 'chaveJ' ? value : (prev.chaveJ || '');
        if (chaveJ.length >= 5) {
          setCalcInput({
            chaveJ,
            rbm: field === 'rbm' ? value : prev.rbm,
          });
        }
      }
      return updated;
    });
  }

  function openNovo() {
    setForm(EMPTY_FORM);
    setCalcInput(null);
    setEditandoId(null);
    setModalAberto(true);
  }

  function openEditar(r: ContaCorrente) {
    setForm({
      empresa: r.empresa || undefined,
      mesAno: r.mesAno || undefined,
      chaveJ: r.chaveJ || undefined,
      agente: r.agente || undefined,
      agencia: r.agencia || undefined,
      contaCorrente: r.contaCorrente || undefined,
      tipoServ: r.tipoServ || undefined,
      dataOperacao: r.dataOperacao instanceof Date
        ? r.dataOperacao.toISOString().split('T')[0]
        : (r.dataOperacao || undefined),
      produto: r.produto || undefined,
      modalidade: r.modalidade || undefined,
      agRelacionamento: r.agRelacionamento || undefined,
      rbm: r.rbm !== null && r.rbm !== undefined ? String(r.rbm) : undefined,
      percComissao: r.percComissao !== null && r.percComissao !== undefined ? String(r.percComissao) : undefined,
      comissao: r.comissao !== null && r.comissao !== undefined ? String(r.comissao) : undefined,
      supervisor: r.supervisor || undefined,
    });
    setEditandoId(r.id);
    setModalAberto(true);
  }

  function handleSalvar() {
    const cleanForm = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === null ? undefined : v])
    );
    if (editandoId !== null) {
      atualizar.mutate({ id: editandoId, ...cleanForm } as any);
    } else {
      criar.mutate(cleanForm as any);
    }
  }

  // Mapeamento de colunas do Excel
  const COL_MAP: Record<string, keyof FormData> = {
    'empresa': 'empresa', 'mês ano': 'mesAno', 'mes ano': 'mesAno', 'mês_ano': 'mesAno',
    'chave j': 'chaveJ', 'chavej': 'chaveJ', 'chave_j': 'chaveJ',
    'agente': 'agente', 'agencia': 'agencia', 'agência': 'agencia',
    'conta_corrente': 'contaCorrente', 'conta corrente': 'contaCorrente',
    'tipo_serv': 'tipoServ', 'tipo serv': 'tipoServ', 'tiposerv': 'tipoServ',
    'data': 'dataOperacao', 'dataoperacao': 'dataOperacao', 'data operacao': 'dataOperacao',
    'produto': 'produto', 'modalidade': 'modalidade',
    'ag_relacionamento': 'agRelacionamento', 'ag relacionamento': 'agRelacionamento',
    'rbm': 'rbm', 'perc._comissão': 'percComissao', 'perc. comissão': 'percComissao',
    'perc_comissao': 'percComissao', 'comissão': 'comissao', 'comissao': 'comissao',
    'supervisor': 'supervisor',
  };

  function handleImportar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const sheetName = wb.SheetNames.find(n =>
          n.toLowerCase().includes('conta') && n.toLowerCase().includes('corrente')
        ) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Encontrar linha de cabeçalho
        let headerRow = -1;
        for (let i = 0; i < Math.min(data.length, 10); i++) {
          const row = data[i].map((c: any) => String(c).toLowerCase());
          if (row.some(c => c.includes('empresa') || c.includes('chave') || c.includes('agente'))) {
            headerRow = i;
            break;
          }
        }
        if (headerRow === -1) { toast.error('Cabeçalho não encontrado'); return; }

        const headers = data[headerRow].map((c: any) => String(c).toLowerCase().trim());
        const rows: FormData[] = [];

        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!row.some((v: any) => v !== '')) continue;
          const obj: FormData = {};
          headers.forEach((h: string, idx: number) => {
            const key = COL_MAP[h];
            if (key && row[idx] !== '' && row[idx] !== null && row[idx] !== undefined) {
              obj[key] = String(row[idx]);
            }
          });
          if (obj.chaveJ || obj.agente || obj.mesAno) rows.push(obj);
        }

        if (rows.length === 0) { toast.error('Nenhum dado encontrado'); return; }
        importar.mutate(rows as any);
      } catch (err) {
        toast.error('Erro ao ler arquivo: ' + String(err));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  }

  // Filtro local por busca
  const registrosFiltrados = useMemo(() => {
    if (!filtroBusca) return registros;
    const q = filtroBusca.toLowerCase();
    return registros.filter(r =>
      (r.agente || '').toLowerCase().includes(q) ||
      (r.chaveJ || '').toLowerCase().includes(q) ||
      (r.empresa || '').toLowerCase().includes(q) ||
      (r.contaCorrente || '').toLowerCase().includes(q) ||
      (r.produto || '').toLowerCase().includes(q)
    );
  }, [registros, filtroBusca]);

  // Totalizadores
  const totalRbm = useMemo(() =>
    registrosFiltrados.reduce((acc, r) => acc + (parseFloat(String(r.rbm || 0)) || 0), 0),
    [registrosFiltrados]
  );
  const totalComissao = useMemo(() =>
    registrosFiltrados.reduce((acc, r) => acc + (parseFloat(String(r.comissao || 0)) || 0), 0),
    [registrosFiltrados]
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f5f0ff 100%)' }}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Conta Corrente</h1>
          <p className="text-xs text-gray-500">Operações de conta corrente</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50 flex items-center gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <Button className="bg-blue-700 hover:bg-blue-800 flex items-center gap-2" onClick={openNovo}>
            <Plus className="w-4 h-4" /> Novo
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportar} />
          <Button size="sm" onClick={() => setLocation('/')} className="gap-1 bg-orange-500 hover:bg-orange-600 text-white">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-3 flex gap-3 items-center bg-white/60 border-b flex-wrap">
        <Select value={filtroMes} onValueChange={setFiltroMes}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="Todos os meses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os meses</SelectItem>
            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
          <SelectTrigger className="w-36 bg-white">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1 relative min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9 bg-white" placeholder="Buscar por agente, ChaveJ, conta..." value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} />
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">{registrosFiltrados.length} registro(s)</span>
        {/* Totalizadores */}
        <div className="flex gap-4 ml-auto">
          <div className="text-right">
            <div className="text-xs text-gray-500">Total RBM</div>
            <div className="font-bold text-blue-700">{moeda(totalRbm)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Total Comissão</div>
            <div className="font-bold text-green-700">{moeda(totalComissao)}</div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="px-6 py-4 overflow-x-auto">
        <table className="w-full text-sm border-collapse rounded-xl overflow-hidden shadow-lg min-w-[1200px]">
          <thead>
            <tr style={{ background: 'linear-gradient(90deg, #002776 0%, #1a6ed8 60%, #003399 100%)' }}>
              {['Empresa','Mês/Ano','ChaveJ','Agente','Agência','Conta','Tipo Serv.','Data','Produto','Modalidade','Ag. Relacionamento','RBM','Perc. Comissão','Comissão','Supervisor','Ações'].map(h => (
                <th key={h} className="px-3 py-3 text-left text-white font-semibold text-xs whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={16} className="text-center py-8 text-gray-400">Carregando...</td></tr>
            ) : registrosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={16} className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-2">📋</div>
                  <div className="font-medium">Nenhum registro encontrado</div>
                  <div className="text-sm">Importe uma planilha ou cadastre manualmente</div>
                </td>
              </tr>
            ) : registrosFiltrados.map((r, idx) => (
              <tr key={r.id}
                className="border-b border-blue-100/50 hover:brightness-95 transition-all"
                style={{
                  background: idx % 2 === 0
                    ? 'linear-gradient(90deg, #f0f4ff 0%, #f5f8ff 100%)'
                    : 'linear-gradient(90deg, #e8eeff 0%, #eef0ff 100%)'
                }}
              >
                <td className="px-3 py-2 font-medium text-blue-900 whitespace-nowrap">{r.empresa || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.mesAno || '-'}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.chaveJ || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.agente || '-'}</td>
                <td className="px-3 py-2">{r.agencia || '-'}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.contaCorrente || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.tipoServ || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{strDate(r.dataOperacao)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.produto || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.modalidade || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.agRelacionamento || '-'}</td>
                <td className="px-3 py-2 text-right font-medium text-blue-700 whitespace-nowrap">{moeda(r.rbm)}</td>
                <td className="px-3 py-2 text-right text-indigo-700 whitespace-nowrap">{pct(r.percComissao)}</td>
                <td className="px-3 py-2 text-right font-bold text-green-700 whitespace-nowrap">{moeda(r.comissao)}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.supervisor || '-'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100" onClick={() => openEditar(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-100" onClick={() => setConfirmandoExclusao(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Edição/Criação */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar Registro' : 'Novo Registro'} — Conta Corrente</DialogTitle>
          </DialogHeader>
          <div className="text-xs text-blue-600 bg-blue-50 rounded p-2 mb-2">
            💡 Campos em <span className="font-bold text-blue-700">azul</span> e <span className="font-bold text-green-700">verde</span> são preenchidos automaticamente ao informar o ChaveJ.
          </div>
          <div className="grid grid-cols-3 gap-3 py-2">
            {/* Linha 1 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Empresa (auto)</label>
              <Input value={form.empresa || ''} readOnly className="bg-blue-50 text-blue-800 font-medium cursor-default" placeholder="auto: busca pelo ChaveJ" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Mês/Ano (MM/AAAA)</label>
              <Input value={form.mesAno || ''} onChange={e => setField('mesAno', e.target.value)} placeholder="05/2026" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">ChaveJ *</label>
              <Input value={form.chaveJ || ''} onChange={e => setField('chaveJ', e.target.value.toUpperCase())} placeholder="J1234567" className="font-mono" />
            </div>
            {/* Linha 2 */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Agente (auto)</label>
              <Input value={form.agente || ''} readOnly className="bg-blue-50 text-blue-800 font-medium cursor-default" placeholder="auto: busca pelo ChaveJ" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Agência</label>
              <Input value={form.agencia || ''} onChange={e => setField('agencia', e.target.value)} placeholder="0001" />
            </div>
            {/* Linha 3 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Conta Corrente</label>
              <Input value={form.contaCorrente || ''} onChange={e => setField('contaCorrente', e.target.value)} placeholder="00000-0" className="font-mono" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo Serviço</label>
              <Input value={form.tipoServ || ''} onChange={e => setField('tipoServ', e.target.value)} placeholder="CC / Poupança..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Data Operação</label>
              <Input type="date" value={form.dataOperacao || ''} onChange={e => setField('dataOperacao', e.target.value)} />
            </div>
            {/* Linha 4 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Produto</label>
              <Input value={form.produto || ''} onChange={e => setField('produto', e.target.value)} placeholder="Conta Corrente..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Modalidade</label>
              <Input value={form.modalidade || ''} onChange={e => setField('modalidade', e.target.value)} placeholder="PF / PJ..." />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Ag. Relacionamento</label>
              <Input value={form.agRelacionamento || ''} onChange={e => setField('agRelacionamento', e.target.value)} placeholder="Nome do agente" />
            </div>
            {/* Linha 5 - Fórmulas */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">RBM</label>
              <Input value={form.rbm || ''} onChange={e => setField('rbm', e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Perc. Comissão (auto)</label>
              <Input value={form.percComissao || ''} readOnly className="bg-green-50 text-green-800 font-medium cursor-default" placeholder="auto: Tabela Comissão" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Comissão (auto)</label>
              <Input value={form.comissao || ''} readOnly className="bg-green-50 text-green-800 font-medium cursor-default" placeholder="auto: RBM × Perc.Comissão" />
            </div>
            {/* Linha 6 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Supervisor (auto)</label>
              <Input value={form.supervisor || ''} readOnly className="bg-blue-50 text-blue-800 font-medium cursor-default" placeholder="auto: busca pelo ChaveJ" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={criar.isPending || atualizar.isPending}
              style={{ background: 'linear-gradient(90deg, #002776, #1a6ed8)' }} className="text-white">
              {criar.isPending || atualizar.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={confirmandoExclusao !== null} onOpenChange={() => setConfirmandoExclusao(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">Tem certeza que deseja excluir este registro?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoExclusao(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmandoExclusao && excluir.mutate({ id: confirmandoExclusao })}
              disabled={excluir.isPending}>
              {excluir.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
