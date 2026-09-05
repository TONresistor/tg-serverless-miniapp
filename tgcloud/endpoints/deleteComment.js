import { endpoint } from '../lib/endpoint.js';
import { deleteComment } from '../lib/content/write.js';
export default endpoint(deleteComment, { admin: true });
