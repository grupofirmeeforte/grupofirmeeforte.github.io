# TODO - Sistema de Gestão Grupo Firme e Forte

## FASE 0: AUTENTICAÇÃO CUSTOMIZADA
- [x] Criar página de login com design da bandeira do Brasil
- [x] Implementar autenticação com ChaveJ e Senha
- [x] Implementar bloqueio após 3 tentativas falhas
- [x] Criar sistema de sessão customizado
- [x] Testar fluxo de login e bloqueio

## AJUSTES SOLICITADOS
- [x] Aplicar degradê em todas as linhas de tabelas para melhor visualização
- [x] Adicionar opções Ativo01 até Ativo10 no campo de Situação
- [x] Adicionar "Cancelado" no campo de Situação
- [x] Mover o formulário de login para o canto direito da bandeira
- [x] Adicionar lista de cargos em ordem alfabética: CEO, Gerente, Promotor, Suporte, Supervisor
- [x] Adicionar lista de áreas em ordem alfabética: ADM, Comercial, Vendas
- [x] Adicionar lista de vínculos em ordem alfabética: CLT, Prestador, Sócio
- [x] Eliminar tela de OAuth e deixar entrar direto com login customizado
- [x] MELHORIAS NO SISTEMA DE BLOQUEIO (ESSENCIAL):
  - [x] Persistência real do bloqueio (não reseta ao recarregar)
  - [x] Desbloquear manual por admin
  - [x] Registro detalhado de tentativas falhas
  - [ ] Notificação ao admin quando bloqueado
  - [ ] Página de status de bloqueio
  - [ ] Testes de segurança
  - [x] Desabilitar autocomplete nos campos de ChaveJ e Senha
  - [x] Desabilitar pop-up de salvar senha do navegador (usar sempre ChaveJ)
- [x] Implementar módulo de Auditoria/Logs com:
  - [x] Número de entrada (ID de sessão)
  - [x] Nome do agente
  - [x] Horário de entrada
  - [x] Horário de saída
  - [x] Qual aba/módulo foi acessado
  - [x] O que foi alterado/mexido
- [x] Implementar bloqueio do sistema após 3 tentativas falhas de login

## FASE 1: ESQUELETO DO BANCO DE DADOS
- [x] Criar migração SQL com todas as tabelas
- [x] Corrigir erros de TypeScript
- [ ] Executar migração no banco de dados
- [ ] Criar seeds iniciais com dados de exemplo

## FASE 2: MÓDULO DE AGENTES
- [x] Criar página de listagem de agentes
- [x] Criar formulário de cadastro de agentes
- [x] Criar formulário de edição de agentes
- [x] Implementar busca e filtros por empresa, situação, cidade
- [x] CORRIGIR: Erro ao editar um único campo (valores vazios sendo enviados)
- [x] CORRIGIR: Mascarar senha na tabela de agentes (mostrar *** em vez do valor)
- [x] DEBUG: Erro ao fazer login - volta para a página de login
- [x] Adicionar formatação automática de CPF (000.000.000-00) e Celular ((00) 00000-0000)
- [x] CORRIGIR: Data de nascimento voltando um dia antes (fuso horário)
  - [x] Migração de coluna date para varchar(10)
  - [x] Remoção de conversões new Date() no frontend
  - [x] Formatação de datas como YYYY-MM-DD puro
- [ ] Criar visualização de detalhes do agente
- [ ] Implementar importação de CSV para agentes

## FASE 3: MÓDULO DE CERTIFICAÇÕES
- [ ] Criar página de listagem de certificações
- [ ] Criar formulário de cadastro de certificações
- [ ] Criar formulário de edição de certificações
- [ ] Implementar filtro por status (A Vencer, Vencido)
- [ ] Criar alertas visuais para certificações vencendo
- [ ] Implementar importação de CSV para certificações

## FASE 4: MÓDULO DE FORNECEDORES
- [ ] Criar página de listagem de fornecedores
- [ ] Criar formulário de cadastro de fornecedores
- [ ] Criar formulário de edição de fornecedores
- [ ] Implementar busca por nome ou CNPJ/CPF

## FASE 5: MÓDULO DE OPERAÇÕES (PRODUTOS)
- [ ] Criar página de consignados
- [ ] Criar página de contas correntes
- [ ] Criar página de consórcios
- [ ] Criar página de OuroCap
- [ ] Criar página de seguros
- [ ] Implementar formulários de cadastro para cada produto
- [ ] Implementar importação de CSV para cada tipo de operação

## FASE 6: MÓDULO DE COMISSÕES
- [ ] Criar página de tabelas de comissão
- [ ] Criar formulário de cadastro/edição de tabelas
- [ ] Implementar cálculo automático de comissões por faixa
- [ ] Criar visualização de comissões por agente
- [ ] Implementar filtro por período (mês/ano)

## FASE 7: MÓDULO FINANCEIRO
- [ ] Criar página de pagamentos
- [ ] Criar formulário de registro de pagamentos
- [ ] Criar página de cálculos consolidados
- [ ] Implementar fórmulas de cálculo de comissão total
- [ ] Implementar cálculo de RBM (Receita Bruta de Movimentação)
- [ ] Implementar cálculo de ajuda de custo
- [ ] Implementar cálculo de comissão de supervisor

## FASE 8: MÓDULO DE PRODUÇÃO
- [ ] Criar página de produção Banco do Brasil
- [ ] Implementar cálculos de receita por tipo de produto
- [ ] Criar visualização de totalizações por período
- [ ] Implementar filtro por mês/ano

## FASE 9: DASHBOARD E RELATÓRIOS
- [ ] Criar dashboard principal com KPIs
- [ ] Implementar gráfico de produção por agente
- [ ] Implementar gráfico de comissões por período
- [ ] Implementar gráfico de certificações vencidas/a vencer
- [ ] Criar relatório de produção mensal
- [ ] Criar relatório de comissões por agente
- [ ] Criar relatório de pagamentos

## FASE 10: FUNCIONALIDADES AVANÇADAS
- [ ] Implementar busca por mês de referência (MM/AAAA)
- [ ] Implementar exportação de dados para Excel
- [ ] Implementar histórico de alterações
- [ ] Implementar controle de permissões por perfil
- [ ] Implementar auditoria de operações

