// backend/src/routes/pricing.routes.js
import { Router } from 'express';
import { getPricingGrid, updatePricingRow, createPricingRow, deletePricingRow, getRegions } from '../controllers/pricingController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
const router = Router();
router.get('/', protect, adminOnly, getPricingGrid);
router.get('/regions', protect, adminOnly, getRegions);
router.post('/', protect, adminOnly, createPricingRow);
router.put('/:id', protect, adminOnly, updatePricingRow);
router.delete('/:id', protect, adminOnly, deletePricingRow);
export default router;
