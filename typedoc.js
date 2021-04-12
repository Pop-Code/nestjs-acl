module.exports = {
    out: 'docs',
    entryPoints: ['src/index.ts'],
    exclude: ['**/test/**', '**/apollo-server-*/**'],
    theme: 'default',
    name: 'Nestjs ACL Documentation',
    excludeExternals: false,
    excludePrivate: false,
    hideGenerator: true
};
