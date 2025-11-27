export const environment = {
    production: false,
    couchdb: {
        // Für HTTPS nutzen Sie den ngrok http Tunnel (z.B. https://....ngrok-free.app/sonnenhof_db)
        // Für TCP (nur HTTP möglich): http://admin:server-lukas@0.tcp.eu.ngrok.io:18846/sonnenhof_db
        remoteUrl: 'http://admin:server-lukas@0.tcp.eu.ngrok.io:18846/sonnenhof_db'
    }
};
