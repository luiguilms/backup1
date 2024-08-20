document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const ip = urlParams.get('ip');
    const port = urlParams.get('port');
    const username = urlParams.get('username');
    const password = urlParams.get('password');
    
    const resultDiv = document.getElementById('result');
    const directoryPath = '/temporal2T/BK_BANTPROD_DIARIO/DTPUMP'; // Ruta específica para Solaris
  
    async function handleConnection() {
      try {
        const isConnected = await window.electron.connectToServer(ip, port, username, password);
        if (isConnected) {
          resultDiv.style.display = 'block'; // Mostrar resultados
          document.getElementById('server-ip').textContent = ip;
  
          try {
            const { logDetails, dumpFileInfo } = await window.electron.getLogDetails(directoryPath, ip, port, username, password);
  
            // Mostrar los detalles del log y archivo DMP
            document.getElementById('log-date').textContent = logDetails.dateTime;
            document.getElementById('duration').textContent = logDetails.duration;
            document.getElementById('success').textContent = logDetails.success ? 'Sí' : 'No';
            document.getElementById('dump-path').textContent = dumpFileInfo.filePath;
            document.getElementById('dump-size').textContent = `${dumpFileInfo.fileSize} MB`;
  
            // Guardar los detalles en la base de datos
            await window.electron.saveLogToDatabase(logDetails, dumpFileInfo);
          } catch (error) {
            resultDiv.innerHTML += `<br>Error al obtener los detalles del log: ${error.message}`;
          }
        } else {
          resultDiv.style.display = 'block';
          resultDiv.textContent = `No se pudo conectar a ${ip}:${port}`;
        }
      } catch (error) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `Error de conexión: ${error.message}`;
      }
    }
  
    handleConnection();
  });
  