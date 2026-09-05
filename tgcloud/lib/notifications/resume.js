import { configuration } from '../config.js';
import { drain, notificationStats } from './queue.js';
// CLI-only recovery entry point; lib modules are never public endpoints.
export default async function () {
  return {
    ...(await drain(await configuration())),
    ...(await notificationStats()),
  };
}
