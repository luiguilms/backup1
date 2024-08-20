const { Client } = require('ssh2');

// Configuración de conexión SSH para Solaris
const connectionConfig = {
  host: '10.0.212.81', // Reemplaza con la IP o hostname del servidor Solaris
  port: 22, 
  username: 'solaris_user', // Reemplaza con tu usuario
  password: 'solaris_password' // Reemplaza con tu contraseña
};

// Comando para encontrar el archivo .log más reciente y leer su última línea
const findLogCommand = `
cd /ruta/a/logs && 
latestLog=$(ls -t *.log | head -n 1) && 
tail -n 1 "$latestLog"
`;

const conn = new Client();
conn.on('ready', () => {
  console.log('Conectado a Solaris');
  
  conn.exec(findLogCommand, (err, stream) => {
    if (err) throw err;
    
    stream.on('close', (code, signal) => {
      console.log('Comando ejecutado, cerrando conexión.');
      conn.end();
    }).on('data', (data) => {
      console.log('Última línea del log:', data.toString());
    }).stderr.on('data', (data) => {
      console.error('Error:', data.toString());
    });
  });
}).connect(connectionConfig);
