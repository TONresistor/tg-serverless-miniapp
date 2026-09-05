// A small DDL adapter for testing our actual schema on SQLite. This is not a
// Telegram runtime emulator; SDK/runtime compatibility needs a tgcloud run.
const identifier = (name) => '"' + name.replaceAll('"', '""') + '"';
class Column {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.modifiers = [];
  }
  primaryKey(options = {}) {
    this.modifiers.push(
      'PRIMARY KEY' + (options.autoIncrement ? ' AUTOINCREMENT' : ''),
    );
    return this;
  }
  notNull() {
    this.modifiers.push('NOT NULL');
    return this;
  }
  default(value) {
    this.modifiers.push(
      'DEFAULT ' +
        (value?.sql ??
          (typeof value === 'number'
            ? value
            : "'" + String(value).replaceAll("'", "''") + "'")),
    );
    return this;
  }
}
export const integer = (name) => new Column(name, 'INTEGER');
export const text = (name) => new Column(name, 'TEXT');
export const json = (name) => {
  const column = text(name),
    method = column.default.bind(column);
  column.default = (value) => method(JSON.stringify(value));
  return column;
};
export function sql(strings, ...values) {
  return {
    sql: strings.reduce(
      (s, part, i) =>
        s +
        part +
        (i < values.length
          ? values[i] instanceof Column
            ? identifier(values[i].name)
            : String(values[i])
          : ''),
      '',
    ),
  };
}
export const index = (name) => ({
  on(...columns) {
    return { name, columns, unique: false };
  },
});
export const uniqueIndex = (name) => ({
  on(...columns) {
    return { name, columns, unique: true };
  },
});
export const check = (name, expression) => ({ name, expression });
export function table(name, columns, extra = () => ({})) {
  const extras = Object.values(extra(columns));
  return {
    name,
    ddl: [
      `CREATE TABLE ${identifier(name)} (${[
        ...Object.values(columns).map(
          (c) => `${identifier(c.name)} ${c.type} ${c.modifiers.join(' ')}`,
        ),
        ...extras
          .filter((e) => e.expression)
          .map(
            (e) =>
              `CONSTRAINT ${identifier(e.name)} CHECK (${e.expression.sql})`,
          ),
      ].join(',')})`,
      ...extras
        .filter((e) => e.columns)
        .map(
          (e) =>
            `CREATE ${e.unique ? 'UNIQUE ' : ''}INDEX ${identifier(e.name)} ON ${identifier(name)} (${e.columns.map((c) => identifier(c.name)).join(',')})`,
        ),
    ],
  };
}
