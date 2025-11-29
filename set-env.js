// const fs = require('fs');
// const path = require('path');

// // Load environment variables
// // Im Vercel-Build nutzen wir den Proxy "/couchdb", lokal die direkte URL oder Env Var
// const remoteUrlProd = '/couchdb';
// const remoteUrlDev = process.env.COUCHDB_REMOTE_URL || 'http://admin:server-lukas@0.tcp.eu.ngrok.io:18846/sonnenhof_db';

// // Configure the content for the environment files
// const envConfigFile = `export const environment = {
//     production: true,
//     couchdb: {
//         remoteUrl: '${remoteUrlProd}'
//     }
// };
// `;

// const envConfigFileDev = `export const environment = {
//     production: false,
//     couchdb: {
//         remoteUrl: '${remoteUrlDev}'
//     }
// };
// `;

// // Paths to the environment files
// const targetPath = path.join(__dirname, 'src/environments/environment.prod.ts');
// const targetPathDev = path.join(__dirname, 'src/environments/environment.ts');

// // Write the files
// fs.writeFileSync(targetPath, envConfigFile);
// fs.writeFileSync(targetPathDev, envConfigFileDev);

// console.log(`Output generated at ${targetPath}`);
// console.log(`Output generated at ${targetPathDev}`);
