import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Trash2, Upload, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';

type Cert = {
  id: number;
  empresa?: string | null;
  chaveJ?: string | null;
  nomeAgente?: string | null;
  cpf?: string | null;
  situacao?: string | null;
  dataCertif?: string | null;
  ventoCertif?: string | null;
  diasFaltando?: number | null;
  situacaoCertif?: string | null;
  nrCertificadoConsig?: string | null;
  dataCertif2?: string | null;
  ventoCertif3?: string | null;
  diasFaltando2?: number | null;
  situacaoCertif3?: string | null;
  nrCertificadoPldft?: string | null;
};

type FormData = {
  empresa?: string;
  chaveJ?: string;
  nomeAgente?: string;
  cpf?: string;
  situacao?: string;
  dataCertif?: string;
  ventoCertif?: string;
  nrCertificadoConsig?: string;
  dataCertif2?: string;
  ventoCertif3?: string;
  nrCertificadoPldft?: string;
};

const EMPTY: FormData = {};

function fmtDate(val: string | null | undefined) {
  if (!val) return '-';
  // YYYY-MM-DD → DD/MM/YYYY
  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  // M/D/YY ou M/D/YYYY (formato americano do Excel) → DD/MM/AAAA
  const usMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    const dd = usMatch[2].padStart(2, '0');
    const mm = usMatch[1].padStart(2, '0');
    let yyyy = usMatch[3];
    if (yyyy.length === 2) yyyy = parseInt(yyyy) >= 50 ? `19${yyyy}` : `20${yyyy}`;
    return `${dd}/${mm}/${yyyy}`;
  }
  return val;
}

function situacaoColor(s: string | null | undefined) {
  if (!s || s === '-') return 'text-slate-400';
  if (s === 'A VENCER') return 'text-green-700 font-semibold';
  if (s === 'VENCIDO') return 'text-red-600 font-semibold';
  return '';
}

