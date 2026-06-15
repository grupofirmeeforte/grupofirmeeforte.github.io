import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req: any, file: any, cb: any) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

router.post("/", upload.single("arquivo"), (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ erro: "Nenhum arquivo enviado" });
  }
  res.json({
    msg: "Upload feito!",
    arquivo: req.file.filename
  });
});

// Rota para listar arquivos
router.get("/", (req: Request, res: Response) => {
  try {
    const uploadsDir = path.join(process.cwd(), "uploads");
    
    // Criar pasta se não existir
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const files = fs.readdirSync(uploadsDir);
    
    const filesList = files.map((file) => {
      const filePath = path.join(uploadsDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        nome: file,
        tamanho: stats.size,
        tamanhoFormatado: `${(stats.size / 1024).toFixed(2)} KB`,
        dataCriacao: stats.birthtime,
        dataModificacao: stats.mtime,
        dataModificacaoFormatada: stats.mtime.toLocaleString('pt-BR')
      };
    });
    
    res.json({
      total: filesList.length,
      caminhoAbsoluto: uploadsDir,
      arquivos: filesList
    });
  } catch (error: any) {
    res.status(500).json({ erro: error.message });
  }
});

export default router;
