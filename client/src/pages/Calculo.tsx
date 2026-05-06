import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Calculo() {
  const [, navigate] = useLocation();

  // Estado para todos os campos
  const [formData, setFormData] = useState({
    empresa: "",
    mesAno: "426",
    chaveJ: "",
    nomeAgente: "",
    cidade: "",
    percentual: "",
    comissaoTotal: "",
    rbmTotal: "",
    comissaoConsig: "",
    comissaoConsorcio: "",
    comissaoOurocap: "",
    comissaoCC: "",
    comissaoSeguros: "",
    ajudaCusto: "",
    creditosDebitos: "",
    adiantamento: "",
    reajuste: "",
    comissaoSupervisor: "",
    rbmCredito: "",
    rbmCC: "",
    rbmConsorcio: "",
    rbmOurocap: "",
    rbmSeguros: "",
    qtdeContas: "",
    vrLiquido: "",
    srcc: "",
    vrLiquidoSrcc: "",
  });

  // Query para buscar Chaves J por Mês/Ano
  useEffect(() => {
    console.log('Buscando Chaves J para mês:', formData.mesAno);
  }, [formData.mesAno]);

  const { data: chavesJComDuplicatas = [], isLoading: loadingChavesJ } = trpc.consignado.buscarChavesJPorMes.useQuery(
    { mes: formData.mesAno },
    { enabled: !!formData.mesAno }
  );

  // Remover duplicatas - mostrar cada Chave J UMA VEZ só
  const chavesJ = Array.from(new Set(chavesJComDuplicatas));

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSelectChaveJ = (value: string) => {
    handleInputChange("chaveJ", value);
  };

  const handleCancel = () => {
    navigate("/");
  };

  const handleSalvar = () => {
    console.log("Salvando cálculo:", formData);
    // TODO: Implementar salvamento
  };

  // Campos da tabela em ordem
  const campos = [
    { label: "Empresa", key: "empresa", editavel: true },
    { label: "Mês Ano", key: "mesAno", editavel: false },
    { label: "Chave J", key: "chaveJ", editavel: true, isSelect: true },
    { label: "Nome Agente", key: "nomeAgente", editavel: false },
    { label: "Cidade", key: "cidade", editavel: false },
    { label: "Percentual", key: "percentual", editavel: false },
    { label: "Comissão Total", key: "comissaoTotal", editavel: false },
    { label: "RBM Total", key: "rbmTotal", editavel: false },
    { label: "Comissão Consig", key: "comissaoConsig", editavel: false },
    { label: "Comissão Consórcio", key: "comissaoConsorcio", editavel: false },
    { label: "Comissão Ourocap", key: "comissaoOurocap", editavel: false },
    { label: "Comissão C/C", key: "comissaoCC", editavel: false },
    { label: "Comissão Seguros", key: "comissaoSeguros", editavel: false },
    { label: "Ajuda de Custo", key: "ajudaCusto", editavel: true },
    { label: "Créditos/Débitos", key: "creditosDebitos", editavel: true },
    { label: "Adiantamento", key: "adiantamento", editavel: true },
    { label: "Reajuste", key: "reajuste", editavel: true },
    { label: "Comissão Supervisor", key: "comissaoSupervisor", editavel: true },
    { label: "RBM Crédito", key: "rbmCredito", editavel: false },
    { label: "RBM C/C", key: "rbmCC", editavel: false },
    { label: "RBM Consórcio", key: "rbmConsorcio", editavel: false },
    { label: "RBM OuroCap", key: "rbmOurocap", editavel: false },
    { label: "RBM Seguros", key: "rbmSeguros", editavel: false },
    { label: "Qtde Contas", key: "qtdeContas", editavel: true },
    { label: "Vr. Líquido", key: "vrLiquido", editavel: false },
    { label: "SRCC", key: "srcc", editavel: true },
    { label: "Vr. Líquido-SRCC", key: "vrLiquidoSrcc", editavel: false },
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

        {/* Tabela horizontal */}
        <div className="overflow-x-auto bg-white rounded-lg shadow">
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
              <tr>
                {campos.map((campo) => (
                  <td key={campo.key} className="px-3 py-2 border-b border-slate-200">
                    {campo.isSelect ? (
                      <Select value={formData[campo.key as keyof typeof formData]} onValueChange={(value) => handleSelectChaveJ(value)}>
                        <SelectTrigger className="h-8 text-xs border-0 bg-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingChavesJ ? (
                            <div className="p-2 text-sm text-slate-500">Carregando...</div>
                          ) : chavesJ.length === 0 ? (
                            <div className="p-2 text-sm text-slate-500">Nenhuma Chave J encontrada</div>
                          ) : (
                            chavesJ.map((chave) => (
                              <SelectItem key={chave} value={chave}>
                                {chave}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={campo.key.includes("percentual") || campo.key.includes("Liquido") || campo.key.includes("Total") ? "number" : "text"}
                        value={formData[campo.key as keyof typeof formData]}
                        onChange={(e) => handleInputChange(campo.key, e.target.value)}
                        disabled={!campo.editavel}
                        placeholder="..."
                        className="h-8 text-xs border-0 px-2"
                        style={{
                          backgroundColor: campo.editavel ? "white" : "#f1f5f9",
                        }}
                      />
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
