import { endpoint } from '../lib/endpoint.js';
import { init } from '../lib/init.js';
export default endpoint(init, { drainNotifications: false });
