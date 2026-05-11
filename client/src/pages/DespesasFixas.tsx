import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type DespesaFixa = {
  id: number;
  mesAno: string | null;
  tipoPagto: string | null;
  cidadeUF: string | null;
  empresa: string | null;
  chaveResp: string | null;
  nome: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  cpfCnpj: string | null;
  tipoConta: string | null;
  pix: string | null;
  valor: string | null;
  pago: boolean;
  dataPagto: string | null;
  dataVencer: string | null;
};

function formatCurrency(v: string | null | undefined) {
  if (!v) return "-";
  const n = parseFloat(v);
  if (isNaN(n)) return "-";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isAtrasado(dataVencer: string | null) {
  if (!dataVencer) return false;
  const partes = dataVencer.split("/");
  if (partes.length !== 3) return false;
  const [d, m, a] = partes;
  const dt = new Date(Number(a), Number(m) - 1, Number(d));
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return dt < hoje;
}

export default function DespesasFixasPage() {
  const [, navigate] = useLocation();

  // Filtros
  const [filtroMesAno, setFiltroMesAno] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroPago, setFiltroPago] = useState<"todos" | "sim" | "nao">("todos");
  const [filtroNome, setFiltroNome] = useState("");
  const [page, setPage] = useState(1);

  // Edição inline Dt Pagto
  const [editandoDtPagto, setEditandoDtPagto] = useState<number | null>(null);
  const [valorDtPagto, setValorDtPagto] = useState("");
  const dtPagtoRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const queryParams = {
    mesAno: filtroMesAno || undefined,
    empresa: filtroEmpresa || undefined,
    tipoPagto: filtroTipo || undefined,
    pago: filtroPago,
    nome: filtroNome || undefined,
  };

  const { data: rows = [] } = trpc.despesasFixas.list.useQuery({ ...queryParams, page, limit: 100 });
  const { data: total = 0 } = trpc.despesasFixas.count.useQuery(queryParams);
  const { data: meses = [] } = trpc.despesasFixas.meses.useQuery();
  const { data: empresas = [] } = trpc.despesasFixas.empresas.useQuery();

  const editarMutation = trpc.despesasFixas.editar.useMutation({
    onSuccess: () => {
      utils.despesasFixas.list.invalidate();
      setEditandoDtPagto(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deletarMutation = trpc.despesasFixas.deletar.useMutation({
    onSuccess: () => { toast.success("Registro excluído!"); utils.despesasFixas.list.invalidate(); utils.despesasFixas.count.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const iniciarEdicaoDtPagto = (row: DespesaFixa) => {
    setEditandoDtPagto(row.id);
    setValorDtPagto(row.dataPagto ?? "");
    setTimeout(() => dtPagtoRef.current?.focus(), 50);
  };

  const salvarDtPagto = (id: number) => {
    const pago = !!valorDtPagto;
    editarMutation.mutate({ id, dataPagto: valorDtPagto || undefined, pago });
  };

  // Exportar Excel
  function exportarExcel() {
    const data = rows.map(r => ({
      "Mês Ano": r.mesAno ?? "",
      "Tipo Pagto": r.tipoPagto ?? "",
      "Cidade/UF": r.cidadeUF ?? "",
      "Empresa": r.empresa ?? "",
      "Chave Resp.": r.chaveResp ?? "",
      "Nome": r.nome ?? "",
      "Banco": r.banco ?? "",
      "Agência": r.agencia ?? "",
      "Conta": r.conta ?? "",
      "CPF/CNPJ": r.cpfCnpj ?? "",
      "Tipo Conta": r.tipoConta ?? "",
      "Pix": r.pix ?? "",
      "Valor": r.valor ? parseFloat(r.valor) : 0,
      "Pago": r.dataPagto ? "Pago" : isAtrasado(r.dataVencer) ? "Atrasado" : "Não",
      "Dt. Pagto": r.dataPagto ?? "",
      "Dt. Vencer": r.dataVencer ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DespesasFixas");
    XLSX.writeFile(wb, "DespesasFixas.xlsx");
  }

  const totalPages = Math.ceil(total / 100);

  // Calcular total de valor
  const totalValor = rows.reduce((acc, r) => acc + (r.valor ? parseFloat(r.valor) : 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Despesas Fixas</h1>
          <p className="text-xs text-gray-400">Total: {total} registros</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarExcel} size="sm" className="bg-green-700 hover:bg-green-600 text-white text-xs h-8">
            Exportar Excel
          </Button>
          <Button onClick={() => navigate("/financeiro")} size="sm" className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-8">
            Voltar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="text-xs font-semibold text-gray-400 mb-2">Filtros</div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Mês/Ano</label>
            <select
              value={filtroMesAno}
              onChange={e => { setFiltroMesAno(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 w-36"
            >
              <option value="">Todos</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Empresa</label>
            <select
              value={filtroEmpresa}
              onChange={e => { setFiltroEmpresa(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 w-28"
            >
              <option value="">Todas</option>
              {empresas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tipo Pagto</label>
            <select
              value={filtroTipo}
              onChange={e => { setFiltroTipo(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 w-36"
            >
              <option value="">Todos</option>
              {["Aluguel","DespesasLoja","Energia","Internet","Outros"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Pago</label>
            <select
              value={filtroPago}
              onChange={e => { setFiltroPago(e.target.value as any); setPage(1); }}
              className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 w-28"
            >
              <option value="todos">Todos</option>
              <option value="sim">Pago</option>
              <option value="nao">Não Pago</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Nome</label>
            <input
              type="text"
              value={filtroNome}
              onChange={e => { setFiltroNome(e.target.value); setPage(1); }}
              placeholder="Ex: João Silva"
              className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1.5 w-44"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-purple-700 to-pink-600 text-white">
              <th className="px-2 py-2 text-left whitespace-nowrap">Mês Ano</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Tipo Pagto</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Cidade/UF</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Empresa</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Chave Resp.</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Nome</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Banco</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Agência</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Conta</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">CPF/CNPJ</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Tipo Conta</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Pix</th>
              <th className="px-2 py-2 text-right whitespace-nowrap">Valor</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Pago</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Dt. Pagto</th>
              <th className="px-2 py-2 text-left whitespace-nowrap">Dt. Vencer</th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={17} className="text-center py-12 text-gray-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={row.id}
                className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${i % 2 === 0 ? "bg-gray-900/60" : "bg-gray-900/30"}`}>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.mesAno || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.tipoPagto || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.cidadeUF || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.empresa || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap font-mono">{row.chaveResp || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap max-w-[180px] truncate" title={row.nome ?? ""}>{row.nome || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.banco || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.agencia || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.conta || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap font-mono">{row.cpfCnpj || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.tipoConta || "-"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap max-w-[120px] truncate" title={row.pix ?? ""}>{row.pix || "-"}</td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap font-medium text-green-400">{formatCurrency(row.valor)}</td>
                <td className="px-2 py-1.5 text-center">
                  {row.dataPagto
                    ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-900/60 text-green-300 border border-green-700">Pago</span>
                    : isAtrasado(row.dataVencer)
                      ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-900/60 text-orange-300 border border-orange-600">Atrasado</span>
                      : <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/60 text-red-300 border border-red-700">Não</span>
                  }
                </td>
                {/* Dt. Pagto editável inline */}
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {editandoDtPagto === row.id ? (
                    <input
                      ref={dtPagtoRef}
                      type="text"
                      value={valorDtPagto}
                      onChange={e => setValorDtPagto(e.target.value)}
                      onBlur={() => salvarDtPagto(row.id)}
                      onKeyDown={e => {
                        if (e.key === "Enter") salvarDtPagto(row.id);
                        if (e.key === "Escape") setEditandoDtPagto(null);
                      }}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className="w-28 border border-blue-500 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-800 text-white"
                    />
                  ) : (
                    <span
                      onClick={() => iniciarEdicaoDtPagto(row as DespesaFixa)}
                      className="cursor-pointer hover:bg-blue-900/40 rounded px-1 py-0.5 min-w-[6rem] inline-block border border-transparent hover:border-blue-600"
                      title="Clique para editar"
                    >
                      {row.dataPagto || <span className="text-gray-500 italic text-xs">DD/MM/AAAA</span>}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">{row.dataVencer || "-"}</td>
                <td className="px-2 py-1.5 text-center whitespace-nowrap">
                  <Button size="sm" variant="outline"
                    onClick={() => { if (confirm("Excluir este registro?")) deletarMutation.mutate({ id: row.id }); }}
                    className="h-6 px-2 text-xs bg-red-900/40 border-red-700 text-red-300 hover:bg-red-800">
                    Apagar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-800 font-semibold text-white border-t-2 border-purple-600">
                <td colSpan={12} className="px-2 py-2 text-right text-xs text-gray-400">Total:</td>
                <td className="px-2 py-2 text-right text-green-400 text-xs">
                  {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4 bg-gray-900 border-t border-gray-800">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}
            className="h-7 px-3 text-xs bg-gray-800 border-gray-700 text-gray-300">
            Anterior
          </Button>
          <span className="text-xs text-gray-400">Página {page} de {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="h-7 px-3 text-xs bg-gray-800 border-gray-700 text-gray-300">
            Próxima
          </Button>
        </div>
      )}
    </div>
  );
}
