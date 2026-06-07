// backend/src/routes/quote.routes.js
import { Router } from 'express';
import { saveQuote, listQuotes, getQuote, updateQuote, updateQuoteStatus, deleteQuote } from '../controllers/quoteController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = Router();
router.post('/', protect, saveQuote);
router.get('/', protect, listQuotes);
router.get('/:id', protect, getQuote);
router.put('/:id', protect, updateQuote);
router.patch('/:id/status', protect, updateQuoteStatus);
router.delete('/:id', protect, deleteQuote);
export default router;
