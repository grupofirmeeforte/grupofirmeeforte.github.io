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
