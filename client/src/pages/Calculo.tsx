import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Calculo() {
  const [, navigate] = useLocation();

  // Estado para todos os campos
  const [formData, setFormData] = useState({
    // Identificação
    empresa: "",
    mesAno: "",
    chaveJ: "",
    nomeAgente: "",
    cidade: "",
    
    // Percentual
    percentual: "",
    comissaoTotal: "",
    rbmTotal: "",
    
    // Comissões
    comissaoConsig: "",
    comissaoConsorcio: "",
    comissaoOurocap: "",
    comissaoCC: "",
    comissaoSeguros: "",
    
    // Deduções
    ajudaCusto: "",
    creditosDebitos: "",
    adiantamento: "",
    reajuste: "",
    comissaoSupervisor: "",
    
    // RBM
    rbmCredito: "",
    rbmCC: "",
    rbmConsorcio: "",
    rbmOurocap: "",
    rbmSeguros: "",
    
    // Totais
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-6">
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
              <h1 className="text-3xl font-bold text-slate-900">Cálculo</h1>
              <p className="text-sm text-slate-600 mt-1">Comissões, Pagamentos e Relatórios</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário em Linha */}
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Linha 1: Identificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Identificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Empresa</Label>
                <Input
                  placeholder="BMF"
                  value={formData.empresa}
                  onChange={(e) => handleInputChange("empresa", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Mês/Ano</Label>
                <Input
                  placeholder="426"
                  value={formData.mesAno}
                  onChange={(e) => handleInputChange("mesAno", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Chave J</Label>
                <Input
                  placeholder="TEST001"
                  value={formData.chaveJ}
                  onChange={(e) => handleInputChange("chaveJ", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Nome Agente</Label>
                <Input
                  placeholder="Auto-preenchido"
                  value={formData.nomeAgente}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">Cidade</Label>
                <Input
                  placeholder="Auto-preenchido"
                  value={formData.cidade}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linha 2: Percentual e Totais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Percentual e Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Percentual (%)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.percentual}
                  onChange={(e) => handleInputChange("percentual", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Comissão Total</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.comissaoTotal}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">RBM Total</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.rbmTotal}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linha 3: Comissões */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Comissões por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Consig</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.comissaoConsig}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">Consórcio</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.comissaoConsorcio}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">OuroCap</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.comissaoOurocap}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">C/C</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.comissaoCC}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">Seguros</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.comissaoSeguros}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linha 4: Deduções */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Deduções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">Ajuda de Custo</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.ajudaCusto}
                  onChange={(e) => handleInputChange("ajudaCusto", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Créditos/Débitos</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.creditosDebitos}
                  onChange={(e) => handleInputChange("creditosDebitos", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Adiantamento</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.adiantamento}
                  onChange={(e) => handleInputChange("adiantamento", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Reajuste</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.reajuste}
                  onChange={(e) => handleInputChange("reajuste", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Comissão Supervisor</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.comissaoSupervisor}
                  onChange={(e) => handleInputChange("comissaoSupervisor", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linha 5: RBM */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">RBM por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <Label className="text-xs">RBM Crédito</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.rbmCredito}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">RBM C/C</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.rbmCC}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">RBM Consórcio</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.rbmConsorcio}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">RBM OuroCap</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.rbmOurocap}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">RBM Seguros</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.rbmSeguros}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linha 6: Totais Finais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Totais Finais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-xs">Qtde Contas</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.qtdeContas}
                  onChange={(e) => handleInputChange("qtdeContas", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Vr. Líquido</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.vrLiquido}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
              <div>
                <Label className="text-xs">SRCC</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.srcc}
                  onChange={(e) => handleInputChange("srcc", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Vr. Líquido - SRCC</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.vrLiquidoSrcc}
                  readOnly
                  className="h-8 text-sm bg-slate-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={handleVoltar}>
            Cancelar
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Salvar Cálculo
          </Button>
        </div>
      </div>
    </div>
  );
}