## FASE 11: TESTES E VALIDAÇÃO
- [ ] Criar testes unitários para cálculos
- [ ] Criar testes de integração para APIs
- [ ] Validar importação de dados
- [ ] Testar fórmulas de comissão
- [ ] Testar compatibilidade Windows/Mac

## FASE 12: DOCUMENTAÇÃO E DEPLOY
- [ ] Criar documentação de uso
- [ ] Criar guia de importação de dados
- [ ] Criar manual de fórmulas
- [ ] Preparar para deploy
- [ ] Criar checkpoint final

---

## ESTRUTURA DE DADOS MAPEADA

### Tabelas Principais:
1. **agentes** - Cadastro de agentes (24 campos)
2. **certificacoes** - Controle de certificações (15 campos)
3. **fornecedores** - Cadastro de fornecedores (13 campos)
4. **tabelas_comissao** - Tabelas de cálculo (26 campos)
5. **consignados** - Operações de consignados (10 campos)
6. **contas_correntes** - Operações de contas correntes (16 campos)
7. **consorcios** - Operações de consórcios (8 campos)
8. **ourocap** - Operações de OuroCap (13 campos)
9. **seguros** - Operações de seguros (18 campos)
10. **pagamentos** - Histórico de pagamentos (5 campos)
11. **calculos** - Cálculos consolidados (27 campos)
12. **producao_bb** - Produção Banco do Brasil (18 campos)
13. **extratos_consignados** - Extratos de consignados (10 campos)
14. **extratos_contas** - Extratos de contas (5 campos)
15. **extratos_consorcios** - Extratos de consórcios (8 campos)
16. **extratos_ourocap** - Extratos de OuroCap (6 campos)
17. **documentacao** - Controle de documentação (15 campos)

---

## PRÓXIMOS PASSOS:
1. Executar a migração SQL
2. Implementar as APIs REST para cada módulo
3. Criar interfaces de usuário responsivas
4. Implementar as fórmulas de cálculo
5. Adicionar funcionalidades de importação/exportação

## FASE 13: MONITORAMENTO EM TEMPO REAL
- [x] Criar tabela de sessões ativas no banco de dados
- [x] Implementar API para rastrear conexões/desconexões
- [x] Implementar rastreamento de atividades (último acesso, módulo em uso)
- [x] Criar página de "Usuários Conectados" no dashboard
- [x] Implementar atualização em tempo real a cada 10 segundos
- [x] Implementar desconexão automática após 30 minutos de inatividade
- [x] Testar monitoramento em tempo real

- [x] Aba Consignado: tabela com 23 colunas, filtros, importação de planilha, cálculos automáticos
- [x] Modal de LGPD: aparecer na primeira vez que o usuário acessa após login, com registro de aceite

## FASE 14: RESUMO/TOTALIZADOR DE CONSIGNADO
- [x] Implementar filtro de Empresa (BMF ou Flex) na página Consignado
- [x] Implementar filtro de Mês/Ano na página Consignado
- [x] Criar procedure tRPC para calcular totais filtrados
- [x] Exibir Total Vr. Líquido por empresa/período
- [x] Exibir Total Comissão por empresa/período
- [ ] Testar totalizador com dados reais

## FASE 15: CÉLULAS EDITÁVEIS NA TABELA DE COMISSÃO
- [x] Implementar componente EditableCell para edição inline
- [x] Adicionar edição direta em todas as colunas da tabela
- [x] Salvar automaticamente ao sair da célula
- [x] Feedback visual com hover e validação
- [x] Testar edição inline com dados reais

## FASE 16: CÉLULAS EDITÁVEIS NA SEÇÃO DE VALORES PARA CÁLCULO
- [x] Implementar edição inline na seção "Valores para Cálculo por Nível"
- [x] Clique para editar, Enter para salvar, Escape para cancelar
- [x] Feedback visual com hover e toast de sucesso
- [x] Mover seção de Consignado para Tabela de Comissão
- [x] Formatar valores em moeda brasileira (R$)
- [x] Adicionar persistência em banco de dados
- [ ] Adicionar validação de valores (mínimo/máximo)

## FASE 17: CALCULOS NA COLUNA PERC. PAGO DO CONSIGNADO
- [x] Aguardando formula completa do usuario
- [x] Implementar logica de calculo (backend em db.ts)
- [x] Implementar cálculo automático durante importação
- [x] Corrigir atualização automática quando tabelaMes muda
- [x] Testar calculos com dados reais
- [x] Verificar se importação funciona corretamente
- [x] Validar cálculos com dados da planilha

## FASE 18: DETECCAO DE DUPLICATAS EM NR. OPERACAO
- [x] Adicionar coluna isDuplicate na tabela consignados
- [x] Criar procedure para verificar duplicatas
- [x] Implementar sinalizacao visual (vermelho/alerta)
- [x] Testar com dados duplicados
- [x] Marcar duplicatas ao carregar pagina
- [x] Marcar duplicatas apos criar/editar/excluir
- [x] Executar migração SQL no banco
- [x] Criar testes automatizados
- [x] Validar testes com sucesso


## FASE 19: RELATORIO DE PRODUCAO BB NA ABA FEBRABAN
- [x] Criar schema para tabela de relatório BB
- [x] Criar router para importar/listar relatório
- [x] Criar página Febraban com tabela
- [x] Implementar importação de arquivo Excel
- [x] Adicionar link no menu Febraban
- [x] Criar mutation para criar tabela automaticamente
- [ ] Testar com arquivo fornecido


## FASE 20: MELHORIAS NA PAGINA FEBRABAN
- [x] Adicionar botão para importar arquivo RELATORIOPRODUÇÃOBB.xlsx
- [x] Preparar planilha para facilitar futuras importações
- [x] Adicionar botão de edição para cada registro
- [x] Permitir múltiplas importações (append vs replace)
- [x] Adicionar botão para baixar template
- [x] Implementar mutations editar e deletar
- [ ] Testar fluxo completo de importação

