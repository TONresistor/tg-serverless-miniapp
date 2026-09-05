import { endpoint } from '../lib/endpoint.js';
import { deleteContent } from '../lib/content/write.js';
export default endpoint(deleteContent, { admin: true });
