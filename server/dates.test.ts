import { describe, it, expect } from "vitest";

/**
 * Função para formatar data YYYY-MM-DD para DD/MM/YYYY
 * Mesmo padrão usado no frontend
 */
const formatDateString = (dateStr: string): string => {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

describe("Date Formatting", () => {
  it("should format YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(formatDateString("1970-08-27")).toBe("27/08/1970");
    expect(formatDateString("2026-05-04")).toBe("04/05/2026");
    expect(formatDateString("1990-12-25")).toBe("25/12/1990");
  });

  it("should handle empty strings", () => {
    expect(formatDateString("")).toBe("-");
  });

  it("should preserve date values without timezone conversion", () => {
    // Test that 27th stays as 27th, not converted to 26th
    const dateStr = "1970-08-27";
    const formatted = formatDateString(dateStr);
    expect(formatted).toBe("27/08/1970");
    expect(formatted).not.toBe("26/08/1970");
  });

  it("should handle dates as pure strings without Date object conversion", () => {
    // This is the key test: we should never use new Date() with these strings
    // because new Date('1970-08-27') interprets it as UTC and causes timezone shifts
    const dateStr = "1970-08-27";
    
    // ❌ Wrong way (causes timezone shift):
    // const wrongDate = new Date(dateStr).toLocaleDateString('pt-BR');
    
    // ✅ Correct way (pure string manipulation):
    const correctDate = formatDateString(dateStr);
    
    expect(correctDate).toBe("27/08/1970");
  });

  it("should work with various dates without timezone issues", () => {
    const testDates = [
      { input: "2000-01-01", expected: "01/01/2000" },
      { input: "2000-12-31", expected: "31/12/2000" },
      { input: "1999-02-28", expected: "28/02/1999" },
      { input: "2020-02-29", expected: "29/02/2020" }, // leap year
    ];

    testDates.forEach(({ input, expected }) => {
      expect(formatDateString(input)).toBe(expected);
    });
  });
});