## FASE 21: PÁGINA CÁLCULO COM DADOS AGREGADOS
- [x] Criar schema para tabela calculos com 27 campos
- [x] Criar router CRUD completo (listar, criar, editar, deletar, buscarPorChaveJ)
- [x] Implementar página Calculo.tsx com tabela horizontal
- [x] Implementar agrupamento por Chave J (uma linha por chave)
- [x] Implementar soma de todos os 23 campos numéricos
- [x] Implementar filtros em tempo real (Mês/Ano, Chave J, Nome Agente)
- [x] Implementar mês anterior pré-preenchido dinamicamente
- [x] Integrar busca automática em Consignado por Chave J e Mês/Ano
- [x] Criar 6 testes unitários (listar, criar, buscar, editar, deletar, buscar inexistente)
- [x] Validar fluxo completo via UI
- [x] Sincronização bidirecional com Consignado

## FASE 22: PÁGINA RELATÓRIOS COM FORMATAÇÃO EM MOEDA
- [x] Criar página Relatórios.tsx com formatação em moeda brasileira (R$)
- [x] Implementar agrupamento por Chave J (uma linha por chave)
- [x] Implementar soma de Vr. Líquido, SRCC e Vr. Líquido-SRCC
- [x] Implementar filtros em tempo real (Mês/Ano, Chave J, Nome Agente)
- [x] Implementar mês anterior pré-preenchido dinamicamente
- [x] Adicionar rota /relatorios ao App.tsx
- [x] Remover link "Cálculo" de Relatórios (deixar apenas em Financeiro)
- [x] Testar com dados reais (17 Chaves J únicas, 151 operações)
- [x] Validar formatação de moeda (R$ 133.854,57, etc.)
- [ ] Implementar exportação para Excel
- [ ] Implementar impressão de relatório

## MÓDULO FEBRABAN — RELATÓRIO DE PRODUÇÃO BB
- [x] Criar tabela `febraban` no schema Drizzle com colunas: empresa, mesano, proposta, linha, situacao, operador, solicitacao, prazo, troco, financiado, situacao2
- [x] Aplicar migration SQL no banco de dados
- [x] Criar router tRPC `febraban` com procedures: list, count, importar, update, delete, filtros
- [x] Importação Excel com modo "Novo" (apenas adiciona) e "Subscrever" (adiciona + atualiza por proposta)
- [x] Criar página /febraban com tabela completa de todas as colunas do relatório BB
- [x] Filtros por empresa, mês/ano, situação e operador
- [x] Botão Editar com modal de edição de todos os campos
- [x] Botão Excluir com confirmação
- [x] Paginação (100 registros por página)
- [x] Adicionar link para /febraban no card do módulo Febraban na Home

## FASE 23: FILTRO NÃO PAGOS E EXPORTAÇÃO EXCEL NO FEBRABAN
- [x] Adicionar coluna PAGO na tabela Febraban (badge verde "Pago" quando proposta existe em consignados.nrOperacao)
- [x] Adicionar procedure `naoPagos` no router febraban (retorna todos não pagos sem paginação)
- [x] Adicionar filtro `pago` (todos/sim/nao) nas procedures list e count do router febraban
- [x] Adicionar coluna ordemExcel na tabela febraban para preservar ordem original do Excel
- [x] Inserir 2.068 números de operação na tabela consignados (lotes 1-4)
- [x] Adicionar toggle "Todos / Pagos / Não Pagos" nos filtros da tela Febraban
- [x] Adicionar botão "Exportar Não Pagos" que gera Excel com abas por empresa (ordem alfabética)
- [x] Excel exportado inclui aba RESUMO com total de não pagos por empresa
- [x] Botão Voltar padronizado em todas as subabas (bg-gray-800 text-white)

## FASE 24: AJUSTES NA COLUNA PAGO DO FEBRABAN
- [x] Coluna PAGO: quando não pago → badge "Não" vermelho (em vez de ficar em branco)
- [x] Coluna PAGO: quando situação é Cancelada → badge "Cancelado" cinza (em vez de ficar em branco)

## FASE 25: MÓDULO DE PAGAMENTOS NO FINANCEIRO
- [x] Recriar tabela `pagamentos` no schema com todas as colunas do Excel (mesAno, tipoPagto, cidadeUF, empresa, chaveJ, cadastro, nomeFavorecido, banco, agencia, conta, cpfCnpj, tipoConta, pix, valor, pago, dataPagto, dataVencer, origem)
- [x] Aplicar migration SQL no banco
- [x] Criar router tRPC `pagamentos` com procedures: list, count, criar, editar, deletar, buscarAgente
- [x] Bloqueio de duplicatas (mesma chaveJ + mesAno + tipoPagto não pode ser inserida duas vezes)
- [x] Ao digitar Chave J, buscar automaticamente dados bancários do cadastro de agentes (banco, agência, conta, CPF/CNPJ, tipo conta, pix, nome favorecido)
- [x] Tipos de pagamento fixos: Comissão, Aluguel, Agua, Ajuda de Custo, Energia, Cancelado, Internet, DespesasViagem, DespesasLoja, Propaganda, Reembolso, Reajuste, Outros
- [x] Campo Pago: checkbox Sim/Não com data de pagamento
- [ ] Botão "Gerar do Sistema" para selecionar registros do módulo Cálculo e trazer para pagamento
- [ ] Importação via Excel (aba Pagtos)
- [x] Filtros: Mês/Ano, Empresa, Tipo Pagto, Pago (Sim/Não/Todos)
- [x] Exportar para Excel

## FASE 27: EXCEÇÃO DE HORÁRIO PARA SIDNEI
- [x] Verificar sistema de bloqueio de horário atual no servidor
- [x] Adicionar exceção: Sidnei Honorato Ultramare tem acesso irrestrito (qualquer dia/horário)
- [x] Exceção baseada no nome do agente no cadastro
- [x] Quando Chave J mudar, o sistema aceita o novo número automaticamente (baseado no nome, não na chave)
## FASE 28: IMPORTAR CALCULOS.XLTX
- [ ] Analisar estrutura da planilha Calculos.xltx
- [ ] Criar tabela calculos_importados no banco com as colunas corretas
- [ ] Importar todos os registros da planilha para o banco
- [ ] Atualizar tela Cálculo para exibir os dados importados

