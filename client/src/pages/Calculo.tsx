import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Calculo() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    empresa: '',
    mesAno: '',
    chaveJ: '',
    nomeAgente: '',
    cidade: '',
    percentual: '',
    comissaoTotal: '',
    rbmTotal: '',
    comissaoConsig: '',
    comissaoConsorcio: '',
    comissaoOurocap: '',
    comissaoCc: '',
    seguros: '',
    ajudaCusto: '',
    creditosDebitos: '',
    adiantamento: '',
    reajuste: '',
    comissaoSupervisor: '',
    rbmcreditoC2: '',
    rbmContaCorrente: '',
    rbmConsorcioC2: '',
    rbmOurocap: '',
    rbmSeguro: '',
    qtdeContas: '',
    vrLiquidoC2: '',
    srccC2: '',
    vrLiquidoSrcc: '',
  });

  const [buscando, setBuscando] = useState(false);

  // Queries para buscas
  const { data: consignados = [] } = trpc.consignado.listar.useQuery();
  const { data: agentes = [] } = trpc.agentes.list.useQuery({});

  // Mutations
  const salvarCalculo = trpc.system.notifyOwner.useMutation({
    onSuccess: () => {
      toast.success('Cálculo salvo com sucesso!');
      handleLimpar();
    },
    onError: (e: any) => toast.error('Erro ao salvar: ' + e.message),
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Buscar dados em Consignado quando Chave J muda
  useEffect(() => {
    if (formData.chaveJ && formData.chaveJ.length >= 5) {
      setBuscando(true);
      const mesAnoAtual = formData.mesAno ? parseInt(formData.mesAno) : 0;
      const mesAnoBusca = mesAnoAtual > 100 ? mesAnoAtual - 100 : mesAnoAtual;

      const registrosConsignado = consignados.filter(
        (c: any) => c.chaveJ === formData.chaveJ && c.tabelaMes === mesAnoBusca.toString()
      );

      if (registrosConsignado.length > 0) {
        // Somar RBM por modalidade
        const rbmC2 = registrosConsignado.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmcreditoC2 || '0') || 0), 0);
        const rbmCC = registrosConsignado.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmContaCorrente || '0') || 0), 0);
        const rbmConsorcio = registrosConsignado.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmConsorcioC2 || '0') || 0), 0);
        const rbmOurocap = registrosConsignado.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmOurocap || '0') || 0), 0);
        const rbmSeguro = registrosConsignado.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmSeguro || '0') || 0), 0);
        const rbmTotal = rbmC2 + rbmCC + rbmConsorcio + rbmOurocap + rbmSeguro;

        // Somar comissões
        const comissaoConsig = registrosConsignado.reduce((sum: number, r: any) => sum + (parseFloat(r.valorLiquido || '0') || 0), 0);

        setFormData(prev => ({
          ...prev,
          rbmcreditoC2: rbmC2.toFixed(2),
          rbmContaCorrente: rbmCC.toFixed(2),
          rbmConsorcioC2: rbmConsorcio.toFixed(2),
          rbmOurocap: rbmOurocap.toFixed(2),
          rbmSeguro: rbmSeguro.toFixed(2),
          rbmTotal: rbmTotal.toFixed(2),
          comissaoConsig: comissaoConsig.toFixed(2),
          qtdeContas: registrosConsignado.length.toString(),
        }));

        toast.success(`${registrosConsignado.length} registros encontrados em Consignado`);
      } else {
        toast.info('Nenhum registro encontrado em Consignado para este período');
      }
      setBuscando(false);
    }
  }, [formData.chaveJ, formData.mesAno, consignados]);

  // Buscar dados em Cadastro quando Empresa muda
  useEffect(() => {
    if (formData.empresa) {
      const agente = agentes.find((a: any) => a.empresa === formData.empresa);
      if (agente) {
        setFormData(prev => ({
          ...prev,
          nomeAgente: agente.nomeAgente || '',
          cidade: agente.cidade || '',
        }));
      }
    }
  }, [formData.empresa, agentes]);

  // Calcular Percentual quando RBM Total ou Comissão Total mudam
  useEffect(() => {
    const rbmTotal = parseFloat(formData.rbmTotal) || 0;
    const comissaoTotal = parseFloat(formData.comissaoTotal) || 0;

    if (rbmTotal > 0 && comissaoTotal > 0) {
      const percentual = (rbmTotal / comissaoTotal) * 100;
      setFormData(prev => ({
        ...prev,
        percentual: percentual.toFixed(2),
      }));
    }
  }, [formData.rbmTotal, formData.comissaoTotal]);

  // Calcular Vr Líquido C2 e SRCC
  useEffect(() => {
    const comissaoTotal = parseFloat(formData.comissaoTotal) || 0;
    const seguros = parseFloat(formData.seguros) || 0;
    const ajudaCusto = parseFloat(formData.ajudaCusto) || 0;
    const creditosDebitos = parseFloat(formData.creditosDebitos) || 0;
    const adiantamento = parseFloat(formData.adiantamento) || 0;
    const reajuste = parseFloat(formData.reajuste) || 0;
    const comissaoSupervisor = parseFloat(formData.comissaoSupervisor) || 0;

    const vrLiquidoC2 = comissaoTotal + seguros + ajudaCusto + creditosDebitos - adiantamento + reajuste - comissaoSupervisor;
    const srccC2 = parseFloat(formData.srccC2) || 0;
    const vrLiquidoSrcc = vrLiquidoC2 + srccC2;

    setFormData(prev => ({
      ...prev,
      vrLiquidoC2: vrLiquidoC2.toFixed(2),
      vrLiquidoSrcc: vrLiquidoSrcc.toFixed(2),
    }));
  }, [
    formData.comissaoTotal,
    formData.seguros,
    formData.ajudaCusto,
    formData.creditosDebitos,
    formData.adiantamento,
    formData.reajuste,
    formData.comissaoSupervisor,
    formData.srccC2,
  ]);

  const handleSalvar = () => {
    if (!formData.empresa || !formData.mesAno || !formData.chaveJ) {
      toast.error('Preencha os campos obrigatórios: Empresa, Mês/Ano e Chave J');
      return;
    }

    // Salvar cálculo (por enquanto apenas notifica)
    salvarCalculo.mutate({
      title: `Cálculo salvo: ${formData.empresa} - ${formData.chaveJ}`,
      content: `Percentual: ${formData.percentual}%, RBM Total: R$ ${formData.rbmTotal}`,
    });
  };

  const handleLimpar = () => {
    setFormData({
      empresa: '',
      mesAno: '',
      chaveJ: '',
      nomeAgente: '',
      cidade: '',
      percentual: '',
      comissaoTotal: '',
      rbmTotal: '',
      comissaoConsig: '',
      comissaoConsorcio: '',
      comissaoOurocap: '',
      comissaoCc: '',
      seguros: '',
      ajudaCusto: '',
      creditosDebitos: '',
      adiantamento: '',
      reajuste: '',
      comissaoSupervisor: '',
      rbmcreditoC2: '',
      rbmContaCorrente: '',
      rbmConsorcioC2: '',
      rbmOurocap: '',
      rbmSeguro: '',
      qtdeContas: '',
      vrLiquidoC2: '',
      srccC2: '',
      vrLiquidoSrcc: '',
    });
    toast.success('Formulário limpo');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => setLocation('/financeiro')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cálculo de Comissões</h1>
            <p className="text-gray-600 mt-2">Calcule comissões, RBM e outras métricas por agente</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Dados de Entrada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Seção 1: Identificação */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Identificação</h3>
                
                <div>
                  <Label htmlFor="empresa">Empresa</Label>
                  <Input
                    id="empresa"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleInputChange}
                    placeholder="Buscar no cadastro"
                  />
                </div>

                <div>
                  <Label htmlFor="mesAno">Mês/Ano</Label>
                  <Input
                    id="mesAno"
                    name="mesAno"
                    value={formData.mesAno}
                    onChange={handleInputChange}
                    placeholder="MM/AAAA"
                  />
                  <p className="text-xs text-gray-500 mt-1">Buscar no consignado o mês anterior</p>
                </div>

                <div>
                  <Label htmlFor="chaveJ">Chave J</Label>
                  <Input
                    id="chaveJ"
                    name="chaveJ"
                    value={formData.chaveJ}
                    onChange={handleInputChange}
                    placeholder="Buscar em Consignado"
                  />
                  <p className="text-xs text-gray-500 mt-1">Não repetir chaves no mesmo mês/ano</p>
                </div>

                <div>
                  <Label htmlFor="nomeAgente">Nome Agente</Label>
                  <Input
                    id="nomeAgente"
                    name="nomeAgente"
                    value={formData.nomeAgente}
                    onChange={handleInputChange}
                    placeholder="Buscar Cadastro"
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    placeholder="Buscar em Cadastro Agente"
                    disabled
                  />
                </div>
              </div>

              {/* Seção 2: Comissões */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Comissões</h3>
                
                <div>
                  <Label htmlFor="percentual">Percentual</Label>
                  <Input
                    id="percentual"
                    name="percentual"
                    type="number"
                    value={formData.percentual}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Cálculo: (Total RBM / Comissão Total)</p>
                </div>

                <div>
                  <Label htmlFor="comissaoTotal">Comissão Total</Label>
                  <Input
                    id="comissaoTotal"
                    name="comissaoTotal"
                    type="number"
                    value={formData.comissaoTotal}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="rbmTotal">RBM Total</Label>
                  <Input
                    id="rbmTotal"
                    name="rbmTotal"
                    type="number"
                    value={formData.rbmTotal}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="comissaoConsig">Comissão Consig</Label>
                  <Input
                    id="comissaoConsig"
                    name="comissaoConsig"
                    type="number"
                    value={formData.comissaoConsig}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Buscar em Consignado</p>
                </div>

                <div>
                  <Label htmlFor="comissaoConsorcio">Comissão Consórcio</Label>
                  <Input
                    id="comissaoConsorcio"
                    name="comissaoConsorcio"
                    type="number"
                    value={formData.comissaoConsorcio}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="comissaoOurocap">Comissão Ourocap</Label>
                  <Input
                    id="comissaoOurocap"
                    name="comissaoOurocap"
                    type="number"
                    value={formData.comissaoOurocap}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="comissaoCc">Comissão C/C</Label>
                  <Input
                    id="comissaoCc"
                    name="comissaoCc"
                    type="number"
                    value={formData.comissaoCc}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Seção 3: Outros Valores */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 border-b pb-2">Outros Valores</h3>
                
                <div>
                  <Label htmlFor="seguros">Seguros</Label>
                  <Input
                    id="seguros"
                    name="seguros"
                    type="number"
                    value={formData.seguros}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="ajudaCusto">Ajuda de Custo</Label>
                  <Input
                    id="ajudaCusto"
                    name="ajudaCusto"
                    type="number"
                    value={formData.ajudaCusto}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="creditosDebitos">Créditos/Débitos</Label>
                  <Input
                    id="creditosDebitos"
                    name="creditosDebitos"
                    type="number"
                    value={formData.creditosDebitos}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="adiantamento">Adiantamento</Label>
                  <Input
                    id="adiantamento"
                    name="adiantamento"
                    type="number"
                    value={formData.adiantamento}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="reajuste">Reajuste</Label>
                  <Input
                    id="reajuste"
                    name="reajuste"
                    type="number"
                    value={formData.reajuste}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="comissaoSupervisor">Comissão Supervisor</Label>
                  <Input
                    id="comissaoSupervisor"
                    name="comissaoSupervisor"
                    type="number"
                    value={formData.comissaoSupervisor}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* RBM Section */}
            <div className="mt-8 pt-8 border-t">
              <h3 className="font-semibold text-gray-700 mb-4">RBM por Modalidade</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="rbmcreditoC2">RBM Crédito C2</Label>
                  <Input
                    id="rbmcreditoC2"
                    name="rbmcreditoC2"
                    type="number"
                    value={formData.rbmcreditoC2}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Buscar em Consignado</p>
                </div>

                <div>
                  <Label htmlFor="rbmContaCorrente">RBM Conta Corrente</Label>
                  <Input
                    id="rbmContaCorrente"
                    name="rbmContaCorrente"
                    type="number"
                    value={formData.rbmContaCorrente}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="rbmConsorcioC2">RBM Consórcio C2</Label>
                  <Input
                    id="rbmConsorcioC2"
                    name="rbmConsorcioC2"
                    type="number"
                    value={formData.rbmConsorcioC2}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="rbmOurocap">RBM Ourocap</Label>
                  <Input
                    id="rbmOurocap"
                    name="rbmOurocap"
                    type="number"
                    value={formData.rbmOurocap}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="rbmSeguro">RBM Seguro</Label>
                  <Input
                    id="rbmSeguro"
                    name="rbmSeguro"
                    type="number"
                    value={formData.rbmSeguro}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Resultado Section */}
            <div className="mt-8 pt-8 border-t">
              <h3 className="font-semibold text-gray-700 mb-4">Resultado</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="qtdeContas">Qtde Contas</Label>
                  <Input
                    id="qtdeContas"
                    name="qtdeContas"
                    type="number"
                    value={formData.qtdeContas}
                    onChange={handleInputChange}
                    placeholder="0"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Buscar em Consignado</p>
                </div>

                <div>
                  <Label htmlFor="vrLiquidoC2">Vr Líquido C2</Label>
                  <Input
                    id="vrLiquidoC2"
                    name="vrLiquidoC2"
                    type="number"
                    value={formData.vrLiquidoC2}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                </div>

                <div>
                  <Label htmlFor="srccC2">SRCC C2</Label>
                  <Input
                    id="srccC2"
                    name="srccC2"
                    type="number"
                    value={formData.srccC2}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Buscar em Consignado</p>
                </div>

                <div>
                  <Label htmlFor="vrLiquidoSrcc">Vr Líquido - SRCC</Label>
                  <Input
                    id="vrLiquidoSrcc"
                    name="vrLiquidoSrcc"
                    type="number"
                    value={formData.vrLiquidoSrcc}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Vr Líquido - SRCC</p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-8 flex gap-4">
              <Button
                onClick={handleSalvar}
                disabled={salvarCalculo.isPending || buscando}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {salvarCalculo.isPending ? 'Salvando...' : 'Salvar Cálculo'}
              </Button>
              <Button
                onClick={handleLimpar}
                variant="outline"
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
