import { parse } from 'acorn';
const unsupported = new Set([
  'process',
  'Buffer',
  'require',
  'setTimeout',
  'setInterval',
]);
function inspect(node, imports) {
  if (
    [
      'ImportDeclaration',
      'ExportNamedDeclaration',
      'ExportAllDeclaration',
    ].includes(node.type) &&
    node.source
  )
    imports.push(node.source.value);
  if (node.type === 'ImportExpression') {
    if (node.source.type !== 'Literal' || typeof node.source.value !== 'string')
      throw new Error('Dynamic imports must use literal module paths');
    imports.push(node.source.value);
  }
  if (node.type === 'Identifier' && unsupported.has(node.name))
    throw new Error(`Unsupported runtime identifier: ${node.name}`);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) {
      for (const child of value) if (child?.type) inspect(child, imports);
    } else if (value?.type) inspect(value, imports);
  }
}
export function importsFor(source) {
  const imports = [];
  inspect(
    parse(source, { ecmaVersion: 'latest', sourceType: 'module' }),
    imports,
  );
  return imports;
}
