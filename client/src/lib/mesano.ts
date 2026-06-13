/**
 * Converte qualquer formato de Mês/Ano para "MM/AAAA"
 *
 * Aceita:
 *  - número AAAAMM (novo formato): 202605 → "05/2026"
 *  - número compacto antigo: 526 → "05/2026", 1025 → "10/2025"
 *  - já formatado "MM/AAAA": "05/2026" → "05/2026"
 *  - Date JS: usa mês+ano do objeto
 *
 * Retorna "-" se não conseguir converter.
 */
export function formatMesAno(v: string | number | null | undefined): string {
  if (v == null || v === "" || v === "NULL") return "-";

  // Já está no formato MM/AAAA
  if (typeof v === "string" && /^\d{2}\/\d{4}$/.test(v.trim())) return v.trim();

  // Número ou string numérica
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!isNaN(n) && n > 0) {
    // Formato AAAAMM (6 dígitos, ex: 202605)
    if (n >= 200000) {
      const ano = Math.floor(n / 100);
      const mes = n % 100;
      return `${String(mes).padStart(2, "0")}/${ano}`;
    }
    // Formato antigo compacto MMA ou MMAA (3-4 dígitos, ex: 526 ou 1025)
    const s = String(n);
    const mes = s.slice(0, s.length - 2).padStart(2, "0");
    const ano = "20" + s.slice(-2);
    return `${mes}/${ano}`;
  }

  return "-";
}

/**
 * Converte "MM/AAAA" de volta para número AAAAMM (ex: "05/2026" → 202605)
 * Útil para filtros que precisam do valor numérico.
 */
export function mesAnoToNum(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const m = v.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mes = parseInt(m[1]);
    const ano = parseInt(m[2]);
    return ano * 100 + mes; // formato AAAAMM
  }
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}
