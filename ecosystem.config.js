const path = require('path');

module.exports = {
    apps: [
        {
            name: '3vidya',
            cwd: '.',
            script: path.join(__dirname, '.next', 'standalone', '3VidyaNew', 'server.js'),
            instances: 1,
            exec_mode: 'fork',
            env: {
                NODE_ENV: 'production',
                PORT: 4401,
                HOSTNAME: '0.0.0.0'
            },
        },
    ],
};
