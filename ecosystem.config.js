module.exports = {
    apps: [
      {
        name: 'production-flask',
        script: 'gunicorn',
        interpreter: 'python3',
        args: 'api:app --bind 0.0.0.0:8000 --workers 4 --timeout 600',
        cwd: '/app/api',
        env: {
          FLASK_ENV: 'production'
        },
        log_file: '/app/api/temp/logs/production-flask.log',
        error_file: '/app/api/temp/logs/production-flask.error.log',
        out_file: '/app/api/temp/logs/production-flask.out.log'
      },
      {
        name: 'production-nextjs',
        script: 'npm',
        args: 'run start',
        cwd: '/app/frontend',
        env: {
          NODE_ENV: 'production',
          PORT: 3000,
          BACKEND_URL: 'http://localhost:8000'
        },
        log_file: '/app/api/temp/logs/production-nextjs.log',
        error_file: '/app/api/temp/logs/production-nextjs.error.log',
        out_file: '/app/api/temp/logs/production-nextjs.out.log'
      }
    ]
  };