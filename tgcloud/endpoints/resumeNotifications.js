import { endpoint } from '../lib/endpoint.js';
import { drain, notificationStats } from '../lib/notifications/queue.js';
export default endpoint(
  async (_input, { config }) => ({
    ...(await drain(config)),
    ...(await notificationStats()),
  }),
  { admin: true },
);
