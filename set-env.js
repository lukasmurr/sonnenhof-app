// const fs = require('fs');
// const path = require('path');

// // Load environment variables
// const remoteUrl = process.env.COUCHDB_REMOTE_URL || 'https://admin:admin@127.0.0.1:5984/sonnenhof_db';

// // Configure the content for the environment files
// const envConfigFile = `export const environment = {
//     production: true,
//     couchdb: {
//         remoteUrl: '${remoteUrl}'
//     }
// };
// `;

// const envConfigFileDev = `export const environment = {
//     production: false,
//     couchdb: {
//         remoteUrl: '${remoteUrl}'
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
