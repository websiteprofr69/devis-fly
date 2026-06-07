// backend/src/routes/pricing.routes.js
import { Router } from 'express';
import { getPricingGrid, updatePricingRow, createPricingRow, deletePricingRow, getRegions } from '../controllers/pricingController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = Router();
router.get('/', protect, getPricingGrid);
router.get('/regions', protect, getRegions);
router.post('/', protect, createPricingRow);
router.put('/:id', protect, updatePricingRow);
router.delete('/:id', protect, deletePricingRow);
export default router;