## FASE 25: REESCRITA DA PÁGINA CÁLCULO (DADOS REAIS)
- [x] Criar router calculosRouter em server/routers/calculos.ts com listar/mesesDisponiveis/empresasDisponiveis/criar/editar/deletar
- [x] Registrar calculosImportados no appRouter em server/routers.ts
- [x] Atualizar schema Drizzle com colunas tipoPagamento, comissaoSeguros, rbmSeguros
- [x] Reescrever Calculo.tsx para usar trpc.calculosImportados.listar (188 registros reais)
- [x] Exibir todas as 29 colunas da tabela calculos (incluindo tipoPagamento)
- [x] Filtros por Mês Ref (dropdown), Empresa (dropdown), Chave J, Nome Agente
- [x] Linha de totais no rodapé da tabela
- [x] Botão Exportar Excel (usando xlsx)
- [x] Botão Voltar posicionado à direita
- [x] Edição inline por linha (ícone lápis) com salvar/cancelar
- [x] Exclusão por linha (ícone lixeira) com confirmação

## FASE 26: COLUNA DT PAGTO NA TABELA CÁLCULO
- [ ] Adicionar coluna dtPagto (varchar 10) na tabela calculos no schema Drizzle
- [ ] Executar migração SQL no banco
- [ ] Adicionar coluna Dt Pagto como última coluna na tabela Cálculo (formato DD/MM/AAAA)
- [ ] Permitir edição da data no formato DD/MM/AAAA
- [ ] Atualizar router calculos com campo dtPagto

## AJUSTE: ORDENAÇÃO FEBRABAN
- [x] Febraban: ordenar por data (mesano) do maior para o menor
- [x] Febraban: novos registros inseridos aparecem no topo (mais recentes primeiro)

## PAINEL RESUMO FEBRABAN (TOPO)
- [x] Criar procedure tRPC resumo: totais por empresa (BMF/Flex) — líquido dia anterior, dia atual, contratado, pendente
- [x] Adicionar painel de cards acima do cabeçalho da tabela Febraban com os totais

## ABA AUDITORIA (NOVA)
- [ ] Schema: tabela feriados (id, data, nome, tipo: nacional/estadual, estado)
- [ ] Migration SQL aplicada via webdev_execute_sql
- [ ] Procedure tRPC: listar logs de acesso com filtros (usuário, módulo, período)
- [ ] Procedure tRPC: listar/adicionar/editar/remover feriados
- [ ] Seed: popular tabela com feriados nacionais e da Bahia (2025 e 2026)
- [ ] Página Auditoria: relatório de acessos com filtros e paginação
- [ ] Página Auditoria: tabela de feriados nacionais e BA com CRUD
- [ ] Adicionar aba Auditoria no menu principal (Home)
- [ ] Adicionar rota /auditoria no App.tsx

## EXTRATO CONSIGNADO
- [ ] Criar tabela extrato_consignado no banco (nome, nr_operacao, parcelas, convenio, juros, valor_liquido, percentual, comissao, chave_j, mes_ref)
- [ ] Criar procedure tRPC para listar extrato consignado por chaveJ e mes_ref
- [ ] Painel de identificacao no topo: ChaveJ (do log), Nome (do cadastro), Mes de referencia (mes anterior)
- [ ] Tabela com colunas: Nome, Nr. Operacao, Parcelas, Convenio, Juros, Valor Liquido, Percentual, Comissao
- [ ] Todas as 6 subabas de Extratos devem ter o painel de identificacao no topo

## FASE 29: EXTRATO CONSIGNADO (IMPLEMENTADO)
- [x] Página Extratos.tsx criada com 6 subabas (Consignado, C/C, Consórcio, Ourocap, Seguros, BB Dental)
- [x] Painel de identificação no topo de todas as subabas: ChaveJ, Nome, Mês de Referência
- [x] Extrato Consignado: busca dados da tabela consignados por chaveJ + mês anterior
- [x] Tabela com 8 colunas: Nome, Nº Operação, Parcelas, Convênio, Juros, Valor Líquido, Percentual, Comissão
- [x] Totais de Valor Líquido e Comissão no rodapé da tabela
- [x] Procedure extratoConsignado.listar corrigida (await getDb(), campos corretos)
- [x] Botão Voltar com cor escura (bg-gray-900)
- [ ] Demais 5 subabas de Extratos (C/C, Consórcio, Ourocap, Seguros, BB Dental) — aguardando colunas do usuário

## FASE 30: PRÓ RATA (Financeiro)
- [x] Tabela pro_rata criada no banco de dados
- [x] Schema Drizzle atualizado com tabela proRata
- [x] Router proRata.ts criado (list, count, importar, deletarTodos, deletar)
- [x] Página ProRata.tsx criada com tabela completa e coluna "Qtd Falta Receber"
- [x] Importação Excel (modo Novo e Subscrever)
- [x] Rota /pro-rata registrada no App.tsx
- [x] Pró Rata adicionado como submodulo no Financeiro (Home)

## FASE 31: PERSPECTIVA DE GANHO (Extratos)
- [x] Procedure febraban.perspectiva criada (filtra por ChaveJ + mês atual)
- [x] Aba "Perspectiva de Ganho" adicionada em Extratos.tsx
- [x] Demonstrativo resumido no topo (Total Operações, Líquido, Bruto, Perspectiva Comissão)
- [x] Tabela com colunas: Operação, Produto, Situação, ChaveJ, Data, Prazo, Líquido, Bruto, Perspectiva Comissão
- [x] Rodapé com totais
- [x] Mês atual (não mês anterior) como referência
- [x] Card "A Receber — Mês Anterior": corrigida query para somar comissão uma única vez por contrato (GROUP BY nrOperacao), evitando duplicação por múltiplos lançamentos

## FASE PERMISSÕES GRANULARES
- [ ] Adicionar campo JSON `permissoesModulos` no schema de agentes (migração SQL)
- [ ] Criar seção de permissões por sub-aba no formulário de cadastro/edição de agentes (visível apenas para admins)
- [ ] Aplicar restrições de acesso no frontend por sub-aba conforme permissões do agente logado
- [ ] Somente admins podem alterar permissões de outros agentes

