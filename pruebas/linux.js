const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

// Configuración de conexión SSH
const sshConfig = {
  host: '10.0.212.4', // Reemplaza con la IP del servidor Linux
  port: 22,
  username: 'test', // Reemplaza con el nombre de usuario del servidor Linux
  password: 'password', // Reemplaza con la contraseña del servidor Linux
};

// Ruta del directorio donde están los archivos de log en el servidor Linux
const remoteLogDirectory = '/ruta/al/directorio/logs/';

// Función para buscar el archivo .log más reciente
function findLatestLogFile(client, directoryPath) {
  return new Promise((resolve, reject) => {
    const command = `ls -t ${directoryPath}*.log | head -n 1`;
    client.exec(command, (err, stream) => {
      if (err) return reject(`Error executing command: ${err}`);
      
      let latestFile = '';
      stream.on('data', (data) => {
        latestFile += data;
      }).on('close', () => {
        if (latestFile) {
          resolve(latestFile.trim());
        } else {
          reject('No log files found');
        }
      });
    });
  });
}

// Función para leer la última línea relevante del archivo de log
function readLastLogLine(client, logFilePath) {
  return new Promise((resolve, reject) => {
    const command = `tail -n 1 ${logFilePath}`;
    client.exec(command, (err, stream) => {
      if (err) return reject(`Error executing command: ${err}`);
      
      let lastLine = '';
      stream.on('data', (data) => {
        lastLine += data;
      }).on('close', () => {
        resolve(lastLine.trim());
      });
    });
  });
}

// Conexión SSH y ejecución
const conn = new Client();
conn.on('ready', async () => {
  console.log('SSH Connection established');
  
  try {
    const latestLogFile = await findLatestLogFile(conn, remoteLogDirectory);
    console.log(`Latest log file: ${latestLogFile}`);

    const lastLogLine = await readLastLogLine(conn, latestLogFile);
    console.log('Log output:', lastLogLine);

    // Aquí puedes agregar la lógica para procesar y almacenar la línea del log si es necesario
  } catch (err) {
    console.error(err);
  } finally {
    conn.end();
  }
}).connect(sshConfig);
