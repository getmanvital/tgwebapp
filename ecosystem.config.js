module.exports = {
  apps: [{
    name: 'tgwebapp-backend',
    script: './backend/dist/server.js',
    cwd: process.cwd(),
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    // Post-deploy hook для автоматической настройки webhook
    post_update: ['bash scripts/post-deploy.sh']
  }],
  
  deploy: {
    production: {
      // Настройки для деплоя через PM2 (опционально)
      // Раскомментируйте и настройте если используете pm2 deploy
      // user: 'deploy',
      // host: 'your-server.com',
      // ref: 'origin/main',
      // repo: 'git@github.com:username/repo.git',
      // path: '/var/www/tgwebapp',
      // 'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js && bash scripts/post-deploy.sh'
    }
  }
};

