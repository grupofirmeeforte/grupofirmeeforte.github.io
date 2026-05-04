import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Search } from 'lucide-react';
import { useLocation } from 'wouter';

export default function AuditoriaPage() {
  const [, navigate] = useLocation();
  const [filtroChaveJ, setFiltroChaveJ] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [page, setPage] = useState(0);
  const limit = 50;

  const { data: logs, isLoading } = trpc.auditoria.list.useQuery({
    chaveJ: filtroChaveJ || undefined,
    modulo: filtroModulo && filtroModulo !== 'todos' ? filtroModulo : undefined,
    limit,
    offset: page * limit,
  });

  const { data: totalCount } = trpc.auditoria.count.useQuery({
    chaveJ: filtroChaveJ || undefined,
    modulo: filtroModulo && filtroModulo !== 'todos' ? filtroModulo : undefined,
  });

  const totalPages = totalCount ? Math.ceil(totalCount / limit) : 0;

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) return;

    const headers = [
      'Número Entrada',
      'Nome Agente',
      'ChaveJ',
      'Módulo',
      'Ação',
      'Horário Entrada',
      'Horário Saída',
      'Descrição',
    ];

    const rows = logs.map((log: any) => [
      log.numeroEntrada,
      log.nomeAgente,
      log.chaveJ,
      log.modulo || '-',
      log.acao || '-',
      new Date(log.horarioEntrada).toLocaleString('pt-BR'),
      log.horarioSaida ? new Date(log.horarioSaida).toLocaleString('pt-BR') : '-',
      log.descricao || '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auditoria/Logs</h1>
          <p className="text-gray-600 mt-1">
            {totalCount ? `Total: ${totalCount} registros` : 'Carregando...'}
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por ChaveJ..."
                value={filtroChaveJ}
                onChange={(e) => {
                  setFiltroChaveJ(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>

            <Select value={filtroModulo} onValueChange={(value) => {
              setFiltroModulo(value);
              setPage(0);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Agentes">Agentes</SelectItem>
                <SelectItem value="Certificações">Certificações</SelectItem>
                <SelectItem value="Fornecedores">Fornecedores</SelectItem>
                <SelectItem value="Operações">Operações</SelectItem>
                <SelectItem value="Financeiro">Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número Entrada</TableHead>
                  <TableHead>Nome Agente</TableHead>
                  <TableHead>ChaveJ</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Horário Entrada</TableHead>
                  <TableHead>Horário Saída</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : logs && logs.length > 0 ? (
                  logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-sm">
                        {log.numeroEntrada}
                      </TableCell>
                      <TableCell>{log.nomeAgente}</TableCell>
                      <TableCell>{log.chaveJ}</TableCell>
                      <TableCell>{log.modulo || '-'}</TableCell>
                      <TableCell>{log.acao || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(log.horarioEntrada).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.horarioSaida
                          ? new Date(log.horarioSaida).toLocaleString('pt-BR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{log.descricao || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Página {page + 1} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            variant="outline"
          >
            Anterior
          </Button>
          <Button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            variant="outline"
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
