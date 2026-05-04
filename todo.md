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
