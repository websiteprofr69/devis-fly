// backend/src/routes/users.routes.js
import { Router } from 'express';
import { listUsers, getUserDetail } from '../controllers/usersController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = Router();
router.get('/', protect, adminOnly, listUsers);
router.get('/:id', protect, adminOnly, getUserDetail);

export default router;
