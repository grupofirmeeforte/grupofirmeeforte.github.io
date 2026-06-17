/**
 * Converte qualquer formato de Mês/Ano para "MM/AAAA"
 *
 * Aceita:
 *  - número ou string numérica compacta AAAAMM: 202605 → "05/2026"
 *  - número ou string numérica compacta MMA: 526 → "05/2026" (mês 5, ano 26)
 *  - número ou string numérica compacta MMAA: 1025 → "10/2025" (mês 10, ano 25)
 *  - já formatado "MM/AAAA": "05/2026" → "05/2026"
 *  - Date JS: usa mês+ano do objeto
 *
 * Retorna "-" se não conseguir converter.
 */
export function formatMesAno(v: string | number | null | undefined): string {
  if (v == null || v === "" || v === "NULL") return "-";

  // Já está no formato MM/AAAA
  if (typeof v === "string" && /^\d{2}\/\d{4}$/.test(v.trim())) return v.trim();

  // Número ou string numérica compacta
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!isNaN(n) && n > 0) {
    const s = String(n);
    
    // Formato AAAAMM (6 dígitos): ex: 202605 = ano 2026, mês 05
    if (s.length === 6) {
      const ano = s.slice(0, 4);
      const mes = s.slice(4, 6);
      return `${mes}/${ano}`;
    }
    
    // Formato MMAA (4 dígitos): ex: 1025 = mês 10, ano 25
    // Formato MMA (3 dígitos): ex: 526 = mês 5, ano 26
    // Distinguir: se tem 4 dígitos, assume MMAA; se tem 3, assume MMA
    if (s.length === 4) {
      // MMAA: primeiros 2 dígitos são mês, últimos 2 são ano
      const mes = s.slice(0, 2);
      const ano = "20" + s.slice(2, 4);
      return `${mes}/${ano}`;
    }
    
    if (s.length === 3) {
      // MMA: primeiro dígito é mês, últimos 2 são ano
      const mes = s.slice(0, 1).padStart(2, "0");
      const ano = "20" + s.slice(1, 3);
      return `${mes}/${ano}`;
    }
  }

  return "-";
}

/**
 * Converte "MM/AAAA" de volta para número compacto
 * Retorna no formato AAAAMM (ex: "05/2026" → 202605)
 * Útil para filtros que precisam do valor numérico.
 */
export function mesAnoToNum(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const m = v.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mes = parseInt(m[1]);
    const ano = parseInt(m[2]);
    // Retorna no formato AAAAMM
    return ano * 100 + mes;
  }
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}
