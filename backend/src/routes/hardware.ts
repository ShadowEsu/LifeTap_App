import { Router, Request, Response } from 'express';

const router = Router();

// Register device
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    res.json({ device_id: 'rpi-001', device_token: 'mock-device-token' });
  } catch (error) {
    res.status(500).json({ error: 'Device registration failed' });
  }
});

// Heartbeat
router.post('/heartbeat', async (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Get device config
router.get('/:deviceId/config', async (req: Request, res: Response) => {
  res.json({ device_id: req.params.deviceId, config: {} });
});

// Report device error
router.post('/:deviceId/error', async (req: Request, res: Response) => {
  res.json({ received: true });
});

export default router;
