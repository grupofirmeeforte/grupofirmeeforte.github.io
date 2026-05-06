import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Calculo() {
  const [, navigate] = useLocation();

  // Filtros
  const [filtros, setFiltros] = useState({
    chaveJ: "",
    mesAno: "426",
    nomeAgente: "",
  });

  // Query para buscar todos os registros de Consignado com filtros
  const { data: registros = [], isLoading } = trpc.consignado.buscarComFiltros.useQuery(
    {
      chaveJ: filtros.chaveJ || undefined,
      mes: filtros.mesAno || undefined,
      nomeAgente: filtros.nomeAgente || undefined,
    },
    { enabled: true }
  );

  const handleFiltroChange = (field: string, value: string) => {
    setFiltros(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleSalvar = () => {
    console.log("Salvando cálculos");
    // TODO: Implementar salvamento
  };

  // Campos da tabela em ordem
  const campos = [
    { label: "Empresa", key: "empresa" },
    { label: "Mês Ano", key: "mesAno" },
    { label: "Chave J", key: "chaveJ" },
    { label: "Nome Agente", key: "nomeAgente" },
    { label: "Cidade", key: "cidade" },
    { label: "Percentual", key: "percentual" },
    { label: "Comissão Total", key: "comissaoTotal" },
    { label: "RBM Total", key: "rbmTotal" },
    { label: "Comissão Consig", key: "comissaoConsig" },
    { label: "Comissão Consórcio", key: "comissaoConsorcio" },
    { label: "Comissão Ourocap", key: "comissaoOurocap" },
    { label: "Comissão C/C", key: "comissaoCC" },
    { label: "Comissão Seguros", key: "comissaoSeguros" },
    { label: "Ajuda de Custo", key: "ajudaCusto" },
    { label: "Créditos/Débitos", key: "creditosDebitos" },
    { label: "Adiantamento", key: "adiantamento" },
    { label: "Reajuste", key: "reajuste" },
    { label: "Comissão Supervisor", key: "comissaoSupervisor" },
    { label: "RBM Crédito", key: "rbmCredito" },
    { label: "RBM C/C", key: "rbmCC" },
    { label: "RBM Consórcio", key: "rbmConsorcio" },
    { label: "RBM OuroCap", key: "rbmOurocap" },
    { label: "RBM Seguros", key: "rbmSeguros" },
    { label: "Qtde Contas", key: "qtdeContas" },
    { label: "Vr. Líquido", key: "vrLiquido" },
    { label: "SRCC", key: "srcc" },
    { label: "Vr. Líquido-SRCC", key: "vrLiquidoSrcc" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={handleCancel} className="p-2 hover:bg-slate-200 rounded">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Cálculo</h1>
              <p className="text-sm text-slate-600">Comissões, Pagamentos e Relatórios</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button onClick={handleSalvar} className="bg-blue-600 hover:bg-blue-700">Salvar Cálculo</Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mês/Ano</label>
              <Input
                type="text"
                placeholder="426"
                value={filtros.mesAno}
                onChange={(e) => handleFiltroChange("mesAno", e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chave J</label>
              <Input
                type="text"
                placeholder="Ex: J9660864"
                value={filtros.chaveJ}
                onChange={(e) => handleFiltroChange("chaveJ", e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Agente</label>
              <Input
                type="text"
                placeholder="Ex: João Silva"
                value={filtros.nomeAgente}
                onChange={(e) => handleFiltroChange("nomeAgente", e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Tabela com todos os registros */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : registros.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum registro encontrado</div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-purple-400 to-pink-400">
                  {campos.map((campo) => (
                    <th key={campo.key} className="px-3 py-2 text-left text-xs font-bold text-white whitespace-nowrap">
                      {campo.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.map((registro: any, index: number) => (
                  <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                    {campos.map((campo) => (
                      <td key={campo.key} className="px-3 py-2 text-sm whitespace-nowrap">
                        {registro[campo.key] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
            Total: {registros.length} registro(s)
          </div>
        </div>
      </div>
    </div>
  );
}
