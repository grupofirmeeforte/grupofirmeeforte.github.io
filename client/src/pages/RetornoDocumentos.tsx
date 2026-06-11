import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Search, FileText } from "lucide-react";
import { toast } from "sonner";

interface DocRow {
  id: number;
  numeroDoc: string;
  pilar: string;
  nomeDocumento: string;
  finalidade: string;
  naPasta: string;
  area: string;
  responsavel: string;
  aprovador: string;
  versao: number;
  dataCriacao: string | null;
  publicacaoAtual: string | null;
  dataAtualizacao: string | null;
  codigoDocumento: string;
  fluxoAprovacao: string;
}

const emptyForm = {
  numeroDoc: '',
  pilar: '',
  nomeDocumento: '',
  finalidade: '',
  naPasta: 'Sim',
  area: '',
  responsavel: '',
  aprovador: '',
  versao: 1,
  dataCriacao: '',
  publicacaoAtual: '',
  dataAtualizacao: '',
  codigoDocumento: '',
  fluxoAprovacao: 'Reunião Executiva - E-mail',
};

export default function RetornoDocumentos() {
  const [empresa, setEmpresa] = useState("__all__");
  const [pilar, setPilar] = useState("__all__");
  const [area, setArea] = useState("__all__");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [empresaNovo, setEmpresaNovo] = useState<"BMF" | "Flex">("BMF");

  const utils = trpc.useUtils();
  const { data: rows = [] } = trpc.retornoDocumentos.listar.useQuery({ empresa, pilar, area, search });
  const { data: filtros } = trpc.retornoDocumentos.filtros.useQuery();
  const { data: proxNumero } = trpc.retornoDocumentos.proximoNumero.useQuery({ empresa: empresaNovo }, { enabled: modal && editId === null });

  const criarMut = trpc.retornoDocumentos.criar.useMutation({
    onSuccess: () => { utils.retornoDocumentos.listar.invalidate(); utils.retornoDocumentos.proximoNumero.invalidate(); toast.success("Documento criado"); setModal(false); },
    onError: (e) => toast.error(e.message),
  });
  const atualizarMut = trpc.retornoDocumentos.atualizar.useMutation({
    onSuccess: () => { utils.retornoDocumentos.listar.invalidate(); toast.success("Documento atualizado"); setModal(false); },
    onError: (e) => toast.error(e.message),
  });
  const excluirMut = trpc.retornoDocumentos.excluir.useMutation({
    onSuccess: () => { utils.retornoDocumentos.listar.invalidate(); toast.success("Documento excluído"); },
    onError: (e) => toast.error(e.message),
  });

  function openNew() {
    setEditId(null);
    setForm({ ...emptyForm, numeroDoc: proxNumero || '' });
    setModal(true);
  }

  function openEdit(row: DocRow) {
    setEditId(row.id);
    setForm({
      numeroDoc: row.numeroDoc,
      pilar: row.pilar || '',
      nomeDocumento: row.nomeDocumento || '',
      finalidade: row.finalidade || '',
      naPasta: row.naPasta || 'Sim',
      area: row.area || '',
      responsavel: row.responsavel || '',
      aprovador: row.aprovador || '',
      versao: row.versao || 1,
      dataCriacao: row.dataCriacao || '',
      publicacaoAtual: row.publicacaoAtual || '',
      dataAtualizacao: row.dataAtualizacao || '',
      codigoDocumento: row.codigoDocumento || '',
      fluxoAprovacao: row.fluxoAprovacao || '',
    });
    setModal(true);
  }

  function handleSave() {
    if (editId) {
      atualizarMut.mutate({
        id: editId,
        pilar: form.pilar,
        nomeDocumento: form.nomeDocumento,
        finalidade: form.finalidade,
        naPasta: form.naPasta,
        area: form.area,
        responsavel: form.responsavel,
        aprovador: form.aprovador,
        versao: form.versao,
        dataCriacao: form.dataCriacao || null,
        publicacaoAtual: form.publicacaoAtual || null,
        dataAtualizacao: form.dataAtualizacao || null,
        codigoDocumento: form.codigoDocumento,
        fluxoAprovacao: form.fluxoAprovacao,
      });
    } else {
      criarMut.mutate({
        ...form,
        dataCriacao: form.dataCriacao || null,
        publicacaoAtual: form.publicacaoAtual || null,
        dataAtualizacao: form.dataAtualizacao || null,
      });
    }
  }

  function handleDelete(id: number) {
    if (confirm("Excluir este documento?")) {
      excluirMut.mutate({ id });
    }
  }

  // Atualizar número quando empresa muda
  const handleEmpresaNovoChange = (v: "BMF" | "Flex") => {
    setEmpresaNovo(v);
  };

  // Quando proxNumero muda, atualizar form se estiver criando
  useMemo(() => {
    if (modal && editId === null && proxNumero) {
      setForm(f => ({ ...f, numeroDoc: proxNumero }));
    }
  }, [proxNumero, modal, editId]);

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString('pt-BR');
    } catch { return d; }
  };

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2 top-2 w-3.5 h-3.5 text-gray-700" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-7 h-8 text-xs w-48" />
        </div>
        <Select value={empresa} onValueChange={setEmpresa}>
          <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas</SelectItem>
            <SelectItem value="BMF">BMF</SelectItem>
            <SelectItem value="Flex">Flex</SelectItem>
          </SelectContent>
        </Select>
        <Select value={pilar} onValueChange={setPilar}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos Pilares</SelectItem>
            {filtros?.pilares.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas Áreas</SelectItem>
            {filtros?.areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="h-8 gap-1 text-xs" onClick={openNew}><Plus className="w-3.5 h-3.5" />Novo</Button>
      </div>

      {/* Tabela compacta */}
      <div className="overflow-auto border rounded" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <table className="w-full text-[10px] border-collapse" style={{ tableLayout: 'auto' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-amber-700 text-white">
              <th className="px-1 py-1 text-left font-semibold whitespace-nowrap">Nº Doc</th>
              <th className="px-1 py-1 text-left font-semibold whitespace-nowrap">Pilar</th>
              <th className="px-1 py-1 text-left font-semibold">Nome do Documento</th>
              <th className="px-1 py-1 text-left font-semibold whitespace-nowrap">Finalidade</th>
              <th className="px-1 py-1 text-center font-semibold whitespace-nowrap">Pasta</th>
              <th className="px-1 py-1 text-left font-semibold whitespace-nowrap">Área</th>
              <th className="px-1 py-1 text-left font-semibold whitespace-nowrap">Responsável</th>
              <th className="px-1 py-1 text-left font-semibold whitespace-nowrap">Aprovador</th>
              <th className="px-1 py-1 text-center font-semibold whitespace-nowrap">V</th>
              <th className="px-1 py-1 text-center font-semibold whitespace-nowrap">Criação</th>
              <th className="px-1 py-1 text-center font-semibold whitespace-nowrap">Publicação</th>
              <th className="px-1 py-1 text-center font-semibold whitespace-nowrap">Atualização</th>
              <th className="px-1 py-1 text-center font-semibold whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(rows as DocRow[]).filter(r => r.nomeDocumento).map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50'} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td className="px-1 py-0.5 font-medium whitespace-nowrap">{row.numeroDoc}</td>
                <td className="px-1 py-0.5 whitespace-nowrap">{row.pilar}</td>
                <td className="px-1 py-0.5" style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.nomeDocumento}>{row.nomeDocumento}</td>
                <td className="px-1 py-0.5 whitespace-nowrap" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.finalidade}</td>
                <td className="px-1 py-0.5 text-center">{row.naPasta}</td>
                <td className="px-1 py-0.5 whitespace-nowrap">{row.area}</td>
                <td className="px-1 py-0.5 whitespace-nowrap">{row.responsavel}</td>
                <td className="px-1 py-0.5 whitespace-nowrap">{row.aprovador}</td>
                <td className="px-1 py-0.5 text-center">{row.versao}</td>
                <td className="px-1 py-0.5 text-center whitespace-nowrap">{formatDate(row.dataCriacao)}</td>
                <td className="px-1 py-0.5 text-center whitespace-nowrap">{formatDate(row.publicacaoAtual)}</td>
                <td className="px-1 py-0.5 text-center whitespace-nowrap">{formatDate(row.dataAtualizacao)}</td>
                <td className="px-1 py-0.5 text-center whitespace-nowrap">
                  <button onClick={() => openEdit(row)} className="text-blue-600 hover:text-blue-800 mr-1" title="Editar"><Pencil className="w-3 h-3 inline" /></button>
                  <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800" title="Excluir"><Trash2 className="w-3 h-3 inline" /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={13} className="text-center py-4 text-gray-700">Nenhum documento encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-gray-500">{(rows as DocRow[]).filter(r => r.nomeDocumento).length} documentos</div>

      {/* Modal Criar/Editar */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-4 h-4" />{editId ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {!editId && (
              <div>
                <Label className="text-xs">Empresa</Label>
                <Select value={empresaNovo} onValueChange={(v) => handleEmpresaNovoChange(v as "BMF" | "Flex")}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BMF">BMF</SelectItem>
                    <SelectItem value="Flex">Flex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs">Nº Documento</Label>
              <Input value={form.numeroDoc} onChange={e => setForm(f => ({ ...f, numeroDoc: e.target.value }))} className="h-8 text-xs" readOnly={!!editId} />
            </div>
            <div>
              <Label className="text-xs">Pilar</Label>
              <Input value={form.pilar} onChange={e => setForm(f => ({ ...f, pilar: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Nome do Documento</Label>
              <Input value={form.nomeDocumento} onChange={e => setForm(f => ({ ...f, nomeDocumento: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Finalidade</Label>
              <Input value={form.finalidade} onChange={e => setForm(f => ({ ...f, finalidade: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Na Pasta</Label>
              <Select value={form.naPasta} onValueChange={v => setForm(f => ({ ...f, naPasta: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Área</Label>
              <Input value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Responsável</Label>
              <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Aprovador</Label>
              <Input value={form.aprovador} onChange={e => setForm(f => ({ ...f, aprovador: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Versão</Label>
              <Input type="number" value={form.versao} onChange={e => setForm(f => ({ ...f, versao: Number(e.target.value) }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Data Criação</Label>
              <Input type="date" value={form.dataCriacao} onChange={e => setForm(f => ({ ...f, dataCriacao: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Publicação Atual</Label>
              <Input type="date" value={form.publicacaoAtual} onChange={e => setForm(f => ({ ...f, publicacaoAtual: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Data Atualização</Label>
              <Input type="date" value={form.dataAtualizacao} onChange={e => setForm(f => ({ ...f, dataAtualizacao: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs">Fluxo de Aprovação</Label>
              <Input value={form.fluxoAprovacao} onChange={e => setForm(f => ({ ...f, fluxoAprovacao: e.target.value }))} className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={criarMut.isPending || atualizarMut.isPending}>
              {(criarMut.isPending || atualizarMut.isPending) ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
