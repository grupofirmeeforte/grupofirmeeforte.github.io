import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Calculo() {
  const [, navigate] = useLocation();

  // Estado para todos os campos
  const [formData, setFormData] = useState({
    empresa: "",
    mesAno: "",
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    console.log("Salvando cálculo:", formData);
    // TODO: Implementar chamada ao router para salvar
  };

  const handleVoltar = () => {
    navigate("/");
  };

  // Definição dos campos da tabela
  const campos = [
    { key: "empresa", label: "Empresa", width: "100px", editable: true },
    { key: "mesAno", label: "Mês Ano", width: "100px", editable: true },
    { key: "chaveJ", label: "Chave J", width: "100px", editable: true },
    { key: "nomeAgente", label: "Nome Agente", width: "150px", editable: false },
    { key: "cidade", label: "Cidade", width: "120px", editable: false },
    { key: "percentual", label: "Percentual", width: "100px", editable: true },
    { key: "comissaoTotal", label: "Comissão Total", width: "120px", editable: false },
    { key: "rbmTotal", label: "RBM Total", width: "100px", editable: false },
    { key: "comissaoConsig", label: "Comissão Consig", width: "130px", editable: false },
    { key: "comissaoConsorcio", label: "Comissão Consórcio", width: "150px", editable: false },
    { key: "comissaoOurocap", label: "Comissão Ourocap", width: "140px", editable: false },
    { key: "comissaoCC", label: "Comissão C/C", width: "120px", editable: false },
    { key: "comissaoSeguros", label: "Comissão Seguros", width: "140px", editable: false },
    { key: "ajudaCusto", label: "Ajuda de Custo", width: "130px", editable: true },
    { key: "creditosDebitos", label: "Créditos/Débitos", width: "140px", editable: true },
    { key: "adiantamento", label: "Adiantamento", width: "120px", editable: true },
    { key: "reajuste", label: "Reajuste", width: "100px", editable: true },
    { key: "comissaoSupervisor", label: "Comissão Supervisor", width: "150px", editable: true },
    { key: "rbmCredito", label: "RBM Crédito", width: "120px", editable: false },
    { key: "rbmCC", label: "RBM C/C", width: "100px", editable: false },
    { key: "rbmConsorcio", label: "RBM Consórcio", width: "130px", editable: false },
    { key: "rbmOurocap", label: "RBM OuroCap", width: "120px", editable: false },
    { key: "rbmSeguros", label: "RBM Seguros", width: "120px", editable: false },
    { key: "qtdeContas", label: "Qtde Contas", width: "110px", editable: true },
    { key: "vrLiquido", label: "Vr. Líquido", width: "120px", editable: false },
    { key: "srcc", label: "SRCC", width: "100px", editable: true },
    { key: "vrLiquidoSrcc", label: "Vr. Líquido-SRCC", width: "140px", editable: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handleVoltar}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Cálculo</h1>
              <p className="text-sm text-slate-600">Comissões, Pagamentos e Relatórios</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleVoltar}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
              Salvar Cálculo
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela Horizontal Rolável */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Cabeçalho */}
            <thead>
              <tr className="bg-gradient-to-r from-purple-500 to-pink-500">
                {campos.map((campo) => (
                  <th
                    key={campo.key}
                    style={{ width: campo.width, minWidth: campo.width }}
                    className="px-3 py-3 text-left text-xs font-bold text-white border border-purple-600 whitespace-nowrap"
                  >
                    {campo.label}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Corpo */}
            <tbody>
              <tr className="hover:bg-slate-50">
                {campos.map((campo) => (
                  <td
                    key={campo.key}
                    style={{ width: campo.width, minWidth: campo.width }}
                    className="px-2 py-2 border border-slate-200"
                  >
                    <Input
                      type={campo.key.includes("percentual") || campo.key.includes("Liquido") || campo.key.includes("Total") ? "number" : "text"}
                      placeholder={campo.editable ? "..." : ""}
                      value={formData[campo.key as keyof typeof formData]}
                      onChange={(e) => handleInputChange(campo.key, e.target.value)}
                      readOnly={!campo.editable}
                      className={`h-8 text-xs border-0 ${
                        campo.editable 
                          ? "bg-white" 
                          : "bg-slate-100 text-slate-500"
                      }`}
                    />
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
