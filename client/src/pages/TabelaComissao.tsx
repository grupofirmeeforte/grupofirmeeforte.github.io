import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

type TabelaRow = {
  id: number;
  empresa: string | null;
  faixa1: string | null; faixa2: string | null; faixa3: string | null;
  faixa4: string | null; faixa5: string | null;
  tabelaCalculo: string | null; referencia: string | null;
  convenio: string | null;
  txJurosDe: string | null; txJurosAte: string | null;
  valorMinimo: string | null;
  mesesDe: string | null; mesesAte: string | null;
  ativo01: string | null; ativo02: string | null; ativo03: string | null;
  ativo04: string | null; ativo05: string | null; ativo06: string | null;
  ativo07: string | null; ativo08: string | null;
};

type FormData = {
  empresa?: string; faixa1?: string; faixa2?: string; faixa3?: string;
  faixa4?: string; faixa5?: string; tabelaCalculo?: string; referencia?: string;
  convenio?: string; txJurosDe?: string; txJurosAte?: string; valorMinimo?: string;
  mesesDe?: string; mesesAte?: string;
  ativo01?: string; ativo02?: string; ativo03?: string; ativo04?: string;
  ativo05?: string; ativo06?: string; ativo07?: string; ativo08?: string;
};

const EMPTY_FORM: FormData = {};

function pct(val: string | null) {
  if (!val) return '-';
  const n = parseFloat(val);
  if (isNaN(n)) return val;
  return (n * 100).toFixed(2).replace('.', ',') + '%';
}

