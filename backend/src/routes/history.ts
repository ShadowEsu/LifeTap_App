import { Router, Request, Response } from 'express';

const router = Router();

// Export history
router.get('/export', async (req: Request, res: Response) => {
  res.json([]);
});

// Get statistics
router.get('/statistics', async (req: Request, res: Response) => {
  res.json({
    total_alerts: 0,
    avg_risk_level: 'medium',
    verified_contacts: 0,
  });
});

export default router;
