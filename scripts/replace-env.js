const fs = require('fs');
const path = require('path');

// Hole die Variable von Vercel/Node-Umgebung
const remoteUrl = process.env.COUCHDB_REMOTE_URL || 'http://localhost:5984/sonnenhof_db';

// Bereite das Environment-File für Produktion vor
const content = `
export const environment = {
  production: true,
  couchdb: {
    remoteUrl: '${remoteUrl}'
  }
};
`;

fs.writeFileSync(path.join(__dirname, '../src/environments/environment.prod.ts'), content.trim());
console.log('✅ COUCHDB_REMOTE_URL injected in environment.prod.ts');
