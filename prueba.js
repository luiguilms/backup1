//avance 07/08/2024 Hasta la exportarcion en Word con formato.
const fs = require('fs');
const path = require('path');
const oracledb = require('oracledb');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const logDirectoryPath = '---------'; // Directorio donde están los archivos de log
let logOutput = ''; // Variable para almacenar el contenido de la consola

// Función para obtener el archivo .log más reciente
function getLatestLogFile(directoryPath) {
  return new Promise((resolve, reject) => {
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        logOutput += `Error reading directory: ${err}\n`;
        return reject(`Error reading directory: ${err}`);
      }

      // Filtrar archivos con extensión .log
      const logFiles = files.filter(file => path.extname(file) === '.log');

      if (logFiles.length === 0) {
        logOutput += 'No log files found in the directory\n';
        return reject('No log files found in the directory');
      }

      // Obtener el archivo más reciente basado en la fecha de modificación
      let latestFile = logFiles[0];
      let latestFileTime = fs.statSync(path.join(directoryPath, latestFile)).mtimeMs;

      for (const file of logFiles) {
        const filePath = path.join(directoryPath, file);
        const fileTime = fs.statSync(filePath).mtimeMs;

        if (fileTime > latestFileTime) {
          latestFile = file;
          latestFileTime = fileTime;
        }
      }

      resolve(path.join(directoryPath, latestFile));
    });
  });
}

// Función para leer el archivo de log y procesar la última línea
async function readLogFile() {
  try {
    const logFilePath = await getLatestLogFile(logDirectoryPath);

    fs.readFile(logFilePath, 'utf8', async (err, data) => {
      if (err) {
        logOutput += `Error reading log file: ${err}\n`;
        console.error(`Error reading log file: ${err}`);
        saveLogOutputToWord(logOutput);
        return;
      }

      const logLines = data.trim().split('\n');
      const lastLine = logLines[logLines.length - 1];
      const logDetails = parseLogLine(lastLine);

      logOutput += `Log output: ${lastLine}\n`;
      logOutput += `Parsed Log Details:\n  dateTime: ${logDetails.dateTime}\n  duration: ${logDetails.duration}\n  success: ${logDetails.success}\n`;

      console.log('Log output:', lastLine);
      console.log('Parsed Log Details:', logDetails);

      await storeLogDetails(logDetails);
      saveLogOutputToWord(logOutput);
    });
  } catch (error) {
    logOutput += `${error}\n`;
    console.error(error);
    saveLogOutputToWord(logOutput);
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

// Función para almacenar los detalles del log en la base de datos
async function storeLogDetails(logDetails) {
  let connection;

  try {
    // Conexión a la base de datos
    connection = await oracledb.getConnection({
      user: '-----', // Reemplaza con tu usuario de Oracle
      password: '-----', // Reemplaza con tu contraseña de Oracle
      connectString: '----------' // Reemplaza con tu cadena de conexión a Oracle
    });

    // Verificar si ya existe un registro con el mismo dateTime
    const checkExistQuery = `SELECT COUNT(*) as count FROM LogBackup WHERE dateTime = :dateTime`;
    const checkExistResult = await connection.execute(checkExistQuery, { dateTime: logDetails.dateTime });

    if (checkExistResult.rows[0].COUNT > 0) {
      logOutput += `Log entry with dateTime ${logDetails.dateTime} already exists.\n`;
      console.log(`Log entry with dateTime ${logDetails.dateTime} already exists.`);
    } else {
      // Inserta los detalles del log en la tabla correspondiente
      const result = await connection.execute(
        `INSERT INTO LogBackup (dateTime, duration, success) VALUES (:dateTime, :duration, :success)`,
        {
          dateTime: logDetails.dateTime,
          duration: logDetails.duration,
          success: logDetails.success ? 1 : 0
        },
        { autoCommit: true }
      );

      logOutput += `Log details stored successfully.\n`;
      console.log('Log details stored successfully:', result);
    }
  } catch (err) {
    logOutput += `Error storing log details: ${err}\n`;
    console.error('Error storing log details:', err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        logOutput += `Error closing connection: ${err}\n`;
        console.error('Error closing connection:', err);
      }
    }
  }
}

// Función para guardar el contenido de la consola en un archivo de Word
function saveLogOutputToWord(logOutput) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: logOutput.split('\n').map(line => new Paragraph(line)),
      },
    ],
  });

  // Obtener la fecha y hora actual
  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
  const formattedTime = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
  const fileName = `logOutput_${formattedDate}_${formattedTime}.docx`;

  Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync(fileName, buffer);
    console.log(`Log output saved to ${fileName}`);
  });
}

// Leer el archivo de log y procesar la última línea
readLogFile();
