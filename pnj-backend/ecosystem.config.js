'use strict'

module.exports = {
  apps: [
    {
      name:                'pnj-backend',
      script:              'server.js',
      instances:           2,
      exec_mode:           'cluster',
      max_memory_restart:  '500M',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name:                'pnj-pdf-worker',
      script:              'src/workers/pdfWorker.js',
      instances:           1,
      exec_mode:           'fork',
      max_memory_restart:  '800M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
