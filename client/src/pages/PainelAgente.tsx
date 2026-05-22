import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Trophy, Flame, Star, Zap, Crown, Medal, Award,
  TrendingUp, Target, Calendar, AlertTriangle, BarChart2,
  ChevronUp, ChevronDown, Minus, User, Edit2
} from "lucide-react";
import { toast } from "sonner";

const ICONE_MAP: Record<string, React.ReactNode> = {
  trophy: <Trophy className="w-5 h-5" />,
  flame: <Flame className="w-5 h-5" />,
  crown: <Crown className="w-5 h-5" />,
  star: <Star className="w-5 h-5" />,
  zap: <Zap className="w-5 h-5" />,
  medal: <Medal className="w-5 h-5" />,
  award: <Award className="w-5 h-5" />,
};

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PosicaoIcon({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-2xl">🥇</span>;
  if (pos === 2) return <span className="text-2xl">🥈</span>;
  if (pos === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-lg font-bold text-slate-400">#{pos}</span>;
}

export default function PainelAgente() {
  const [, navigate] = useLocation();
  const [modalMeta, setModalMeta] = useState(false);
  const [metaInput, setMetaInput] = useState("");
  const [mesRankFiltro, setMesRankFiltro] = useState<string | undefined>(undefined);

  // Registrar acesso (streak)
  const registrarAcesso = trpc.engajamento.registrarAcesso.useMutation();

  useEffect(() => {
    registrarAcesso.mutate();
  }, []);

  const { data: painel, isLoading } = trpc.engajamento.painelPessoal.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { data: ranking, isLoading: rankLoading } = trpc.engajamento.rankingMes.useQuery(
    { mesRef: mesRankFiltro },
    { refetchOnWindowFocus: false }
  );

  const { data: meses } = trpc.engajamento.mesesDisponiveis.useQuery();

  const salvarMeta = trpc.engajamento.salvarMeta.useMutation({
    onSuccess: () => {
      toast.success("Meta salva! Sua meta foi atualizada com sucesso.");
      setModalMeta(false);
    }
  });

  const utils = trpc.useUtils();

  const handleSalvarMeta = () => {
    const val = parseFloat(metaInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      toast.error("Digite um valor válido para a meta.");
      return;
    }
    salvarMeta.mutate({
      mesRef: painel?.mesAtual ?? '',
      metaTotal: val,
    }, {
      onSuccess: () => {
        utils.engajamento.painelPessoal.invalidate();
      }
    });
  };

  const comissaoAtual = painel?.producaoMes?.comissaoTotal ?? 0;
  const metaTotal = painel?.meta?.metaTotal ?? 0;
  const percMeta = metaTotal > 0 ? Math.min((comissaoAtual / metaTotal) * 100, 100) : 0;
  const percMetaReal = metaTotal > 0 ? (comissaoAtual / metaTotal) * 100 : 0;

  const streakAtual = painel?.streak?.streakAtual ?? 0;
  const maiorStreak = painel?.streak?.maiorStreak ?? 0;

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #002776 0%, #003d99 60%, #c8960c 100%)' }} className="shadow-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-6 h-6 text-yellow-300" />
            <div>
              <h1 className="text-xl font-bold text-white">Meu Painel</h1>
              <p className="text-xs text-yellow-300 capitalize">{hoje}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white border-none"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <BarChart2 className="w-16 h-16 text-yellow-400 animate-pulse mx-auto mb-4" />
            <p className="text-slate-400">Carregando seu painel...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* Boas-vindas + Streak */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Boas-vindas */}
            <Card className="md:col-span-2 border-0 bg-slate-800/80 text-white shadow-xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Bem-vindo de volta,</p>
                  <h2 className="text-2xl font-bold text-white">{painel?.agente?.nomeAgente ?? 'Agente'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-blue-600 text-white text-xs">{painel?.agente?.empresa ?? ''}</Badge>
                    {painel?.agente?.nivel && (
                      <Badge className="bg-amber-600 text-white text-xs">{painel.agente.nivel}</Badge>
                    )}
                    <span className="text-slate-400 text-xs">{painel?.agente?.cidade}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Streak */}
            <Card className="border-0 shadow-xl" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <CardContent className="p-6 text-center text-white">
                <Flame className="w-8 h-8 text-orange-300 mx-auto mb-2" />
                <div className="text-4xl font-black text-white">{streakAtual}</div>
                <p className="text-purple-200 text-sm font-medium">dia{streakAtual !== 1 ? 's' : ''} seguido{streakAtual !== 1 ? 's' : ''}</p>
                <div className="mt-3 pt-3 border-t border-purple-400/30 flex justify-around text-xs text-purple-200">
                  <div><div className="font-bold text-white">{maiorStreak}</div>recorde</div>
                  <div><div className="font-bold text-white">{painel?.streak?.totalAcessos ?? 0}</div>total</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Produção do Mês + Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Produção */}
            <Card className="border-0 bg-slate-800/80 text-white shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-slate-200">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Produção — {painel?.mesAtual}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-3xl font-black text-green-400">{fmt(comissaoAtual)}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-slate-700/50 rounded-lg p-2">
                    <div className="text-slate-400 text-xs">Consignado</div>
                    <div className="font-semibold text-white">{fmt(painel?.producaoMes?.comissaoConsig ?? 0)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-2">
                    <div className="text-slate-400 text-xs">Consórcio</div>
                    <div className="font-semibold text-white">{fmt(painel?.producaoMes?.comissaoConsorcio ?? 0)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-2">
                    <div className="text-slate-400 text-xs">Ourocap</div>
                    <div className="font-semibold text-white">{fmt(painel?.producaoMes?.comissaoOurocap ?? 0)}</div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-2">
                    <div className="text-slate-400 text-xs">C/C</div>
                    <div className="font-semibold text-white">{fmt(painel?.producaoMes?.comissaoCc ?? 0)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Meta */}
            <Card className="border-0 bg-slate-800/80 text-white shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between text-slate-200">
                  <span className="flex items-center gap-2"><Target className="w-5 h-5 text-amber-400" /> Meta do Mês</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setMetaInput(metaTotal > 0 ? String(metaTotal) : ''); setModalMeta(true); }}
                    className="h-7 text-xs bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Edit2 className="w-3 h-3 mr-1" /> Definir
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metaTotal > 0 ? (
                  <>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-3xl font-black" style={{ color: percMetaReal >= 100 ? '#4ade80' : percMetaReal >= 70 ? '#facc15' : '#f87171' }}>
                          {percMetaReal.toFixed(1)}%
                        </div>
                        <div className="text-slate-400 text-xs">de {fmt(metaTotal)}</div>
                      </div>
                      <div className="text-right text-sm">
                        {percMetaReal >= 100 ? (
                          <Badge className="bg-green-600 text-white">✓ Meta batida!</Badge>
                        ) : (
                          <div className="text-slate-400">faltam {fmt(Math.max(0, metaTotal - comissaoAtual))}</div>
                        )}
                      </div>
                    </div>
                    <Progress
                      value={percMeta}
                      className="h-4 bg-slate-700"
                      style={{ '--progress-color': percMetaReal >= 100 ? '#4ade80' : percMetaReal >= 70 ? '#facc15' : '#f87171' } as React.CSSProperties}
                    />
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Target className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Nenhuma meta definida</p>
                    <Button
                      size="sm"
                      onClick={() => setModalMeta(true)}
                      className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Definir Meta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Ranking + Posição */}
          <Card className="border-0 bg-slate-800/80 text-white shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between text-slate-200">
                <span className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Ranking do Mês</span>
                <div className="flex items-center gap-2">
                  {painel?.ranking?.posicao && painel.ranking.posicao > 0 && (
                    <Badge className="bg-yellow-600 text-white text-xs">
                      Você: #{painel.ranking.posicao} de {painel.ranking.total}
                    </Badge>
                  )}
                  <select
                    value={mesRankFiltro ?? ''}
                    onChange={e => setMesRankFiltro(e.target.value || undefined)}
                    className="text-xs bg-slate-700 border border-slate-600 text-white rounded px-2 py-1"
                  >
                    <option value="">Mês atual</option>
                    {(meses ?? []).map(m => (
                      <option key={m ?? ''} value={m ?? ''}>{m}</option>
                    ))}
                  </select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rankLoading ? (
                <div className="text-center py-8 text-slate-400">Carregando ranking...</div>
              ) : !ranking || ranking.length === 0 ? (
                <div className="text-center py-8 text-slate-400">Nenhum dado disponível para este mês.</div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {ranking.map((r) => (
                    <div
                      key={r.chaveJ}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${r.isMe
                        ? 'bg-gradient-to-r from-yellow-600/30 to-amber-600/20 border border-yellow-500/40'
                        : 'bg-slate-700/40 hover:bg-slate-700/60'
                        }`}
                    >
                      <div className="w-10 text-center flex-shrink-0">
                        <PosicaoIcon pos={r.posicao} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm truncate ${r.isMe ? 'text-yellow-300' : 'text-white'}`}>
                          {r.nomeAgente} {r.isMe && <span className="text-xs text-yellow-400">(você)</span>}
                        </div>
                        <div className="text-xs text-slate-400">{r.empresa} · {r.cidade}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-bold text-sm ${r.isMe ? 'text-yellow-300' : 'text-green-400'}`}>
                          {fmt(r.comissaoTotal)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conquistas + Documentos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Conquistas */}
            <Card className="border-0 bg-slate-800/80 text-white shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-slate-200">
                  <Medal className="w-5 h-5 text-purple-400" /> Conquistas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!painel?.conquistas || painel.conquistas.length === 0 ? (
                  <div className="text-center py-6">
                    <Medal className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Nenhuma conquista ainda. Continue acessando!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {painel.conquistas.map((c) => (
                      <div key={c.codigo} className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-lg p-3 text-center">
                        <div className="text-purple-300 flex justify-center mb-1">
                          {ICONE_MAP[c.icone ?? ''] ?? <Trophy className="w-5 h-5" />}
                        </div>
                        <div className="text-white text-xs font-bold">{c.titulo}</div>
                        <div className="text-purple-300 text-xs mt-0.5">{c.descricao}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documentos vencendo */}
            <Card className="border-0 bg-slate-800/80 text-white shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-slate-200">
                  <AlertTriangle className="w-5 h-5 text-red-400" /> Documentos Vencendo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!painel?.docsVencendo || painel.docsVencendo.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-green-400 text-sm font-medium">Todos os documentos em dia!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {painel.docsVencendo.map((d, i) => {
                      const dias = Math.ceil((new Date((d as any).dataValidade ?? (d as any).data_validade ?? '').getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={i} className="flex items-center justify-between bg-red-900/30 border border-red-500/30 rounded-lg p-3">
                          <div>
                            <div className="text-white text-sm font-medium">{(d as any).tipoDocumento ?? (d as any).tipo_documento}</div>
                            <div className="text-red-300 text-xs">Vence em {new Date((d as any).dataValidade ?? (d as any).data_validade ?? '').toLocaleDateString('pt-BR')}</div>
                          </div>
                          <Badge className={`text-white text-xs ${dias <= 7 ? 'bg-red-600' : 'bg-orange-600'}`}>
                            {dias} dia{dias !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Histórico */}
          {painel?.historico && painel.historico.length > 0 && (
            <Card className="border-0 bg-slate-800/80 text-white shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-slate-200">
                  <Calendar className="w-5 h-5 text-blue-400" /> Histórico de Produção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {painel.historico.map((h, i) => (
                    <div key={h.mesRef ?? (h as any).mes_ref} className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className="text-slate-400 text-xs mb-1">{h.mesRef ?? (h as any).mes_ref}</div>
                      <div className="text-green-400 font-bold text-sm">{fmt(Number(h.total))}</div>
                      {i > 0 && painel.historico[i - 1] && (
                        <div className="flex items-center justify-center mt-1">
                          {Number(h.total) > Number(painel.historico[i - 1].total)
                            ? <ChevronUp className="w-3 h-3 text-green-400" />
                            : Number(h.total) < Number(painel.historico[i - 1].total)
                              ? <ChevronDown className="w-3 h-3 text-red-400" />
                              : <Minus className="w-3 h-3 text-slate-400" />
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* Modal Meta */}
      <Dialog open={modalMeta} onOpenChange={setModalMeta}>
        <DialogContent className="bg-slate-800 border-slate-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" /> Definir Meta — {painel?.mesAtual}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-slate-300">Meta Total (R$)</Label>
              <Input
                value={metaInput}
                onChange={e => setMetaInput(e.target.value)}
                placeholder="Ex: 5000"
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMeta(false)} className="border-slate-600 text-slate-300 bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleSalvarMeta} className="bg-amber-600 hover:bg-amber-700 text-white" disabled={salvarMeta.isPending}>
              {salvarMeta.isPending ? 'Salvando...' : 'Salvar Meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
