import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ChaveJRespInput } from "@/components/ChaveJRespInput";
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
  chaveJResp?: string | null;
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

const TIPOS_PAGTO = [
  "Adto", "Agua", "Ajuda de Custo", "Aluguel", "Cancelado", "Comissão",
  "DespesasLoja", "DespesasViagem", "Energia", "Ferias", "Internet",
  "Outros", "Pagto", "Propaganda", "Reajuste", "Reembolso", "Salário",
];

const EMPTY: Omit<DespesaFixa, "id" | "pago"> = {
  mesAno: "", tipoPagto: "", cidadeUF: "", empresa: "", chaveResp: "",
  nome: "", banco: "", agencia: "", conta: "", cpfCnpj: "",
  tipoConta: "", pix: "", valor: "", dataPagto: "", dataVencer: "",
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

function maskMesAno(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}

function FormField({ label, value, onChange, placeholder, isMesAno }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; isMesAno?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] text-gray-400 font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(isMesAno ? maskMesAno(e.target.value) : e.target.value)}
        placeholder={placeholder ?? label}
        maxLength={isMesAno ? 7 : undefined}
        inputMode={isMesAno ? "numeric" : undefined}
        className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
      />
    </div>
  );
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

  // Seleção
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  // Repetir meses (apenas no modo novo)
  const [repetirMeses, setRepetirMeses] = useState(1);

  // Modal editar/novo
  const [chaveJRespBusca, setChaveJRespBusca] = useState("");
  const [modal, setModal] = useState<{ open: boolean; modo: "novo" | "editar"; dados: Omit<DespesaFixa, "id" | "pago"> & { id?: number } }>({
    open: false, modo: "novo", dados: { ...EMPTY },
  });

  // Edição inline Dt Pagto
  const [editandoDtPagto, setEditandoDtPagto] = useState<number | null>(null);
  const [valorDtPagto, setValorDtPagto] = useState("");
  const dtPagtoRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const { data: dadosAgenteResp } = trpc.pagamentos.buscarAgente.useQuery(
    { chaveJ: chaveJRespBusca },
    { enabled: chaveJRespBusca.length >= 3 }
  );

  useEffect(() => {
    if (dadosAgenteResp && chaveJRespBusca && modal.open) {
      setModal(prev => ({
        ...prev,
        dados: {
          ...prev.dados,
          empresa: dadosAgenteResp.empresa ?? prev.dados.empresa,
          nome: dadosAgenteResp.favorecido || dadosAgenteResp.nomeAgente || prev.dados.nome,
          banco: dadosAgenteResp.banco ?? prev.dados.banco,
          agencia: dadosAgenteResp.agencia ?? prev.dados.agencia,
          conta: dadosAgenteResp.conta ?? prev.dados.conta,
          cpfCnpj: dadosAgenteResp.cpfAgente ?? prev.dados.cpfCnpj,
          tipoConta: dadosAgenteResp.tipo ?? prev.dados.tipoConta,
          pix: dadosAgenteResp.pix ?? prev.dados.pix,
          cidadeUF: dadosAgenteResp.cidade && dadosAgenteResp.uf
            ? `${dadosAgenteResp.cidade}/${dadosAgenteResp.uf}`
            : dadosAgenteResp.cidade ?? prev.dados.cidadeUF,
        }
      }));
    }
  }, [dadosAgenteResp, chaveJRespBusca]);

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

  const invalidate = () => { utils.despesasFixas.list.invalidate(); utils.despesasFixas.count.invalidate(); utils.despesasFixas.meses.invalidate(); };

  const editarMutation = trpc.despesasFixas.editar.useMutation({
    onSuccess: () => { invalidate(); setEditandoDtPagto(null); setModal(m => ({ ...m, open: false })); toast.success("Salvo!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const criarMutation = trpc.despesasFixas.criar.useMutation({
    onSuccess: () => { invalidate(); setModal(m => ({ ...m, open: false })); toast.success("Registro criado!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deletarMutation = trpc.despesasFixas.deletar.useMutation({
    onSuccess: () => { toast.success("Excluído!"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const enviarParaPagtoMutation = trpc.despesasFixas.enviarParaPagto.useMutation({
    onSuccess: (res: any) => {
      toast.success(`${res.enviados} registro(s) enviado(s) para Pagamentos!`);
      if (res.ignorados > 0) toast.info(`${res.ignorados} já existiam e foram ignorados.`);
      setSelecionados(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Seleção
  const toggleSelecionado = (id: number) => setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleTodos = () => setSelecionados(selecionados.size === rows.length ? new Set() : new Set(rows.map(r => r.id)));
  const todosSelecionados = rows.length > 0 && selecionados.size === rows.length;
  const algunsSelecionados = selecionados.size > 0 && selecionados.size < rows.length;

  const abrirNovo = () => { setRepetirMeses(1); setModal({ open: true, modo: "novo", dados: { ...EMPTY } }); };
  const abrirEditar = (row: DespesaFixa) => setModal({
    open: true, modo: "editar",
    dados: { id: row.id, mesAno: row.mesAno ?? "", tipoPagto: row.tipoPagto ?? "", cidadeUF: row.cidadeUF ?? "", empresa: row.empresa ?? "", chaveResp: row.chaveResp ?? "", nome: row.nome ?? "", banco: row.banco ?? "", agencia: row.agencia ?? "", conta: row.conta ?? "", cpfCnpj: row.cpfCnpj ?? "", tipoConta: row.tipoConta ?? "", pix: row.pix ?? "", valor: row.valor ?? "", dataPagto: row.dataPagto ?? "", dataVencer: row.dataVencer ?? "" },
  });

  const salvarModal = () => {
    const d = modal.dados;
    if (modal.modo === "editar" && d.id) {
      editarMutation.mutate({ id: d.id, mesAno: d.mesAno || undefined, tipoPagto: d.tipoPagto || undefined, cidadeUF: d.cidadeUF || undefined, empresa: d.empresa || undefined, chaveResp: d.chaveResp || undefined, nome: d.nome || undefined, banco: d.banco || undefined, agencia: d.agencia || undefined, conta: d.conta || undefined, cpfCnpj: d.cpfCnpj || undefined, tipoConta: d.tipoConta || undefined, pix: d.pix || undefined, valor: d.valor || undefined, dataPagto: d.dataPagto || undefined, dataVencer: d.dataVencer || undefined });
    } else {
      // Gerar registros para cada mês
      const mesesParaCriar: string[] = [];
      if (d.mesAno && repetirMeses > 1) {
        const [mm, aaaa] = (d.mesAno ?? "").split("/");
        let m = parseInt(mm, 10);
        let a = parseInt(aaaa, 10);
        for (let i = 0; i < repetirMeses; i++) {
          mesesParaCriar.push(`${String(m).padStart(2, "0")}/${a}`);
          m++;
          if (m > 12) { m = 1; a++; }
        }
      } else {
        mesesParaCriar.push(d.mesAno ?? "");
      }
      // Criar um por um sequencialmente
      const criarTodos = async () => {
        for (const mes of mesesParaCriar) {
          await new Promise<void>((resolve, reject) => {
            criarMutation.mutate({ mesAno: mes || undefined, tipoPagto: d.tipoPagto || undefined, cidadeUF: d.cidadeUF || undefined, empresa: d.empresa || undefined, chaveResp: d.chaveResp || undefined, nome: d.nome || undefined, banco: d.banco || undefined, agencia: d.agencia || undefined, conta: d.conta || undefined, cpfCnpj: d.cpfCnpj || undefined, tipoConta: d.tipoConta || undefined, pix: d.pix || undefined, valor: d.valor || undefined, dataPagto: d.dataPagto || undefined, dataVencer: d.dataVencer || undefined }, { onSuccess: () => resolve(), onError: (e) => reject(e) });
          });
        }
        invalidate();
        setModal(m => ({ ...m, open: false }));
        toast.success(`${mesesParaCriar.length} registro(s) criado(s)!`);
      };
      criarTodos().catch((e: any) => toast.error(e.message));
    }
  };

  const setField = (k: keyof typeof EMPTY, v: string) => setModal(m => ({ ...m, dados: { ...m.dados, [k]: v } }));

  const iniciarEdicaoDtPagto = (row: DespesaFixa) => { setEditandoDtPagto(row.id); setValorDtPagto(row.dataPagto ?? ""); setTimeout(() => dtPagtoRef.current?.focus(), 50); };
  const salvarDtPagto = (id: number) => editarMutation.mutate({ id, dataPagto: valorDtPagto || undefined, pago: !!valorDtPagto });

  const handleEnviarParaPagto = () => {
    if (selecionados.size === 0) { toast.error("Selecione ao menos um registro."); return; }
    if (!confirm(`Enviar ${selecionados.size} registro(s) para Pagamentos?`)) return;
    enviarParaPagtoMutation.mutate({ ids: Array.from(selecionados) });
  };

  function exportarExcel() {
    const data = rows.map(r => ({ "Mês Ano": r.mesAno ?? "", "Tipo Pagto": r.tipoPagto ?? "", "Cidade/UF": r.cidadeUF ?? "", "Empresa": r.empresa ?? "", "Chave Resp.": r.chaveResp ?? "", "Nome": r.nome ?? "", "Banco": r.banco ?? "", "Agência": r.agencia ?? "", "Conta": r.conta ?? "", "CPF/CNPJ": r.cpfCnpj ?? "", "Tipo Conta": r.tipoConta ?? "", "Pix": r.pix ?? "", "Valor": r.valor ? parseFloat(r.valor) : 0, "Pago": r.dataPagto ? "Pago" : isAtrasado(r.dataVencer) ? "Atrasado" : "Não", "Dt. Pagto": r.dataPagto ?? "", "Dt. Vencer": r.dataVencer ?? "" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DespesasFixas");
    XLSX.writeFile(wb, "DespesasFixas.xlsx");
  }

  const totalPages = Math.ceil(total / 100);
  const totalValor = rows.reduce((acc, r) => acc + (r.valor ? parseFloat(r.valor) : 0), 0);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white">Despesas Fixas</h1>
          <p className="text-[10px] text-gray-400">
            Total: {total} registros
            {selecionados.size > 0 && <span className="ml-2 text-purple-400 font-semibold">· {selecionados.size} selecionado(s)</span>}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button onClick={abrirNovo} size="sm" className="bg-purple-700 hover:bg-purple-600 text-white text-xs h-7 px-2">+ Novo</Button>
          <Button onClick={handleEnviarParaPagto} disabled={selecionados.size === 0 || enviarParaPagtoMutation.isPending} size="sm" className="bg-blue-700 hover:bg-blue-600 text-white text-xs h-7 px-2 disabled:opacity-40">
            {enviarParaPagtoMutation.isPending ? "Enviando..." : "Enviar Para Pagto"}
          </Button>
          <Button onClick={exportarExcel} size="sm" className="bg-green-700 hover:bg-green-600 text-white text-xs h-7 px-2">Excel</Button>
          <Button onClick={() => navigate("/")} size="sm" className="bg-gray-700 hover:bg-gray-600 text-white text-xs h-7 px-2">Voltar</Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 py-2">
        <div className="flex flex-wrap gap-2">
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Mês/Ano</label>
            <select value={filtroMesAno} onChange={e => { setFiltroMesAno(e.target.value); setPage(1); }} className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-1.5 py-1 w-28">
              <option value="">Todos</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Empresa</label>
            <select value={filtroEmpresa} onChange={e => { setFiltroEmpresa(e.target.value); setPage(1); }} className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-1.5 py-1 w-24">
              <option value="">Todas</option>
              {empresas.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Tipo Pagto</label>
            <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPage(1); }} className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-1.5 py-1 w-32">
              <option value="">Todos</option>
              {TIPOS_PAGTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Pago</label>
            <select value={filtroPago} onChange={e => { setFiltroPago(e.target.value as any); setPage(1); }} className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-1.5 py-1 w-24">
              <option value="todos">Todos</option>
              <option value="sim">Pago</option>
              <option value="nao">Não Pago</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-0.5">Nome</label>
            <input type="text" value={filtroNome} onChange={e => { setFiltroNome(e.target.value); setPage(1); }} placeholder="Nome..." className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-1.5 py-1 w-36" />
          </div>
        </div>
      </div>

      {/* Paginação Topo */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 bg-gray-900 border-b border-gray-800">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-6 px-2 text-[10px] bg-gray-800 border-gray-700 text-gray-300">Anterior</Button>
          <span className="text-[10px] text-gray-400">Pág. {page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-6 px-2 text-[10px] bg-gray-800 border-gray-700 text-gray-300">Próxima</Button>
        </div>
      )}
      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-purple-700 to-pink-600 text-white">
              <th className="px-1.5 py-1.5 text-center w-6">
                <input type="checkbox" checked={todosSelecionados} ref={el => { if (el) el.indeterminate = algunsSelecionados; }} onChange={toggleTodos} className="w-3 h-3 cursor-pointer accent-purple-400" />
              </th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Mês Ano</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Tipo Pagto</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Cidade/UF</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Empresa</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Chave</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Nome</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Banco</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Ag.</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Conta</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">CPF/CNPJ</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Tp.Conta</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Pix</th>
              <th className="px-1.5 py-1.5 text-right whitespace-nowrap">Valor</th>
              <th className="px-1.5 py-1.5 text-center whitespace-nowrap">Pago</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Dt.Pagto</th>
              <th className="px-1.5 py-1.5 text-left whitespace-nowrap">Dt.Vencer</th>
              <th className="px-1.5 py-1.5 text-center whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={18} className="text-center py-10 text-gray-500">Nenhum registro encontrado.</td></tr>
            ) : rows.map((row, i) => {
              const sel = selecionados.has(row.id);
              return (
                <tr key={row.id} className={`border-b border-gray-800/60 hover:bg-gray-800/40 transition-colors ${sel ? "bg-purple-900/25" : i % 2 === 0 ? "bg-gray-900/50" : "bg-gray-900/20"}`}>
                  <td className="px-1.5 py-1 text-center">
                    <input type="checkbox" checked={sel} onChange={() => toggleSelecionado(row.id)} className="w-3 h-3 cursor-pointer accent-purple-400" />
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">{row.mesAno || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">{row.tipoPagto || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap max-w-[90px] truncate" title={row.cidadeUF ?? ""}>{row.cidadeUF || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">{row.empresa || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap font-mono text-[10px]">{row.chaveResp || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap max-w-[140px] truncate" title={row.nome ?? ""}>{row.nome || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap max-w-[80px] truncate" title={row.banco ?? ""}>{row.banco || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">{row.agencia || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">{row.conta || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap font-mono text-[10px]">{row.cpfCnpj || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap">{row.tipoConta || "-"}</td>
                  <td className="px-1.5 py-1 whitespace-nowrap max-w-[90px] truncate" title={row.pix ?? ""}>{row.pix || "-"}</td>
                  <td className="px-1.5 py-1 text-right whitespace-nowrap font-medium text-green-400">{formatCurrency(row.valor)}</td>
                  <td className="px-1.5 py-1 text-center">
                    {row.dataPagto
                      ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-900/60 text-green-300 border border-green-700">Pago</span>
                      : isAtrasado(row.dataVencer)
                        ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-900/60 text-orange-300 border border-orange-600">Atrasado</span>
                        : <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-900/60 text-red-300 border border-red-700">Não</span>
                    }
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    {editandoDtPagto === row.id ? (
                      <input ref={dtPagtoRef} type="text" value={valorDtPagto} onChange={e => setValorDtPagto(e.target.value)}
                        onBlur={() => salvarDtPagto(row.id)}
                        onKeyDown={e => { if (e.key === "Enter") salvarDtPagto(row.id); if (e.key === "Escape") setEditandoDtPagto(null); }}
                        placeholder="DD/MM/AAAA" maxLength={10}
                        className="w-24 border border-blue-500 rounded px-1 py-0.5 text-[10px] focus:outline-none bg-gray-800 text-white" />
                    ) : (
                      <span onClick={() => iniciarEdicaoDtPagto(row as DespesaFixa)}
                        className="cursor-pointer hover:bg-blue-900/40 rounded px-1 py-0.5 min-w-[5rem] inline-block border border-transparent hover:border-blue-600 text-[10px]" title="Clique para editar">
                        {row.dataPagto || <span className="text-gray-600 italic">DD/MM/AAAA</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-[10px]">{row.dataVencer || "-"}</td>
                  <td className="px-1.5 py-1 text-center whitespace-nowrap">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => abrirEditar(row as DespesaFixa)}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-blue-900/50 text-blue-300 border border-blue-700 hover:bg-blue-800 transition-colors" title="Editar">
                        ✏️
                      </button>
                      <button onClick={() => { if (confirm("Excluir?")) deletarMutation.mutate({ id: row.id }); }}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-800 transition-colors" title="Excluir">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-gray-800 font-semibold border-t-2 border-purple-600">
                <td colSpan={13} className="px-1.5 py-1.5 text-right text-[10px] text-gray-400">Total:</td>
                <td className="px-1.5 py-1.5 text-right text-green-400 text-[11px]">{totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td colSpan={4}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-3 bg-gray-900 border-t border-gray-800">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-6 px-2 text-[10px] bg-gray-800 border-gray-700 text-gray-300">Anterior</Button>
          <span className="text-[10px] text-gray-400">Pág. {page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-6 px-2 text-[10px] bg-gray-800 border-gray-700 text-gray-300">Próxima</Button>
        </div>
      )}

      {/* Modal Editar / Novo */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h2 className="text-sm font-bold text-white">{modal.modo === "novo" ? "Nova Despesa Fixa" : "Editar Despesa Fixa"}</h2>
              <button onClick={() => setModal(m => ({ ...m, open: false }))} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <FormField label="Mês Ano" value={modal.dados.mesAno ?? ""} onChange={v => setField("mesAno", v)} placeholder="MM/AAAA" isMesAno />
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 font-medium">Tipo Pagto</label>
                <select
                  value={modal.dados.tipoPagto ?? ""}
                  onChange={e => setField("tipoPagto", e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 h-[26px]"
                >
                  <option value="">Selecione...</option>
                  {TIPOS_PAGTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <FormField label="Cidade/UF" value={modal.dados.cidadeUF ?? ""} onChange={v => setField("cidadeUF", v)} />
              <FormField label="Empresa" value={modal.dados.empresa ?? ""} onChange={v => setField("empresa", v)} />
              <div className="col-span-1">
                <ChaveJRespInput
                  label={`Chave Resp.${dadosAgenteResp && chaveJRespBusca ? " ✓ " + (dadosAgenteResp.favorecido || dadosAgenteResp.nomeAgente || "") : ""}`}
                  value={modal.dados.chaveResp ?? ""}
                  onChange={(chaveJ) => {
                    setField("chaveResp", chaveJ);
                    setChaveJRespBusca(chaveJ);
                  }}
                  placeholder="Chave J ou nome..."
                />
              </div>
              <FormField label="Nome" value={modal.dados.nome ?? ""} onChange={v => setField("nome", v)} />
              <FormField label="Banco" value={modal.dados.banco ?? ""} onChange={v => setField("banco", v)} />
              <FormField label="Agência" value={modal.dados.agencia ?? ""} onChange={v => setField("agencia", v)} />
              <FormField label="Conta" value={modal.dados.conta ?? ""} onChange={v => setField("conta", v)} />
              <FormField label="CPF/CNPJ" value={modal.dados.cpfCnpj ?? ""} onChange={v => setField("cpfCnpj", v)} />
              <FormField label="Tipo Conta" value={modal.dados.tipoConta ?? ""} onChange={v => setField("tipoConta", v)} />
              <FormField label="Pix" value={modal.dados.pix ?? ""} onChange={v => setField("pix", v)} />
              <FormField label="Valor" value={modal.dados.valor ?? ""} onChange={v => setField("valor", v)} placeholder="0.00" />
              <FormField label="Dt. Pagto" value={modal.dados.dataPagto ?? ""} onChange={v => setField("dataPagto", v)} placeholder="DD/MM/AAAA" />
              <FormField label="Dt. Vencer" value={modal.dados.dataVencer ?? ""} onChange={v => setField("dataVencer", v)} placeholder="DD/MM/AAAA" />
              {modal.modo === "novo" && (
                <div className="flex flex-col gap-0.5 col-span-2">
                  <label className="text-[10px] text-gray-400 font-medium">Repetir por quantos meses?</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={repetirMeses}
                      onChange={e => setRepetirMeses(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                      className="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1 w-20 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-[10px] text-gray-400">
                      {repetirMeses === 1 ? "Apenas este mês" : `Criará ${repetirMeses} registros (${modal.dados.mesAno || "MM/AAAA"} até ${(() => { if (!modal.dados.mesAno) return "?"; const [mm, aa] = modal.dados.mesAno.split("/"); let m = parseInt(mm)+repetirMeses-1; let a = parseInt(aa); while(m>12){m-=12;a++;} return `${String(m).padStart(2,"0")}/${a}`; })()})`}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-700">
              <Button onClick={() => setModal(m => ({ ...m, open: false }))} size="sm" variant="outline" className="h-7 px-3 text-xs bg-gray-800 border-gray-600 text-gray-300">Cancelar</Button>
              <Button onClick={salvarModal} size="sm" disabled={editarMutation.isPending || criarMutation.isPending} className="h-7 px-4 text-xs bg-purple-700 hover:bg-purple-600 text-white">
                {editarMutation.isPending || criarMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
