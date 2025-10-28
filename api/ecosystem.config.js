module.exports = {
  apps: [{
    name: 'hub-verdi-api',
    script: 'server.js',
    cwd: '/var/www/autoplan-api',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/var/log/hub-verdi/error.log',
    out_file: '/var/log/hub-verdi/out.log',
    log_file: '/var/log/hub-verdi/combined.log',
    time: true,
    max_restarts: 10,
    restart_delay: 5000
  }]
};