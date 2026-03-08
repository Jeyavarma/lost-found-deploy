module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.test.js'],
    setupFiles: ['dotenv/config'],
    globals: {
        'process.env.NODE_ENV': 'test'
    }
};
