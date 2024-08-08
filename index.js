const { Client } = require('ssh2');

const sshConfig = {
  host: 'servidor', // Reemplaza con la IP o el nombre de tu servidor
  port: 22,
  username: 'usuario', // Reemplaza con tu usuario SSH
  password: 'clave',   // Reemplaza con tu contraseña SSH
};

const logFilePath = '/ruta/a/logs/output_exp_controln_01-08-2024_21-30-02.log'; // Reemplaza con la ruta de tu archivo de log

const sshClient = new Client();

sshClient.on('ready', () => {
  console.log('SSH Connection ready');

  // Comando para leer la última línea del archivo de log
  const tailCommand = `tail -n 1 ${logFilePath}`;

  sshClient.exec(tailCommand, (err, stream) => {
    if (err) throw err;

    let logOutput = '';

    stream.on('close', (code, signal) => {
      console.log(`Stream closed with code: ${code}, signal: ${signal}`);
      console.log('Log output:', logOutput);
      
      // Aquí puedes procesar el `logOutput` para extraer la información necesaria
      const logLines = logOutput.trim().split('\n');
      const lastLine = logLines[logLines.length - 1];
      const logDetails = parseLogLine(lastLine);
      console.log('Parsed Log Details:', logDetails);

      sshClient.end();
    }).on('data', (data) => {
      logOutput += data.toString();
    }).stderr.on('data', (data) => {
      console.error(`STDERR: ${data}`);
    });
  });
}).connect(sshConfig);

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

