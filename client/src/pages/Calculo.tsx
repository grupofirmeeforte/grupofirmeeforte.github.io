import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function Calculo() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    empresa: '',
    mesAno: '',
    chaveJ: '',
    nomeAgente: '',
    cidade: '',
    percentual: 0,
    comissaoTotal: 0,
    rbmTotal: 0,
    comissaoConsig: 0,
    comissaoConsorcio: 0,
    comissaoOurocap: 0,
    comissaoCC: 0,
    comissaoSeguros: 0,
    ajudaCusto: 0,
    creditosDebitos: 0,
    adiantamento: 0,
    reajuste: 0,
    comissaoSupervisor: 0,
    rbmCredito: 0,
    rbmCC: 0,
    rbmConsorcio: 0,
    rbmOurocap: 0,
    rbmSeguros: 0,
    qtdeContas: 0,
    vrLiquido: 0,
    srcc: 0,
    vrLiquidoSrcc: 0,
  });

  const { data: consignados = [] } = trpc.consignado.listar.useQuery();

  // Buscar dados ao mudar Chave J
  useEffect(() => {
    if (formData.chaveJ && formData.mesAno) {
      const mesAnoBusca = parseInt(formData.mesAno);
      const registros = consignados.filter((c: any) => 
        c.chaveJ === formData.chaveJ && 
        parseInt(c.tabelaMes || '0') === mesAnoBusca
      );

      if (registros.length > 0) {
        // Somar valores por modalidade
        const rbmCredito = registros.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmcreditoC2 || '0') || 0), 0);
        const rbmCC = registros.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmContaCorrente || '0') || 0), 0);
        const rbmConsorcio = registros.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmConsorcioC2 || '0') || 0), 0);
        const rbmOurocap = registros.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmOurocap || '0') || 0), 0);
        const rbmSeguros = registros.reduce((sum: number, r: any) => sum + (parseFloat(r.rbmSeguro || '0') || 0), 0);
        const rbmTotal = rbmCredito + rbmCC + rbmConsorcio + rbmOurocap + rbmSeguros;
        const vrLiquido = registros.reduce((sum: number, r: any) => sum + (parseFloat(r.vrLiquido || '0') || 0), 0);
        const srcc = registros.reduce((sum: number, r: any) => sum + (parseFloat(r.srcc || '0') || 0), 0);

        setFormData(prev => ({
          ...prev,
          rbmCredito,
          rbmCC,
          rbmConsorcio,
          rbmOurocap,
          rbmSeguros,
          rbmTotal,
          vrLiquido,
          srcc,
          qtdeContas: registros.length,
          nomeAgente: registros[0]?.nomeAgente || '',
        }));

        toast.success(`${registros.length} registros encontrados`);
      }
    }
  }, [formData.chaveJ, formData.mesAno, consignados]);

  // Calcular Percentual = Total RBM / Comissão Total
  useEffect(() => {
    if (formData.comissaoTotal > 0 && formData.rbmTotal > 0) {
      const percentual = (formData.rbmTotal / formData.comissaoTotal) * 100;
      setFormData(prev => ({ ...prev, percentual: parseFloat(percentual.toFixed(2)) }));
    }
  }, [formData.rbmTotal, formData.comissaoTotal]);

  // Calcular Vr. Líquido - SRCC
  useEffect(() => {
    const vrLiquidoSrcc = formData.vrLiquido - formData.srcc;
    setFormData(prev => ({ ...prev, vrLiquidoSrcc: parseFloat(vrLiquidoSrcc.toFixed(2)) }));
  }, [formData.vrLiquido, formData.srcc]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: isNaN(parseFloat(value)) ? value : parseFloat(value),
    }));
  };

  const handleLimpar = () => {
    setFormData({
      empresa: '',
      mesAno: '',
      chaveJ: '',
      nomeAgente: '',
      cidade: '',
      percentual: 0,
      comissaoTotal: 0,
      rbmTotal: 0,
      comissaoConsig: 0,
      comissaoConsorcio: 0,
      comissaoOurocap: 0,
      comissaoCC: 0,
      comissaoSeguros: 0,
      ajudaCusto: 0,
      creditosDebitos: 0,
      adiantamento: 0,
      reajuste: 0,
      comissaoSupervisor: 0,
      rbmCredito: 0,
      rbmCC: 0,
      rbmConsorcio: 0,
      rbmOurocap: 0,
      rbmSeguros: 0,
      qtdeContas: 0,
      vrLiquido: 0,
      srcc: 0,
      vrLiquidoSrcc: 0,
    });
    toast.success('Formulário limpo!');
  };

  const handleSalvar = () => {
    if (!formData.empresa || !formData.mesAno || !formData.chaveJ) {
      toast.error('Preencha Empresa, Mês/Ano e Chave J');
      return;
    }
    toast.success('Cálculo salvo com sucesso!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation('/financeiro')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cálculo de Comissões</h1>
            <p className="text-sm text-gray-600">Calcule comissões, RBM e outras métricas por agente</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Dados de Entrada - Linha 1 */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados de Entrada</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                <Input
                  name="empresa"
                  value={formData.empresa}
                  onChange={handleInputChange}
                  placeholder="Buscar no cadastro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mês/Ano</label>
                <Input
                  name="mesAno"
                  value={formData.mesAno}
                  onChange={handleInputChange}
                  placeholder="MM/AAAA"
                />
                <p className="text-xs text-gray-500 mt-1">Mês anterior (ex: 426)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chave J</label>
                <Input
                  name="chaveJ"
                  value={formData.chaveJ}
                  onChange={handleInputChange}
                  placeholder="Buscar em Consignado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Agente</label>
                <Input
                  name="nomeAgente"
                  value={formData.nomeAgente}
                  onChange={handleInputChange}
                  placeholder="Buscar Cadastro"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
                <Input
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleInputChange}
                  placeholder="Buscar em Cadastro Agente"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Comissões - Linha 2 */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Comissões</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Percentual</label>
                <Input
                  name="percentual"
                  type="number"
                  value={formData.percentual}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Total RBM / Comissão Total</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comissão Total</label>
                <Input
                  name="comissaoTotal"
                  type="number"
                  value={formData.comissaoTotal}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RBM Total</label>
                <Input
                  name="rbmTotal"
                  type="number"
                  value={formData.rbmTotal}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comissão Consig</label>
                <Input
                  name="comissaoConsig"
                  type="number"
                  value={formData.comissaoConsig}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Buscar em Consignado</p>
              </div>
            </div>
          </div>

          {/* Outros Valores - Linha 3 */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Outros Valores</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seguros</label>
                <Input
                  name="comissaoSeguros"
                  type="number"
                  value={formData.comissaoSeguros}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ajuda de Custo</label>
                <Input
                  name="ajudaCusto"
                  type="number"
                  value={formData.ajudaCusto}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Créditos/Débitos</label>
                <Input
                  name="creditosDebitos"
                  type="number"
                  value={formData.creditosDebitos}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adiantamento</label>
                <Input
                  name="adiantamento"
                  type="number"
                  value={formData.adiantamento}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reajuste</label>
                <Input
                  name="reajuste"
                  type="number"
                  value={formData.reajuste}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* RBM por Modalidade - Linha 4 */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">RBM por Modalidade</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RBM Crédito C2</label>
                <Input
                  name="rbmCredito"
                  type="number"
                  value={formData.rbmCredito}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Buscar em Consignado</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RBM Conta Corrente</label>
                <Input
                  name="rbmCC"
                  type="number"
                  value={formData.rbmCC}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RBM Consórcio C2</label>
                <Input
                  name="rbmConsorcio"
                  type="number"
                  value={formData.rbmConsorcio}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RBM OuroCap</label>
                <Input
                  name="rbmOurocap"
                  type="number"
                  value={formData.rbmOurocap}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RBM Seguros</label>
                <Input
                  name="rbmSeguros"
                  type="number"
                  value={formData.rbmSeguros}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Resultado - Linha 5 */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Resultado</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qtde Contas</label>
                <Input
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Vr. Líquido C2</label>
                <Input
                  name="vrLiquido"
                  type="number"
                  value={formData.vrLiquido}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Somar total de cada chave</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SRCC C2</label>
                <Input
                  name="srcc"
                  type="number"
                  value={formData.srcc}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Buscar em Consignado</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vr. Líquido - SRCC</label>
                <Input
                  name="vrLiquidoSrcc"
                  type="number"
                  value={formData.vrLiquidoSrcc}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Vr. Líquido - SRCC</p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="p-6 flex gap-3">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSalvar}
            >
              Salvar Cálculo
            </Button>
            <Button
              variant="outline"
              onClick={handleLimpar}
            >
              Limpar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
