module.exports = {
    mode: 'modules',
    out: 'docs',
    exclude: ['**/test/**', '**/apollo-server-*/**'],
    theme: 'default',
    name: 'Nestjs ACL Documentation',
    ignoreCompilerErrors: false,
    excludeExternals: true,
    excludePrivate: false,
    excludeNotExported: false,
    target: 'ES6',
    moduleResolution: 'node',
    preserveConstEnums: true,
    stripInternal: false,
    suppressExcessPropertyErrors: true,
    suppressImplicitAnyIndexErrors: true,
    module: 'commonjs',
    hideGenerator: true
};
