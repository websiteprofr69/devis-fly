// backend/src/routes/quote.routes.js
import { Router } from 'express';
import { saveQuote, listQuotes, getQuote, updateQuoteStatus, deleteQuote } from '../controllers/quoteController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = Router();
router.post('/', saveQuote);
router.get('/', protect, listQuotes);
router.get('/:id', protect, getQuote);
router.patch('/:id/status', protect, updateQuoteStatus);
router.delete('/:id', protect, deleteQuote);
export default router;
