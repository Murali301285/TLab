module.exports = { 
  apps: [{ 
    name: 'tlab-platform', 
    script: 'server.js', 
    instances: 1, 
    exec_mode: 'fork', 
    env: { 
      NODE_ENV: 'production', 
      PORT: 5001, 
      HOSTNAME: '0.0.0.0' 
    } 
  }] 
}; 
