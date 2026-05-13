import { useAuth } from "@/hooks/useAuth";

export type NivelPermissao = 'sem_acesso' | 'leitura' | 'editar' | 'admin';

/**
 * Hook para verificar permissões do usuário logado por módulo e sub-aba.
 * Admin e CEO têm acesso total independente das permissões configuradas.
 */
export function usePermissao() {
  const { user } = useAuth();
  const permissoes = (user as any)?.permissoes ?? 'leitor';
  const cargo = (user as any)?.cargo ?? '';
  const permissoesModulosRaw = (user as any)?.permissoesModulos ?? null;

  // Admin e CEO têm acesso total
  const isAdminOuCeo = permissoes === 'admin' || cargo === 'CEO';

  let permissoesMap: Record<string, Record<string, NivelPermissao>> = {};
  if (permissoesModulosRaw) {
    try {
      permissoesMap = JSON.parse(permissoesModulosRaw);
    } catch {}
  }

  /**
   * Retorna o nível de permissão para um módulo/sub-aba específico.
   * Admin e CEO sempre retornam 'admin'.
   */
  function getNivel(modulo: string, subaba: string): NivelPermissao {
    if (isAdminOuCeo) return 'admin';
    return permissoesMap[modulo]?.[subaba] ?? (permissoes as NivelPermissao) ?? 'leitura';
  }

  /** Pode visualizar (leitura, editar ou admin) */
  function podeVer(modulo: string, subaba: string): boolean {
    const nivel = getNivel(modulo, subaba);
    return nivel !== 'sem_acesso';
  }

  /** Pode editar (editar ou admin) */
  function podeEditar(modulo: string, subaba: string): boolean {
    const nivel = getNivel(modulo, subaba);
    return nivel === 'editar' || nivel === 'admin';
  }

  /** É admin neste módulo/sub-aba */
  function isAdmin(modulo?: string, subaba?: string): boolean {
    if (isAdminOuCeo) return true;
    if (!modulo || !subaba) return permissoes === 'admin';
    return getNivel(modulo, subaba) === 'admin';
  }

  return { getNivel, podeVer, podeEditar, isAdmin, isAdminOuCeo, permissoes, cargo };
}
