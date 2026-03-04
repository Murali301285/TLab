const path = require('path');

module.exports = {
    apps: [
        {
            name: '3vidya-platform', // Updated name
            cwd: '.',
            script: 'npm',
            args: 'start', // Runs 'next start'
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
                HOSTNAME: '0.0.0.0'
            },
        },
    ],
};
