const oracledb = require('oracledb');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');

// Configuración de la conexión a la base de datos
const dbConfig = {
  user: 'USRMONBK', // Reemplaza con tu usuario de Oracle
  password: 'USRMONBK_2024', // Reemplaza con tu contraseña de Oracle
  connectString: '10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe' // Reemplaza con tu cadena de conexión a Oracle
};

// Función para leer el archivo de log y procesar la última línea
async function readLogFile() {
  const logDir = path.join('C:\\Users\\igs_llupacca\\Documents\\backup_1'); // Ruta del directorio de logs
  const files = fs.readdirSync(logDir);
  const logFile = files.find(file => file.endsWith('.log'));

  if (!logFile) {
    console.error('No se encontró un archivo de log');
    return;
  }

  const fullPath = path.join(logDir, logFile);
  const data = fs.readFileSync(fullPath, 'utf8');
  const logLines = data.trim().split('\n');
  const lastLine = logLines[logLines.length - 1];
  const logDetails = parseLogLine(lastLine);

  console.log('Log output:', lastLine);
  console.log('Parsed Log Details:', logDetails);

  await storeLogDetails(logDetails);
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

// Función para almacenar los detalles del log en la base de datos
async function storeLogDetails(logDetails) {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `INSERT INTO LogBackup (dateTime, duration, success) VALUES (:dateTime, :duration, :success)`,
      {
        dateTime: logDetails.dateTime,
        duration: logDetails.duration,
        success: logDetails.success ? 1 : 0
      },
      { autoCommit: true }
    );

    console.log('Log details stored successfully:', result);
  } catch (err) {
    console.error('Error storing log details:', err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Configurar los comandos de yargs
yargs.command({
  command: 'check-backups',
  describe: 'Check the status of backups',
  handler: async () => {
    let connection;

    try {
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute('SELECT * FROM LogBackup');
      console.log('Backup Logs:', result.rows);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection:', err);
        }
      }
    }
  }
});

yargs.command({
  command: 'store-log',
  describe: 'Read the log file and store the last entry in the database',
  handler: async () => {
    await readLogFile();
  }
});

yargs.parse();