## AJUSTES DE NOMENCLATURA
- [x] Alterar opção "ADM" para "Admin" no campo Área do formulário de agentes
- [x] Alterar opção "Vendas" para "Promotor" no campo Área do formulário de agentes
- [x] Mover botão "Voltar" para junto dos botões de ação (Importar/Novo) na página Certificações

## RESTRIÇÃO DE ACESSO - PRÓ RATA
- [x] Sub-aba "Pró Rata" (dentro de Financeiro) visível e acessível somente para CEO
- [x] Bloquear acesso na Home.tsx (não exibir o card para não-CEO)
- [x] Bloquear acesso direto via URL na página ProRata.tsx (redirecionar se não for CEO)

## TABELA DE COMISSÃO - CAMPO CÓDIGO
- [ ] Adicionar coluna "codigo" (varchar 4) no schema drizzle e migrar banco
- [ ] Adicionar coluna "Código" na tabela visual (após Empresa, antes de Convênio)
- [ ] Permitir edição inline do campo Código na tabela
- [ ] Incluir campo Código no formulário de criação de novo registro

## TABELA DE COMISSÃO - CAMPO CÓDIGO
- [ ] Adicionar coluna "codigo" (varchar 4) no schema drizzle e migrar banco
- [ ] Adicionar coluna "Código" na tabela visual (após Empresa, antes de Convênio)
- [ ] Permitir edição inline do campo Código na tabela
- [ ] Incluir campo Código no formulário de criação de novo registro
- [ ] Usar campo Código como referência para cálculos de comissão futuros

## MINHA TABELA - LÓGICA DE FAIXAS DE META
- [ ] Criar procedure no servidor para buscar total Líquido sem SRCC do mês atual por chaveJ
- [ ] Criar procedure para buscar tabela de comissão + valoresCalculo + determinar nível ativo do agente
- [ ] Implementar componente MinhaTabela no Extratos.tsx substituindo o placeholder
- [ ] Exibir somente a coluna do Ativo atingido (ocultar as demais)
- [ ] Exibir painel de identificação (chaveJ, nome, mês atual)

## PERSPECTIVA DE GANHO - CORREÇÕES
- [ ] Comissão de operações Canceladas e Pendentes deve ser R$0,00 (somente Contratadas têm comissão)
- [ ] Minha Tabela: tabela de comissão deve aparecer mesmo sem produção no mês atual
- [ ] Minha Tabela: usar mês mais recente disponível para calcular nível ativo quando não há dados do mês atual

## FASE 25: CORREÇÃO DO MINHATABEL (BUG CRÍTICO)
- [x] Diagnosticar que a tabela valoresCalculo não existia no banco de produção
- [x] Criar tabela valoresCalculo com valores padrão (R$30k a R$300k)
- [x] Corrigir formatação de percentuais no MinhaTabela (decimal → percentual legível)
- [x] Corrigir campos exibidos na tabela: usar txJurosDe/txJurosAte/valorMinimo/mesesDe/mesesAte em vez de faixa1-5
- [x] Corrigir lógica de colunaExibida: mostrar apenas a coluna do nível ativo atingido (null se não atingiu)

## FASE 26: CORREÇÕES MINHA TABELA (NÍVEL E FORMATAÇÃO)
- [x] Corrigir servidor: usar campo 'situacao' do agente (ex: Ativo03) para determinar coluna de comissão a exibir
- [x] Corrigir formatação das colunas no deploy publicado (ainda mostrando valores antigos faixa1-5)
- [x] Garantir que a produção Febraban ainda seja exibida no painel de informações

## FASE 27: DESLOGAMENTO FORÇADO PELO CEO/ADMIN
- [x] Corrigir desconectarForcado: usar banco de dados em vez de API OAuth (que retorna erro 10002)
- [x] Middleware de autenticação deve verificar se sessão foi invalidada no banco e redirecionar para login
- [x] Promover todos os Ultramare a admin para ter autonomia de deslogar usuários
- [x] Adicionar refetchInterval de 30s no useAuth para detectar deslogamento forçado automaticamente

## FASE 28: DESLOGAMENTO FORÇADO + CAPTCHA MATEMÁTICO
- [x] Corrigir deslogamento forçado: usuário deve ser redirecionado imediatamente para login
- [x] Adicionar verificação matemática no formulário de login com ChaveJ

## FASE 29: MÓDULO CRM
- [ ] Schema banco: tabelas crmClientes, crmOportunidades, crmAtendimentos, crmTarefas, crmMailing
- [ ] Procedures tRPC: CRUD para cada entidade do CRM
- [ ] Página CRM com 6 sub-abas: Clientes, Oportunidades, Atendimentos, Tarefas, Mailing, Relatórios
- [ ] Sub-aba Clientes: cadastro, busca, edição, histórico de operações
- [ ] Sub-aba Oportunidades: pipeline kanban/lista, status, agente responsável
- [ ] Sub-aba Atendimentos: registro de contatos, histórico por cliente
- [ ] Sub-aba Tarefas/Follow-up: lista de tarefas com alertas de vencimento
- [ ] Sub-aba Mailing: importação de listas, segmentação, controle de contatos
- [ ] Sub-aba Relatórios: funil de conversão, produtividade por agente

## FASE 29: MÓDULO CRM
- [x] Criar tabelas no banco: crm_clientes, crm_oportunidades, crm_atendimentos, crm_tarefas, crm_mailing_listas, crm_mailing_contatos
- [x] Criar procedures tRPC para CRUD de cada entidade
- [x] Criar página CRM com 6 sub-abas: Clientes, Oportunidades, Atendimentos, Tarefas, Mailing, Relatórios
- [x] Adicionar sub-módulos do CRM no menu da Home
- [x] Rota /crm registrada no App.tsx