export default function Certificacoes() {
  const [, setLocation] = useLocation();
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const sincronizar = trpc.certificacoes.sincronizarAgentes.useMutation({
    onSuccess: (r) => {
      if (r.atualizados > 0) utils.certificacoes.listar.invalidate();
    },
  });

  // Sincroniza uma vez por dia na primeira abertura
  useEffect(() => {
    const CHAVE = 'cert_sync_date';
    const hoje = new Date().toISOString().split('T')[0];
    const ultima = localStorage.getItem(CHAVE);
    if (ultima !== hoje) {
      localStorage.setItem(CHAVE, hoje);
      sincronizar.mutate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: registros = [], isLoading } = trpc.certificacoes.listar.useQuery(
    { busca: busca || undefined },
    { refetchInterval: 10000, refetchOnWindowFocus: true }
  );

  const criar = trpc.certificacoes.criar.useMutation({
    onSuccess: () => { utils.certificacoes.listar.invalidate(); toast.success('Registro criado!'); setModalAberto(false); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const atualizar = trpc.certificacoes.atualizar.useMutation({
    onSuccess: () => { utils.certificacoes.listar.invalidate(); toast.success('Registro atualizado!'); setModalAberto(false); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const excluir = trpc.certificacoes.excluir.useMutation({
    onSuccess: () => { utils.certificacoes.listar.invalidate(); toast.success('Excluído!'); setConfirmandoExclusao(null); },
    onError: (e) => toast.error('Erro: ' + e.message),
  });

  const importar = trpc.certificacoes.importar.useMutation({
    onSuccess: (r) => { utils.certificacoes.listar.invalidate(); toast.success(`${r.count} registros importados!`); },
    onError: (e) => toast.error('Erro na importação: ' + e.message),
  });

  function abrirNovo() {
    setEditandoId(null);
    setForm(EMPTY);
    setModalAberto(true);
  }

  function abrirEditar(c: Cert) {
    setEditandoId(c.id);
    setForm({
      empresa: c.empresa || '',
      chaveJ: c.chaveJ || '',
      nomeAgente: c.nomeAgente || '',
      cpf: c.cpf || '',
      situacao: c.situacao || '',
      dataCertif: c.dataCertif || '',
      ventoCertif: c.ventoCertif || '',
      nrCertificadoConsig: c.nrCertificadoConsig || '',
      dataCertif2: c.dataCertif2 || '',
      ventoCertif3: c.ventoCertif3 || '',
      nrCertificadoPldft: c.nrCertificadoPldft || '',
    });
    setModalAberto(true);
  }

  function salvar() {
    if (editandoId) {
      atualizar.mutate({ id: editandoId, ...form });
    } else {
      criar.mutate(form);
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

        // Encontrar linha de cabeçalho
        let headerIdx = -1;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row && row.some((c: any) => typeof c === 'string' && c.toLowerCase().includes('chave'))) {
            headerIdx = i;
            break;
          }
        }
        if (headerIdx === -1) { toast.error('Cabeçalho não encontrado. Esperado: CHAVE J'); return; }

        const headers: string[] = rows[headerIdx].map((h: any) => String(h || '').toLowerCase().trim());
        const colMap: Record<string, string> = {
          'empresa': 'empresa',
          'chave j': 'chaveJ', 'chavej': 'chaveJ', 'chave_j': 'chaveJ',
          'nome agente': 'nomeAgente', 'nomeagente': 'nomeAgente', 'nome_agente': 'nomeAgente',
          'cpf': 'cpf',
          'situação': 'situacao', 'situacao': 'situacao',
          'data certif': 'dataCertif', 'datacertif': 'dataCertif', 'data certif1': 'dataCertif',
          'vencto certif': 'ventoCertif', 'venctocertif': 'ventoCertif', 'vencto certif1': 'ventoCertif',
          'nr certifficado consig': 'nrCertificadoConsig', 'nr certificado consig': 'nrCertificadoConsig', 'nrcertificadoconsig': 'nrCertificadoConsig', 'nrcertifficadoconsig': 'nrCertificadoConsig',
          'data certif2': 'dataCertif2', 'datacertif2': 'dataCertif2',
          'vencto certif3': 'ventoCertif3', 'venctocertif3': 'ventoCertif3', 'vencto certif2': 'ventoCertif3',
          'nr certifficado pldft': 'nrCertificadoPldft', 'nr certificado pldft': 'nrCertificadoPldft', 'nrcertificadopldft': 'nrCertificadoPldft', 'nrcertifficadopldft': 'nrCertificadoPldft',
        };

        const toISODate = (val: any): string | undefined => {
          if (!val) return undefined;
          if (val instanceof Date) {
            return val.toISOString().split('T')[0];
          }
          const s = String(val).trim();
          // DD/MM/YYYY
          const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          if (m) return `${m[3]}-${m[2]}-${m[1]}`;
          // YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
          return s;
        }

        const records = rows.slice(headerIdx + 1).map((row: any[]) => {
          const obj: any = {};
          headers.forEach((h, i) => {
            const field = colMap[h];
            if (field) obj[field] = row[i] != null ? String(row[i]).trim() : undefined;
          });
          // Converter datas para ISO (YYYY-MM-DD) para envio ao servidor
          if (obj.dataCertif) obj.dataCertif = toISODate(obj.dataCertif);
          if (obj.ventoCertif) obj.ventoCertif = toISODate(obj.ventoCertif);
          if (obj.dataCertif2) obj.dataCertif2 = toISODate(obj.dataCertif2);
          if (obj.ventoCertif3) obj.ventoCertif3 = toISODate(obj.ventoCertif3);
          // Limpar situacao do CSV — será buscada do cadastro do agente
          obj.situacao = undefined;
          return obj;
        }).filter((r: any) => r.chaveJ || r.nomeAgente);

        if (records.length === 0) { toast.error('Nenhum registro válido encontrado'); return; }
        importar.mutate(records);
      } catch (err) {
        toast.error('Erro ao processar arquivo');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Certificações</h1>
          <p className="text-sm text-slate-500">Controle de certificações dos agentes (CONSIG e LGPD)</p>
        </div>
      </div>

      <div className="p-6">
        {/* Barra de ações */}
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <Input
            placeholder="Buscar por ChaveJ, Nome ou CPF..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex-1" />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" /> Importar CSV/Excel
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImport} />
          <Button onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-2" /> Novo
          </Button>
          <Button onClick={() => setLocation('/')} className="flex items-center gap-2 bg-gray-800 text-white hover:bg-gray-900">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-blue-700 hover:bg-blue-700">
                <TableHead className="text-white font-semibold">Empresa</TableHead>
                <TableHead className="text-white font-semibold">ChaveJ</TableHead>
                <TableHead className="text-white font-semibold">Nome Agente</TableHead>
                <TableHead className="text-white font-semibold">CPF</TableHead>
                <TableHead className="text-white font-semibold">Situação</TableHead>
                <TableHead className="text-white font-semibold text-center" colSpan={5}>Certificação CONSIG</TableHead>
                <TableHead className="text-white font-semibold text-center" colSpan={5}>Certificação LGPD</TableHead>
                <TableHead className="text-white font-semibold">Ações</TableHead>
              </TableRow>
              <TableRow className="bg-blue-600 hover:bg-blue-600">
                <TableHead className="text-white text-xs"></TableHead>
                <TableHead className="text-white text-xs"></TableHead>
                <TableHead className="text-white text-xs"></TableHead>
                <TableHead className="text-white text-xs"></TableHead>
                <TableHead className="text-white text-xs"></TableHead>
                <TableHead className="text-white text-xs">Data Certif</TableHead>
                <TableHead className="text-white text-xs">Vencto</TableHead>
                <TableHead className="text-white text-xs">Dias Faltando</TableHead>
                <TableHead className="text-white text-xs">Situação</TableHead>
                <TableHead className="text-white text-xs">Nr. Certif</TableHead>
                <TableHead className="text-white text-xs">Data Certif</TableHead>
                <TableHead className="text-white text-xs">Vencto</TableHead>
                <TableHead className="text-white text-xs">Dias Faltando</TableHead>
                <TableHead className="text-white text-xs">Situação</TableHead>
                <TableHead className="text-white text-xs">Nr. Certif</TableHead>
                <TableHead className="text-white text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : registros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-8 text-slate-400">
                    Nenhum registro encontrado. Importe um arquivo ou cadastre manualmente.
                  </TableCell>
                </TableRow>
              ) : registros.map((c) => (
                <TableRow key={c.id} className="hover:bg-slate-50">
                  <TableCell>{(c as any).empresa || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{c.chaveJ || '-'}</TableCell>
                  <TableCell>{c.nomeAgente || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{c.cpf || '-'}</TableCell>
                  <TableCell>{c.situacao || '-'}</TableCell>
                  {/* CONSIG */}
                  {c.id === -1 ? (
                    <TableCell colSpan={10} className="text-center text-amber-600 font-medium text-xs italic">
                      Iremos na certificação e atualizaremos
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>{fmtDate(c.dataCertif)}</TableCell>
                      <TableCell>{fmtDate(c.ventoCertif)}</TableCell>
                      <TableCell className="text-center">{c.diasFaltando ?? '-'}</TableCell>
                      <TableCell className={situacaoColor(c.situacaoCertif)}>{c.situacaoCertif || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{c.nrCertificadoConsig || '-'}</TableCell>
                      {/* LGPD */}
                      <TableCell>{fmtDate(c.dataCertif2)}</TableCell>
                      <TableCell>{fmtDate(c.ventoCertif3)}</TableCell>
                      <TableCell className="text-center">{c.diasFaltando2 ?? '-'}</TableCell>
                      <TableCell className={situacaoColor(c.situacaoCertif3)}>{c.situacaoCertif3 || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{c.nrCertificadoPldft || '-'}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <div className="flex gap-1">
                      {c.cpf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Consultar no CRCP"
                          onClick={() => {
                            const cpfLimpo = c.cpf!.replace(/\D/g, '');
                            window.open(`https://www.crcp.org.br/?cpf=${cpfLimpo}`, '_blank');
                          }}
                        >
                          <ExternalLink className="w-3 h-3 text-blue-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => abrirEditar(c as Cert)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setConfirmandoExclusao(c.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-slate-400 mt-2">{registros.length} registro(s)</p>
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editandoId ? 'Editar Certificação' : 'Nova Certificação'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="text-xs font-medium text-slate-600">Empresa</label>
              <Input value={form.empresa || ''} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">ChaveJ</label>
              <Input value={form.chaveJ || ''} onChange={e => setForm(p => ({ ...p, chaveJ: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Nome Agente</label>
              <Input value={form.nomeAgente || ''} onChange={e => setForm(p => ({ ...p, nomeAgente: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">CPF</label>
              <Input value={form.cpf || ''} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Situação</label>
              <Input value={form.situacao || ''} onChange={e => setForm(p => ({ ...p, situacao: e.target.value }))} />
            </div>
            <div className="col-span-2 border-t pt-2">
              <p className="text-xs font-bold text-blue-700 mb-2">Certificação CONSIG</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Data Certif (AAAA-MM-DD)</label>
              <Input type="date" value={form.dataCertif || ''} onChange={e => setForm(p => ({ ...p, dataCertif: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Vencto Certif (AAAA-MM-DD)</label>
              <Input type="date" value={form.ventoCertif || ''} onChange={e => setForm(p => ({ ...p, ventoCertif: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600">Nr. Certificado CONSIG</label>
              <Input value={form.nrCertificadoConsig || ''} onChange={e => setForm(p => ({ ...p, nrCertificadoConsig: e.target.value }))} />
            </div>
            <div className="col-span-2 border-t pt-2">
              <p className="text-xs font-bold text-purple-700 mb-2">Certificação LGPD</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Data Certif 2 (AAAA-MM-DD)</label>
              <Input type="date" value={form.dataCertif2 || ''} onChange={e => setForm(p => ({ ...p, dataCertif2: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Vencto Certif 2 (AAAA-MM-DD)</label>
              <Input type="date" value={form.ventoCertif3 || ''} onChange={e => setForm(p => ({ ...p, ventoCertif3: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-600">Nr. Certificado LGPD</label>
              <Input value={form.nrCertificadoPldft || ''} onChange={e => setForm(p => ({ ...p, nrCertificadoPldft: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={criar.isPending || atualizar.isPending}>
              {editandoId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Exclusão */}
      <Dialog open={confirmandoExclusao !== null} onOpenChange={() => setConfirmandoExclusao(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Exclusão</DialogTitle></DialogHeader>
          <p>Tem certeza que deseja excluir este registro?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmandoExclusao(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmandoExclusao && excluir.mutate({ id: confirmandoExclusao })}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
