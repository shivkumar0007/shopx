import express from "express";
import { chatWithAI, searchProductsByImage } from "../controllers/aiController.js";

const router = express.Router();

router.post("/chat", chatWithAI);
router.post("/image-search", searchProductsByImage);

export default router;
