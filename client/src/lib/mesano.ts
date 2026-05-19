/**
 * Converte qualquer formato de Mês/Ano para "MM/AAAA"
 *
 * Aceita:
 *  - número ou string numérica compacta: 526 → "05/2026", 1025 → "10/2025"
 *  - já formatado "MM/AAAA": "05/2026" → "05/2026"
 *  - Date JS: usa mês+ano do objeto
 *
 * Retorna "-" se não conseguir converter.
 */
export function formatMesAno(v: string | number | null | undefined): string {
  if (v == null || v === "" || v === "NULL") return "-";

  // Já está no formato MM/AAAA
  if (typeof v === "string" && /^\d{2}\/\d{4}$/.test(v.trim())) return v.trim();

  // Número ou string numérica compacta (ex: 526, "526", 1025, "1025")
  const n = typeof v === "number" ? v : parseInt(String(v).trim(), 10);
  if (!isNaN(n) && n > 0) {
    const s = String(n);
    // 3 dígitos: M + AA  → ex: 526 = mês 5, ano 26
    // 4 dígitos: MM + AA → ex: 1025 = mês 10, ano 25
    const mes = s.slice(0, s.length - 2).padStart(2, "0");
    const ano = "20" + s.slice(-2);
    return `${mes}/${ano}`;
  }

  return "-";
}

/**
 * Converte "MM/AAAA" de volta para número compacto (ex: "05/2026" → 526)
 * Útil para filtros que precisam do valor numérico.
 */
export function mesAnoToNum(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const m = v.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mes = parseInt(m[1]);
    const ano = parseInt(m[2]) % 100;
    return mes * 100 + ano;
  }
  const n = parseInt(v, 10);
  return isNaN(n) ? undefined : n;
}
