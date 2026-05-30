import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PhoneOff, Plus, Trash2, Upload, Search, ShieldAlert } from "lucide-react";

export default function NaoPerturbe() {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [novoTel, setNovoTel] = useState("");
  const [novoMotivo, setNovoMotivo] = useState("");
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [modalImportar, setModalImportar] = useState(false);
  const [textoImportar, setTextoImportar] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.naoPerturbe.listar.useQuery({
    busca: busca || undefined,
    pagina,
    porPagina: 50,
  });

  const { data: contagem } = trpc.naoPerturbe.contar.useQuery();

  const adicionar = trpc.naoPerturbe.adicionar.useMutation({
    onSuccess: () => {
      toast.success("Telefone adicionado à lista Não Perturbe");
      setModalAdicionar(false);
      setNovoTel("");
      setNovoMotivo("");
      utils.naoPerturbe.listar.invalidate();
      utils.naoPerturbe.contar.invalidate();
    },
    onError: (e) => {
      if (e.data?.code === "CONFLICT") toast.error("Telefone já está na lista");
      else toast.error("Erro ao adicionar: " + e.message);
    },
  });

  const remover = trpc.naoPerturbe.remover.useMutation({
    onSuccess: () => {
      toast.success("Telefone removido da lista");
      utils.naoPerturbe.listar.invalidate();
      utils.naoPerturbe.contar.invalidate();
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const importarLote = trpc.naoPerturbe.importarLote.useMutation({
    onSuccess: (r) => {
      toast.success(`Importados: ${r.inseridos} | Duplicatas ignoradas: ${r.duplicatas}`);
      setModalImportar(false);
      setTextoImportar("");
      utils.naoPerturbe.listar.invalidate();
      utils.naoPerturbe.contar.invalidate();
    },
    onError: (e) => toast.error("Erro na importação: " + e.message),
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setTextoImportar(text);
    };
    reader.readAsText(file);
  }

  function handleImportar() {
    const linhas = textoImportar
      .split(/[\n,;]+/)
      .map(l => l.trim())
      .filter(l => l.length >= 8);
    if (linhas.length === 0) {
      toast.error("Nenhum telefone válido encontrado");
      return;
    }
    importarLote.mutate({ telefones: linhas, motivo: "Importação em lote" });
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPaginas = Math.ceil(total / 50);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Lista Não Perturbe</h1>
            <p className="text-sm text-gray-400">Telefones bloqueados para contato</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModalImportar(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Importar Lista
          </Button>
          <Button onClick={() => setModalAdicionar(true)} className="gap-2 bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1a1a2e] border-red-900/30">
          <CardContent className="p-4 flex items-center gap-3">
            <PhoneOff className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-white">{contagem?.total ?? 0}</p>
              <p className="text-xs text-gray-400">Telefones bloqueados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar telefone..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setPagina(1); }}
          className="pl-10 bg-[#1a1a2e] border-gray-700 text-white"
        />
      </div>

      {/* Tabela */}
      <Card className="bg-[#1a1a2e] border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base">
            {total} telefone{total !== 1 ? "s" : ""} na lista
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-[#0f0f1a]">
                  <th className="text-left p-3 text-gray-400 font-medium">Telefone</th>
                  <th className="text-left p-3 text-gray-400 font-medium">Motivo</th>
                  <th className="text-left p-3 text-gray-400 font-medium">Origem</th>
                  <th className="text-left p-3 text-gray-400 font-medium">Adicionado em</th>
                  <th className="text-center p-3 text-gray-400 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center p-8 text-gray-400">Carregando...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="text-center p-8 text-gray-400">
                    {busca ? "Nenhum resultado encontrado" : "Lista vazia — adicione telefones acima"}
                  </td></tr>
                ) : rows.map(row => (
                  <tr key={row.id} className="border-b border-gray-800 hover:bg-[#0f0f1a]/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <PhoneOff className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="text-white font-mono">{row.telefoneFormatado ?? row.telefone}</span>
                      </div>
                    </td>
                    <td className="p-3 text-gray-300">{row.motivo ?? "—"}</td>
                    <td className="p-3">
                      <Badge variant={row.origem === "manual" ? "outline" : "secondary"} className="text-xs">
                        {row.origem === "manual" ? "Manual" : row.origem === "importacao" ? "Importação" : "API"}
                      </Badge>
                    </td>
                    <td className="p-3 text-gray-400 text-xs">
                      {new Date(row.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remover ${row.telefoneFormatado ?? row.telefone} da lista?`)) {
                            remover.mutate({ id: row.id });
                          }
                        }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>Anterior</Button>
              <span className="text-gray-400 text-sm flex items-center px-2">{pagina} / {totalPaginas}</span>
              <Button variant="outline" size="sm" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Adicionar */}
      <Dialog open={modalAdicionar} onOpenChange={setModalAdicionar}>
        <DialogContent className="bg-[#1a1a2e] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Adicionar à Lista Não Perturbe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Telefone *</label>
              <Input
                placeholder="(77) 99999-0000"
                value={novoTel}
                onChange={e => setNovoTel(e.target.value)}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Motivo (opcional)</label>
              <Input
                placeholder="Ex: Solicitou não ser contatado"
                value={novoMotivo}
                onChange={e => setNovoMotivo(e.target.value)}
                className="bg-[#0f0f1a] border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAdicionar(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={adicionar.isPending || novoTel.length < 8}
              onClick={() => adicionar.mutate({ telefone: novoTel, motivo: novoMotivo || undefined })}
            >
              {adicionar.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Importar */}
      <Dialog open={modalImportar} onOpenChange={setModalImportar}>
        <DialogContent className="bg-[#1a1a2e] border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Importar Lista Não Perturbe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Cole os telefones abaixo (um por linha, ou separados por vírgula/ponto-e-vírgula), ou faça upload de um arquivo CSV/TXT.
            </p>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" /> Selecionar arquivo CSV/TXT
            </Button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
            <textarea
              className="w-full h-40 bg-[#0f0f1a] border border-gray-700 rounded p-3 text-white text-sm font-mono resize-none"
              placeholder={"(77) 99999-0001\n(77) 99999-0002\n77988880003"}
              value={textoImportar}
              onChange={e => setTextoImportar(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              {textoImportar.split(/[\n,;]+/).filter(l => l.trim().length >= 8).length} telefone(s) detectado(s)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalImportar(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={importarLote.isPending || textoImportar.trim().length === 0}
              onClick={handleImportar}
            >
              {importarLote.isPending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
