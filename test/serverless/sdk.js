import { DatabaseSync } from 'node:sqlite';
export let sqlite;
export let sent = [];
export let apiOverride = {};
export function reset(schema) {
  sqlite?.close();
  sqlite = new DatabaseSync(':memory:');
  sent = [];
  apiOverride = {};
  for (const definition of Object.values(schema))
    for (const sql of definition.ddl) sqlite.exec(sql);
}
function statement(query) {
  const stmt = sqlite.prepare(query);
  stmt.setAllowUnknownNamedParameters(false);
  return stmt;
}
export const db = {
  async run(query, params = {}) {
    if (/RETURNING\b/i.test(query)) {
      const rows = statement(query).all(params);
      return {
        rows,
        rowsAffected: rows.length,
        lastInsertRowid: rows[0]?.id ?? 0,
      };
    }
    // Trigger definitions are a single exec statement containing a body.
    if (/^CREATE TRIGGER/i.test(query.trim())) {
      sqlite.exec(query);
      return { rows: [], rowsAffected: 0 };
    }
    const result = statement(query).run(params);
    return {
      rows: [],
      rowsAffected: Number(result.changes),
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  },
  async get(query, params = {}) {
    return statement(query).get(params) ?? null;
  },
  async all(query, params = {}) {
    return statement(query).all(params);
  },
};
export class EndpointError extends Error {
  constructor(message, parameters) {
    super(message);
    this.parameters = parameters;
  }
}
export const api = new Proxy(
  {},
  {
    get(_target, method) {
      return async (input) => {
        if (apiOverride[method]) return apiOverride[method](input);
        if (method === 'getMe') return { username: 'MTONGAtestbot' };
        if (method === 'sendMessage') {
          sent.push(input);
          return { message_id: sent.length };
        }
        if (method === 'getUserProfilePhotos')
          return { photos: [[{ file_id: 'photo' }]] };
        if (method === 'getFileContent')
          return new Uint8Array([255, 216, 255, 217]);
        if (method === 'savePreparedInlineMessage') return { id: 'prepared' };
        throw new Error(`Unsupported Telegram API method: ${String(method)}`);
      };
    },
  },
);
export function overrideAPI(overrides) {
  apiOverride = overrides;
}