## FASE 30: SEPARAÇÃO FLEX/BMF NO PRO RATA
- [x] Adicionar filtro por empresa (Todas / FLEX / BMF) na tela Pro Rata
- [x] Filtro aplicado nos totais (Total Registros, Total Financiado, Total a Receber, Parcelas Faltando)
- [x] Filtro aplicado na listagem paginada
- [x] Botões visuais com cores distintas: FLEX (azul), BMF (verde), Todas (cinza escuro)
- [x] Router proRata atualizado: endpoints list, count e totais aceitam parâmetro empresa

## FASE 31: PAGAMENTOS — DESPESAS FIXAS + LANÇAMENTO AVULSO
- [ ] Incluir despesas fixas na listagem de Pagamentos (buscar tabela despesasFixas junto com pagamentos)
- [ ] Mostrar totais unificados (pagamentos + despesas fixas) nos cards de resumo
- [ ] Adicionar opção de lançamento avulso ("Outros") sem precisar cadastrar fornecedor/beneficiário
- [ ] Formulário avulso: campos Nome, Valor, Tipo, Empresa, Mês/Ano, Observação

## BUGS IDENTIFICADOS (14/05/2026)
- [x] CORRIGIR: Pagamentos — registros com pago=true (Despesas Fixas) aparecem antes dos não pagos quando filtro "Não Pago" está ativo (campo `pago` das despesas fixas pode estar sendo retornado como 1/0 em vez de true/false)
- [x] CORRIGIR: Pagamentos — Despesas Fixas na listagem unificada não têm botões Editar/Apagar (coluna Ações mostra apenas "Desp. Fixa" como texto)
- [x] ADICIONAR: filtro busca por Nome na barra de filtros de Pagamentos
- [x] CORRIGIR: Campo DT. PAGTO nas Despesas Fixas da listagem unificada mostra mensagem de erro ao clicar — deve permitir edição inline igual aos Pagamentos
- [ ] ADICIONAR: Modal Novo Lançamento em Pagamentos — campo Pix deve aceitar também formato Boleto (código de barras), com seletor Pix/Boleto

## CAMPO PAGO NO MODAL DE EDIÇÃO DA FEBRABAN
- [x] Adicionar checkbox Pago no modal de edição da Febraban (frontend Febraban.tsx)
- [x] Adicionar campo pago: z.number().optional() no schema do update procedure (febraban.ts)
- [x] Extrair pago do input e persistir no banco com ...(pago !== undefined ? { pago } : {})
- [x] Corrigir erro TypeScript TS2353 no Febraban.tsx

## EDIÇÃO INLINE DA COLUNA PAGO NA FEBRABAN
- [ ] Coluna PAGO na tabela Febraban: clique no badge Sim/Não alterna o valor diretamente (sem abrir modal)
- [ ] Lógica: pago automático (via consignados) continua como fonte primária; campo manual pago da tabela febraban sobrepõe quando preenchido
- [ ] Badge clicável com cursor pointer e feedback visual ao salvar

## SRCC NA FEBRABAN
- [x] Coluna PAGO na tabela Febraban: badge clicável inline com 3 estados — Sim (verde), Não (vermelho), SRCC (laranja)
- [x] Campo pago na tabela febraban aceita 0=Não, 1=Sim, 2=SRCC (manual override)
- [x] Lógica: se pago automático (consignados) = 1, exibe Sim; se pago manual = 2, exibe SRCC; senão exibe Não
- [x] Resumo da Febraban: adicionar linha SRCC nos cards de totais por empresa (BMF e FLEX) com contagem e valor

## FILTRO SRCC NA FEBRABAN
- [x] Adicionar opção "SRCC" no filtro de pagamento da Febraban (ao lado de Todos/Pagos/Não Pagos)
- [x] Backend: procedure list e count aceitam pago="srcc" e filtram por pago=2

## SRCC AUTOMÁTICO VIA CONSIGNADO
- [x] Campo PAGO na Febraban: SRCC automático quando proposta existe no Consignado com restricaoSRCC=Sim
- [x] Filtro SRCC inclui operações automáticas (restricaoSRCC=Sim) e manuais (pago=2)
- [x] Card SRCC no resumo por empresa inclui operações automáticas e manuais
- [x] Override manual via clique no badge continua funcionando

## PAGO AUTOMÁTICO NA IMPORTAÇÃO DA FEBRABAN
- [x] Durante importação do Excel, consultar tabela consignados por nrOperacao e preencher pago=2 (SRCC), pago=1 (Sim) ou pago=0 (Não) automaticamente
- [x] Na importação, se o registro já existe e pago foi marcado manualmente (pagoManual != 0), não alterar o valor — só alterar se for 0 (automático/não definido)
- [x] Card SRCC no resumo BMF/FLEX: somar o ano vigente (anoWhere) e usar campo financiado (valor líquido)

## CARD CANCELADAS E CORREÇÃO CONTRATADO
- [x] Verificar e corrigir query Contratado no mês (garantir que só inclui situacao='Contratada', sem canceladas)
- [x] Adicionar card Canceladas no ano vigente nos resumos BMF e FLEX (valor troco + contagem)

## ACOMPANHAMENTO DIÁRIO (FEBRABAN)
- [x] Procedure backend: buscar operadores únicos da Febraban por empresa e mesano
- [x] Procedure backend: calcular produção por dia via Febraban (solicitacao + troco)
- [x] Procedure backend: calcular métricas por agente (dias com/sem produção, índice, total, média/dia útil)
- [x] Página AcompanhamentoDiario.tsx: seletor de mês/ano, abas BMF/FLEX
- [x] Tabela com colunas por dia do mês, valor por dia, total, aproveitamento
- [x] Ranking destacando agentes com maior aproveitamento (≥50%)
- [x] Rota /febraban/acompanhamento-diario registrada no App.tsx
- [x] Botão de acesso na página da Febraban

## CONTROLE DE ACESSO - ACOMPANHAMENTO DIÁRIO
- [x] Admin sempre tem acesso total ao Acompanhamento Diário
- [x] Demais usuários bloqueados por padrão (acesso liberado individualmente depois)
- [x] Usar campo permissoesModulos.febraban.acompanhamento-diario para controle granular (já disponível no cadastro de agentes)

