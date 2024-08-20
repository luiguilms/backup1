const { exec } = require('child_process');

// Configurar credenciales usando cmdkey
const configureCredentials = (host, userName, password) => {
  return new Promise((resolve, reject) => {
    const command = `cmdkey /add:${host} /user:${userName} /pass:${password}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error configuring credentials: ${error.message}`);
      }
      if (stderr) {
        return reject(`cmdkey stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

// Iniciar conexión RDP
const startRDPConnection = (host) => {
  return new Promise((resolve, reject) => {
    const command = `start mstsc /v:${host}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error starting RDP connection: ${error.message}`);
      }
      if (stderr) {
        return reject(`mstsc stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
};

// Ejemplo de uso
(async () => {
  try {
    await configureCredentials('10.0.212.172', 'bknetworker', 'BKn3t$$2017');
    console.log('Credenciales configuradas correctamente.');
    
    await startRDPConnection('10.0.212.172');
    console.log('Intentando conectar al servidor RDP...');
  } catch (error) {
    console.error(error);
  }
})();
