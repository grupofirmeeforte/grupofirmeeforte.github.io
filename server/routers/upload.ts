import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";

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

export default router;