## GEOLOCALIZAÇÃO
- [x] Implementar verificação de geolocalização obrigatória antes de qualquer acesso ao sistema
- [x] Bloquear acesso se usuário estiver fora do Brasil (bounding box geográfico)
- [x] Bloquear acesso se usuário negar permissão de GPS no navegador
- [x] Exibir tela de bloqueio com mensagem explicativa e botão "Tentar Novamente"
- [x] Exibir instruções de como autorizar localização no Chrome, Edge e Firefox
- [x] Testes unitários para lógica de verificação de coordenadas (12 casos)

## CONTA CORRENTE (PRODUÇÃO) - NOVO MÓDULO
- [x] Router dedicado contaCorrenteRouter com list, filtros, importar (batch 200), calcular, atualizar, excluir, enviarParaCalculo
- [x] Página ContaCorrente.tsx reescrita com padrão idêntico ao Consórcio: importação Excel, checkboxes de seleção, calcular comissão, enviar para Cálculo
- [x] Parser Excel detecta cabeçalho automaticamente (Empresa, Mês Ano, ChaveJ, Agente, RBM, Comissão etc.)
- [x] Envio para Cálculo agrupa por ChaveJ+MesAno, faz upsert em calculos.comissaoCc e rbmContaCorrente
- [x] Testes unitários (11 testes passando)

## COMISSÃO SUPERVISOR
- [x] Tabela `supervisores` criada no banco (chaveJ, nome, pctConsig, pctConsorcio, pctCc, pctOurocap, pctSeguro, pctDental)
- [x] Router `supervisores` com listar, criar, editar, excluir e calcular
- [x] Painel expandível "Comissão Supervisor" na faixa de filtros do Cálculo
- [x] Cálculo automático por supervisor baseado no RBM dos agentes vinculados pelo campo Supervisor
- [x] Modal de cadastro/edição de supervisor com % por produto
- [x] Totalizador de comissão por produto e total geral
## MELHORIAS MÓDULO CÁLCULO (SESSÃO ATUAL)
- [x] Corrigir bug JSX "Unterminated JSX contents" no Calculo.tsx (supervisores.length em vez de calcSup.length)
- [x] Auto-preenchimento do Nome ao digitar ChaveJ no modal de supervisor (usa trpc.agentes.getByChaveJ)
- [x] Enviar para Pagto: filtro por mês antes de enviar (modal de confirmação com seletor de mês)
- [x] Verificar e testar painel de Comissão Supervisor com dados reais

## RECALCULAR COMISSÃO TOTAL E EDIÇÃO INLINE CRÉD/DÉB
- [x] Edição inline de Créditos/Débitos na tabela do Cálculo (clique na célula para editar, Enter/blur para salvar)
- [x] Procedure recalcularComissaoTotal no router de calculos (fórmula: consig + consorcio + ourocap + cc + seguros + ajudaCusto + créd/déb - adiantamento; reajuste NÃO entra)
- [x] Adiantamento buscado automaticamente na tabela pagamentos (tipoPagto = 'Adto') ao recalcular
- [x] Botão 'Recalcular Totais' (âmbar) na barra de ações do Cálculo, ao lado de 'Enviar Para Pagto'
- [x] Confirmação antes de recalcular exibe a fórmula utilizada

## FASE 38: BOTÃO ENVIAR PARA CÁLCULO NO CONSIGNADO
- [x] Criar mutation enviarParaCalculo no router de consignado (backend)
- [x] Agrupar registros por chaveJ+empresa+mes, somando totalComissao
- [x] Se já existe registro em calculos para chaveJ+mesRef → atualizar comissaoConsig
- [x] Se não existe → criar novo registro com dados do agente
- [x] Botão "Enviar p/ Cálculo" (verde) na barra do Consignado
- [x] Modal com duas opções: "Enviar Todo o Mês" e "Enviar Selecionados (uma por uma)"
- [x] Feedback de quantos registros foram criados/atualizados

## FASE 39: ABA DOCUMENTAÇÃO AGENTES NO CADASTRO
- [x] Criar tabela documentosAgentes no banco (id, chaveJ, nomeAgente, empresa, tipoDocumento, descricao, arquivoUrl, arquivoKey, arquivoNome, arquivoTipo, tamanho, adicionadoPor, observacao)
- [x] Criar router tRPC: listar, buscarAgentes (autocomplete do cadastro), upload S3, deletar
- [x] Criar página DocumentacaoAgentes.tsx com tabela, filtros por Chave J/Nome/Tipo
- [x] Modal de upload com busca autocomplete de agente (Chave J + Nome buscados do cadastro)
- [x] Tipos de documento: Contrato, RG, CPF, Comprovante de Endereço, CNH, Conta Bancária, Foto 3x4, Outros
- [x] Visualização de documentos (imagem inline, PDF em iframe, link para abrir em nova aba)
- [x] Botão Voltar estilo escuro conforme padrão
- [x] Registrar rota /cadastro/documentacao-agentes no App.tsx
- [x] Adicionar card "Documentação Agentes" no grupo Cadastros da Home

## FASE: CONTROLE DE ATIVO IMOBILIZADO E UNIFORMES/CRACHÁS
- [x] Criar tabela ativosImobilizados no schema (id, descricao, categoria, numeroPatrimonio, valorAquisicao, dataAquisicao, vidaUtilAnos, depreciacao, localizacao, responsavel, situacao, observacoes, fotoUrl, fotoKey)
- [x] Criar tabela uniformesCrachas no schema (id, chaveJ, nomeAgente, tipoItem, tamanho, quantidade, dataEntrega, situacao, observacoes, fotoUrl, fotoKey)
- [x] Aplicar migration SQL no banco
- [x] Criar procedures CRUD para ativosImobilizados no routers (incluindo uploadFoto)
- [x] Criar procedures CRUD para uniformesCrachas no routers (incluindo uploadFoto)
- [x] Criar página AtivoImobilizado.tsx com listagem, cadastro, edição e upload de foto
- [x] Criar página UniformesCrachas.tsx com listagem, cadastro, edição e upload de foto
- [x] Adicionar cards no módulo Relatórios no Home.tsx
- [x] Adicionar rotas em App.tsx para as novas páginas

