const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración de conexión RDP
const serverAddress = '10.0.0.1'; // Reemplaza con la dirección IP o nombre del servidor
const username = 'REMOTE_USER';   // Reemplaza con el nombre de usuario
const password = 'REMOTE_PASSWORD'; // Reemplaza con la contraseña

// Función para obtener el archivo .log más reciente del directorio local
async function getLatestLogFile(directoryPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        return reject(`Error reading directory: ${err}`);
      }

      // Filtrar archivos con extensión .log
      const logFiles = files.filter(file => path.extname(file) === '.log');
      
      if (logFiles.length === 0) {
        return reject('No log files found in the directory');
      }

      // Obtener el archivo más reciente basado en la fecha de modificación
      let latestFile = logFiles[0];
      fs.stat(path.join(directoryPath, latestFile), (err, stats) => {
        if (err) {
          return reject(`Error getting file stats: ${err}`);
        }

        let latestFileTime = stats.mtime;

        logFiles.forEach(file => {
          fs.stat(path.join(directoryPath, file), (err, stats) => {
            if (err) {
              return reject(`Error getting file stats: ${err}`);
            }

            if (stats.mtime > latestFileTime) {
              latestFile = file;
              latestFileTime = stats.mtime;
            }
          });
        });

        resolve(path.join(directoryPath, latestFile));
      });
    });
  });
}

// Función para leer el archivo de log y procesar la última línea
async function readLogFile() {
  const logDirectoryPath = 'C:\\path\\to\\logs'; // Directorio local donde están los archivos de log
  try {
    const logFilePath = await getLatestLogFile(logDirectoryPath);

    fs.readFile(logFilePath, 'utf8', async (err, data) => {
      if (err) {
        console.error(`Error reading log file: ${err}`);
        return;
      }

      const logLines = data.trim().split('\n');
      const lastLine = logLines[logLines.length - 1];
      const logDetails = parseLogLine(lastLine);

      console.log('Log output:', lastLine);
      console.log('Parsed Log Details:', logDetails);

      // Aquí puedes agregar la lógica para almacenar los detalles del log si es necesario
    });
  } catch (error) {
    console.error(error);
  }
}

// Función para analizar la última línea del archivo de log
function parseLogLine(logLine) {
  const datePattern = /\w{3} \w{3} \d{1,2} \d{2}:\d{2}:\d{2} \d{4}/;
  const match = logLine.match(datePattern);
  const dateTime = match ? match[0] : 'N/A';

  const durationPattern = /elapsed (.+)/;
  const durationMatch = logLine.match(durationPattern);
  const duration = durationMatch ? durationMatch[1] : 'N/A';

  const success = logLine.includes('successfully completed');

  return {
    dateTime,
    duration,
    success,
  };
}

// Crear un archivo RDP temporal
const rdpFilePath = path.join(__dirname, 'temp.rdp');
const rdpContent = `
screen mode id:i:1
use multimon:i:0
desktopwidth:i:1920
desktopheight:i:1080
session bpp:i:32
full address:s:${serverAddress}
username:s:${username}
password 51:b:${Buffer.from(password).toString('hex')}
`;

fs.writeFileSync(rdpFilePath, rdpContent);

// Iniciar la conexión RDP y luego leer el log
exec(`mstsc ${rdpFilePath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Stdout: ${stdout}`);

  // Leer el archivo de log después de la conexión RDP
  readLogFile();

  // Eliminar el archivo RDP temporal
  fs.unlink(rdpFilePath, (err) => {
    if (err) {
      console.error(`Error deleting file: ${err}`);
    }
  });
});
