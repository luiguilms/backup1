const Client = require('ssh2-sftp-client');
const sftp = new Client();

async function connectSFTP() {
    try {
        await sftp.connect({
            host: '10.0.212.172',     // Reemplaza con la IP del servidor SFTP
            port: '22',               // Puerto para SFTP (22 es el puerto predeterminado)
            username: 'bknetworker',  // Reemplaza con tu nombre de usuario SFTP
            password: 'BKn3t$$2017'   // Reemplaza con tu contraseña SFTP
        });
        console.log('Conectado al servidor SFTP');
    } catch (err) {
        console.error('Error en la conexión SFTP:', err);
    } finally {
        sftp.end();
    }
}

connectSFTP();
