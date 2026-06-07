// backend/src/routes/auth.routes.js
import { Router } from 'express';
import { register, login, me, getTemplate, saveTemplate } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = Router();
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.get('/template', protect, getTemplate);
router.put('/template', protect, saveTemplate);
export default router;