## FASE N: PÁGINAS DE PRODUÇÃO (OuroCap, Seguros, BB Dental)
- [x] Criar tabela `bbdental` no schema Drizzle e aplicar migration no banco
- [x] Criar router `server/routers/ourocap.ts` com CRUD completo
- [x] Criar router `server/routers/seguros.ts` com CRUD completo
- [x] Criar router `server/routers/bbdental.ts` com CRUD completo
- [x] Registrar routers no `server/routers.ts` (ourocap, seguros, bbdental)
- [x] Criar página `client/src/pages/Ourocap.tsx` com tabela, filtros e importação XLSX
- [x] Criar página `client/src/pages/Seguros.tsx` com tabela, filtros e importação XLSX
- [x] Criar página `client/src/pages/BBDental.tsx` com tabela, filtros e importação XLSX
- [x] Registrar rotas no App.tsx: /producao/ourocap, /producao/seguros, /producao/bbdental
- [x] Corrigir PageHeader em ProRata.tsx (remover onBack window.history.back)
- [x] Corrigir PageHeader em AcompanhamentoDiario.tsx (remover onBack window.history.back)
- [x] Adicionar PageHeader em DocumentacaoAgentes.tsx (remover botão Voltar antigo)

## MÓDULO CRM
- [ ] CRM: criar tabela crm no banco com todos os campos (sexo, mci_empregador, nr_cvn_13_salario, nr_cvn_consig, nr_cvn_salario, sg_uf, super, cidade, nao_perturbe, dt_inclusao, prf_depe, nr_cc, nome, dta_nasc, cpf, ddd/tel 1-10, mci, cd_idfr_bnfc, dt_primeiro_pagto, maior_limite_credito, cod_coban, campanha, agente, data, resultado, data_inserido)
- [ ] CRM: backend tRPC procedures (list com filtros/paginação, create, update, delete, exportExcel)
- [ ] CRM: página frontend com tabela horizontal scrollável, filtros (nome, CPF, agente, resultado, cidade, UF), paginação
- [ ] CRM: botão exportar Excel com todos os campos
- [ ] CRM: adicionar rota /crm no App.tsx e link no menu lateral

## SESSÃO 29/05/2026 — AJUSTES E NOVOS MÓDULOS
- [x] Relatório RBM × Despesas: adicionar PageHeader com logo e botão Voltar
- [x] Relatório RBM × Despesas: tabela compacta sem scroll horizontal
- [x] Home: mover Pró Rata do grupo Financeiro para o grupo Auditoria
- [x] Home: adicionar RBM × Despesas também no grupo Auditoria
- [x] Home: adicionar card Extratos Bancários no grupo Financeiro
- [x] Criar tabelas contasBancarias e extratosBancarios no banco
- [x] Criar router tRPC extratosBancarios com CRUD completo
- [x] Criar página ExtratosBancarios.tsx com gestão de contas e lançamentos
- [x] Registrar rota /extratos-bancarios no App.tsx
- [x] Auditoria: corrigir bug de sessões "em andamento" — registrar horárioSaida no logout

## FASE X: CONSULTA DE AGÊNCIAS BB
- [x] Importar 3.983 agências do Banco do Brasil do arquivo Excel (tabela `agencias_bb`)
- [x] Criar router tRPC `agenciasBb` com procedures: buscar (por prefixo/nome) e total
- [x] Registrar router no appRouter (server/routers.ts)
- [x] Criar página `/agencias-bb` com filtro por número (prefixo) e por nome
- [x] Registrar rota no App.tsx
- [x] Adicionar link "Agências BB" no menu Home.tsx (seção CRM)
- [x] Hook use-debounce criado para filtro em tempo real (300ms)
- [x] TypeScript sem erros

## SESSÃO ATUAL — CONTINUAÇÃO DA PERSPECTIVA DE GANHO
- [x] Corrigir erro TypeScript linha 720 em febraban.ts (campos decimal troco/financiado → String())
- [x] Reescrever procedimento perspectiva para usar APENAS contratos PDF como fonte principal
- [x] Cruzar situação do contrato com Febraban (prioridade) + campo manual (fallback) + 'Pendente'
- [x] Retornar novos campos: nomeCliente, cpfCliente, taxaJuros, prazoMeses, valorSolicitado, temPdf, temFebraban
- [x] Atualizar frontend PerspectivadeGanho para exibir novos campos (Cliente/CPF, Taxa, Prazo, Valor, badges PDF/FEB)
- [x] Adicionar campo situacao (VARCHAR 50) na tabela contratos via ALTER TABLE
- [x] Atualizar schema Drizzle com campo situacao na tabela contratos
- [x] Adicionar campo situacao na mutation atualizar do router contratos
- [x] Adicionar select de Situação Manual no formulário de edição de contratos (Contratada/Cancelada/Pendente)
- [x] Restrição de menu para promotores: mostrar apenas Meu Painel, CRM e Extratos

## PERSPECTIVA DE GANHO — CORREÇÕES (sessão atual)
- [x] Corrigir filtro de período: usar último dia útil do mês anterior → penúltimo dia útil do mês atual (usando tabela feriados)
- [x] Remover filtro por mes/ano fixo — backend calcula período vigente automaticamente
- [x] Exibir período vigente no frontend (banner informativo com datas início/fim)
- [x] Permitir editar situação inline clicando no badge (qualquer situação: Pendente, Contratada, Cancelada)
- [x] Salvar situação manual via mutation contratos.atualizar e recarregar perspectiva
- [x] Confirmar que todos os contratos já têm PDF (fileKey NOT NULL — não precisa filtrar)

## CORREÇÕES 08/06/2026
- [x] Corrigir totais do Consignado: tela inicializa com o mês mais recente selecionado automaticamente, evitando soma de todos os meses

## NÃO PERTUBE - IMPORTAÇÃO COM UPSERT (08/06/2026)
- [x] Expandir tabela lista_nao_perturbe com colunas: nome, cpf, municipio, uf, ocupacao, dataInclusao
- [x] Implementar importação com upsert por CPF (sobrescreve se já existir)
- [x] Atualizar frontend da aba Não Pertube para mostrar novas colunas e botão de importar XLSX
- [x] Criar e entregar template XLSX para importação