export default function TabelaComissao() {
  const [, setLocation] = useLocation();
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroConvenio, setFiltroConvenio] = useState('');
  const [busca, setBusca] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: rows = [], isLoading } = trpc.tabelaComissao.listar.useQuery({
    empresa: filtroEmpresa || undefined,
    convenio: filtroConvenio || undefined,
  });

  const { data: empresas = [] } = trpc.tabelaComissao.listarEmpresas.useQuery();
  const { data: convenios = [] } = trpc.tabelaComissao.listarConvenios.useQuery();

  const criarMutation = trpc.tabelaComissao.criar.useMutation({
    onSuccess: () => {
      utils.tabelaComissao.listar.invalidate();
      utils.tabelaComissao.listarEmpresas.invalidate();
      utils.tabelaComissao.listarConvenios.invalidate();
      setModalOpen(false);
      toast.success('Registro criado com sucesso!');
    },
    onError: (e) => toast.error('Erro ao criar: ' + e.message),
  });

  const atualizarMutation = trpc.tabelaComissao.atualizar.useMutation({
    onSuccess: () => {
      utils.tabelaComissao.listar.invalidate();
      setModalOpen(false);
      toast.success('Registro atualizado com sucesso!');
    },
    onError: (e) => toast.error('Erro ao atualizar: ' + e.message),
  });

  const excluirMutation = trpc.tabelaComissao.excluir.useMutation({
    onSuccess: () => {
      utils.tabelaComissao.listar.invalidate();
      utils.tabelaComissao.listarEmpresas.invalidate();
      utils.tabelaComissao.listarConvenios.invalidate();
      setDeleteId(null);
      toast.success('Registro excluído com sucesso!');
    },
    onError: (e) => toast.error('Erro ao excluir: ' + e.message),
  });

  const filteredRows = useMemo(() => {
    if (!busca.trim()) return rows;
    const q = busca.toLowerCase();
    return rows.filter(r =>
      (r.empresa || '').toLowerCase().includes(q) ||
      (r.convenio || '').toLowerCase().includes(q) ||
      (r.txJurosDe || '').includes(q) ||
      (r.mesesDe || '').includes(q) ||
      (r.mesesAte || '').includes(q)
    );
  }, [rows, busca]);

  function openNovo() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEditar(row: TabelaRow) {
    setEditingId(row.id);
    const f: FormData = {};
    (Object.keys(EMPTY_FORM) as (keyof FormData)[]).forEach(() => {});
    Object.entries(row).forEach(([k, v]) => {
      if (k !== 'id') (f as Record<string, string>)[k] = v != null ? String(v) : '';
    });
    setForm(f);
    setModalOpen(true);
  }

  function handleSalvar() {
    const data: FormData = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? undefined : v])
    );

    if (editingId !== null) {
      atualizarMutation.mutate({ id: editingId, ...data });
    } else {
      criarMutation.mutate(data);
    }
  }

  function setField(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  const isSaving = criarMutation.isPending || atualizarMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">Tabela de Comissão</h1>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredRows.length} registros
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/')} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <Button onClick={openNovo} className="flex items-center gap-2" style={{ backgroundColor: '#002776' }}>
              <Plus className="w-4 h-4" />
              Novo
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por empresa, convênio, juros..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="max-w-xs"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Select value={filtroEmpresa || '__all__'} onValueChange={v => setFiltroEmpresa(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {empresas.map(e => (
                <SelectItem key={e!} value={e!}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtroConvenio || '__all__'} onValueChange={v => setFiltroConvenio(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Convênio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {convenios.map(c => (
                <SelectItem key={c!} value={c!}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filtroEmpresa || filtroConvenio) && (
            <Button variant="ghost" size="sm" onClick={() => { setFiltroEmpresa(''); setFiltroConvenio(''); }}>
              <X className="w-4 h-4 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="px-6 py-4">
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-3 py-2 text-left whitespace-nowrap">Empresa</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Convênio</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Tx Juros De</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Tx Juros Até</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Valor Mín.</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Meses</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-900">Ativo 01</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-900">Ativo 02</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-900">Ativo 03</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-900">Ativo 04</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-800">Ativo 05</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-800">Ativo 06</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-800">Ativo 07</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-800">Ativo 08</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-700">Ativo 09</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap bg-blue-700">Ativo 10</th>
                  <th className="px-3 py-2 text-center whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={16} className="text-center py-8 text-gray-500">Carregando...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-8 text-gray-500">Nenhum registro encontrado</td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-1.5 font-medium text-gray-900 whitespace-nowrap">{row.empresa || '-'}</td>
                      <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[180px] truncate" title={row.convenio || ''}>{row.convenio || '-'}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">{pct(row.txJurosDe)}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">{row.txJurosAte === 'acima' ? 'acima' : pct(row.txJurosAte)}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">{row.valorMinimo || '-'}</td>
                      <td className="px-3 py-1.5 text-center text-gray-700 whitespace-nowrap">{row.mesesDe && row.mesesAte ? `${row.mesesDe} - ${row.mesesAte}` : row.mesesDe || row.mesesAte || '-'}</td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">{pct(row.ativo01)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">{pct(row.ativo02)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">{pct(row.ativo03)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">{pct(row.ativo04)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-800 font-medium whitespace-nowrap">{pct(row.ativo05)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-800 font-medium whitespace-nowrap">{pct(row.ativo06)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-800 font-medium whitespace-nowrap">{pct(row.ativo07)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-800 font-medium whitespace-nowrap">{pct(row.ativo08)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">{pct((row as any).ativo09)}</td>
                      <td className="px-3 py-1.5 text-center text-blue-700 font-medium whitespace-nowrap">{pct((row as any).ativo10)}</td>
                      <td className="px-3 py-1.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            onClick={() => openEditar(row as TabelaRow)}
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteId(row.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal Editar/Criar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Registro' : 'Novo Registro'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Empresa</label>
              <Input value={form.empresa || ''} onChange={e => setField('empresa', e.target.value)} placeholder="BMF, FLEX..." />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Convênio</label>
              <Input value={form.convenio || ''} onChange={e => setField('convenio', e.target.value)} placeholder="CONSIGNADO INSS, FEDERAL..." />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tx Juros De</label>
              <Input value={form.txJurosDe || ''} onChange={e => setField('txJurosDe', e.target.value)} placeholder="0.0185" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tx Juros Até</label>
              <Input value={form.txJurosAte || ''} onChange={e => setField('txJurosAte', e.target.value)} placeholder="acima ou 0.0199" />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Valor Mínimo</label>
              <Input value={form.valorMinimo || ''} onChange={e => setField('valorMinimo', e.target.value)} placeholder=">=$1.000,00" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Meses De</label>
                <Input value={form.mesesDe || ''} onChange={e => setField('mesesDe', e.target.value)} placeholder="48" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Meses Até</label>
                <Input value={form.mesesAte || ''} onChange={e => setField('mesesAte', e.target.value)} placeholder="60" />
              </div>
            </div>

            <div className="col-span-2 border-t pt-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Faixas de Comissão</p>
              <div className="grid grid-cols-5 gap-2">
                {(['faixa1','faixa2','faixa3','faixa4','faixa5'] as const).map((f, i) => (
                  <div key={f}>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Faixa {i+1}</label>
                    <Input value={form[f] || ''} onChange={e => setField(f, e.target.value)} placeholder="0.0195" className="text-sm" />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tabela Cálculo</label>
              <Input value={form.tabelaCalculo || ''} onChange={e => setField('tabelaCalculo', e.target.value)} placeholder="0.0203" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Referência</label>
              <Input value={form.referencia || ''} onChange={e => setField('referencia', e.target.value)} placeholder="0.02" />
            </div>

            <div className="col-span-2 border-t pt-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Ativos (percentuais de comissão)</p>
              <div className="grid grid-cols-4 gap-2">
                {(['ativo01','ativo02','ativo03','ativo04','ativo05','ativo06','ativo07','ativo08','ativo09','ativo10'] as (keyof FormData)[]).map((a, i) => (
                  <div key={a}>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Ativo {String(i+1).padStart(2,'0')}</label>
                    <Input value={form[a] || ''} onChange={e => setField(a, e.target.value)} placeholder="0.0065" className="text-sm" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={isSaving} style={{ backgroundColor: '#002776' }}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId !== null && excluirMutation.mutate({ id: deleteId })}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
