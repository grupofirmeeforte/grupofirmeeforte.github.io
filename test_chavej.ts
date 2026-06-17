import { PDFParse } from 'pdf-parse';
import { readFileSync } from 'fs';

async function testar(arquivo: string) {
  console.log('\n========== TESTANDO:', arquivo, '==========');
  const buffer = readFileSync(arquivo);
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8);
  const parsed = await parser.getText();
  const texto = parsed.text;

  console.log('--- PRIMEIRAS 40 LINHAS ---');
  const linhas = texto.split('\n');
  linhas.slice(0, 40).forEach((l: string, i: number) => console.log(i, JSON.stringify(l)));

  let chaveJOperador: string | null = null;
  const idxChave = linhas.findIndex((l: string) => l.trim() === 'Chave');
  console.log('\nidxChave:', idxChave);
  if (idxChave >= 0) {
    for (let j = idxChave + 1; j < Math.min(idxChave + 20, linhas.length); j++) {
      const val = linhas[j].trim();
      console.log('  linha', j, ':', JSON.stringify(val));
      if (!val || /^(CPF|Operador|Chave|Correspondente|Loja|Nome|Dados)/i.test(val)) continue;
      if (/^[A-Z]{1,3}\d{4,}$/i.test(val)) {
        chaveJOperador = val.toUpperCase();
        console.log('  ENCONTROU:', chaveJOperador);
        break;
      }
    }
  }
  if (!chaveJOperador) {
    const m = texto.match(/\b([A-Z]{1,3}\d{6,9})\b/);
    if (m) { chaveJOperador = m[1].toUpperCase(); console.log('FALLBACK:', chaveJOperador); }
  }
  console.log('RESULTADO FINAL:', chaveJOperador);
}

testar('/home/ubuntu/upload/Proposta-180571954.pdf')
  .then(() => testar('/home/ubuntu/upload/Proposta-208870431.pdf'))
  .catch(console.error);
