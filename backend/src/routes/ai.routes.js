// backend/src/routes/ai.routes.js
import { Router } from 'express';
import { generateFromPrompt } from '../controllers/aiController.js';
const router = Router();
router.post('/generate', generateFromPrompt);
export default router;
