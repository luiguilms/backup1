//renderer.js
document.addEventListener("DOMContentLoaded", () => {
  const osSelect = document.getElementById("os");
  const ipSelect = document.getElementById("ip");
  const resultDiv = document.getElementById("result");
  const logEntriesContainer = document.getElementById("log-entries");

  const ipAddresses = {
    windows: ["10.0.212.172", "10.0.98.22"],
    linux: ["10.0.212.4"],
    solaris: ["10.0.212.211"],
  };
  function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
  }
  
  function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  function showAuthErrorModal(errorMessage) {
    const modal = document.getElementById("authErrorModal");
    const message = document.getElementById("errorMessage");
    if (modal && message) {
      message.textContent =
        errorMessage ||
        "Error de autenticación. Por favor, inténtelo de nuevo.";
      modal.style.display = "block";

      const retryButton = document.getElementById("retryButton");
      const closeModal = document.getElementById("closeModal");

      if (retryButton) {
        retryButton.onclick = function () {
          modal.style.display = "none";
        };
      }

      if (closeModal) {
        closeModal.onclick = function () {
          modal.style.display = "none";
        };
      }

      window.onclick = function (event) {
        if (event.target == modal) {
          modal.style.display = "none";
        }
      };
    }
  }

  function addLogEntry(logData) {
    if (logEntriesContainer) {
      const entryDiv = document.createElement("div");
      entryDiv.className = "log-entry";
      // Añadir la clase 'failed' si el éxito es "No"
    if (!logData.logDetails.success) {
      entryDiv.classList.add("failed");
    }
      entryDiv.innerHTML = `
        <p><strong>Server IP:</strong> ${logData.ip}</p>
        <p><strong>Log Date:</strong> ${
          logData.logDetails.dateTime || "N/A"
        }</p>
        <p><strong>Duration:</strong> ${
          logData.logDetails.duration || "N/A"
        }</p>
        <p><strong>Success:</strong> ${
          logData.logDetails.success ? "Yes" : "No"
        }</p>
        <p><strong>Dump File Path:</strong> ${
          logData.dumpFileInfo?.filePath || "N/A"
        }</p>
        <p><strong>Dump File Size:</strong> ${
          logData.dumpFileInfo ? `${logData.dumpFileInfo.fileSize} MB` : "N/A"
        }</p>
        <p><strong>Log File Name:</strong> ${logData.logFileName || "N/A"}</p>
        <hr>
      `;

      logEntriesContainer.appendChild(entryDiv);
      if (resultDiv) resultDiv.style.display = "block";
    }
  }

  function updateIPOptions() {
    const os = osSelect.value;
    const ips = ipAddresses[os] || [];
    ipSelect.innerHTML = ""; // Limpiar opciones existentes

    ips.forEach((ip) => {
      const option = document.createElement("option");
      option.value = ip;
      option.textContent = ip;
      ipSelect.appendChild(option);
    });

    // Establecer IP por defecto
    if (ips.length > 0) {
      ipSelect.value = ips[0];
    }
  }

  // Actualiza las opciones de IP al cargar la página
  updateIPOptions();

  // Actualiza las opciones de IP al cambiar el sistema operativo
  osSelect.addEventListener("change", updateIPOptions);

  const form = document.getElementById("server-form");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      showLoading();

      const os = osSelect.value;
      const ip = ipSelect.value;
      const port = form.port.value;
      const username = form.username.value;
      const password = form.password.value;

      window.localStorage.setItem(
        "connectionData",
        JSON.stringify({ os, ip, port, username, password })
      );

      try {
        console.log("Attempting to connect...");
        const isConnected = await window.electron.connectToServer(
          ip,
          port,
          username,
          password
        );

        if (isConnected) {
          console.log("Connection successful");

          let directoryPath = "";
          switch (os) {
            case "linux":
              directoryPath =
                "/temporal1T/BK_SWITCH/BK_CAJERO_2024_08_16_0425/";
              break;
            case "windows":
              directoryPath = "F:\\bk_info7021_USRGCN\\2022_07_13";
              break;
            case "solaris":
              directoryPath = "/temporal2T/BK_BANTPROD_DIARIO/DTPUMP/";
              break;
            default:
              showAuthErrorModal("Sistema operativo no soportado.");
              return;
          }

          try {
            console.log("Fetching log details...");
            const logDetailsArray = await window.electron.getLogDetails(
              directoryPath,
              ip,
              port,
              username,
              password,
              os
            );

            console.log("Log details fetched:", logDetailsArray);

            if (Array.isArray(logDetailsArray)) {
              // Procesa y muestra cada log uno por uno (para Solaris y otros si es un array)
              for (const logData of logDetailsArray) {
                console.log("Adding log entry:", logData);
                addLogEntry({ ...logData, ip });
                // Guardar en la base de datos solo si los datos no están vacíos
                if (
                  logData.logDetails &&
                  Object.keys(logData.logDetails).length > 0
                ) {
                  await window.electron.saveLogToDatabase(
                    logData.logDetails,
                    logData.dumpFileInfo,
                    os,
                    logData.logFileName
                  );
                }
              }
            } else if (logDetailsArray && typeof logDetailsArray === "object") {
              // Para casos donde se devuelve un solo objeto de log
              const logData = { ...logDetailsArray, ip };
              console.log("Adding log entry:", logData);
              addLogEntry(logData);
              // Guardar en la base de datos solo si los datos no están vacíos
              if (
                logData.logDetails &&
                Object.keys(logData.logDetails).length > 0
              ) {
                await window.electron.saveLogToDatabase(
                  logData.logDetails,
                  logData.dumpFileInfo,
                  os,
                  logData.logFileName
                );
              }
            } else {
              console.log(
                "No se encontraron detalles de log o formato inesperado:",
                logDetailsArray
              );
              showAuthErrorModal(
                "No se encontraron detalles de log o el formato es inesperado."
              );
            }
          } catch (error) {
            showAuthErrorModal(
              `Error al obtener detalles del log: ${error.message}`
            );
          }
        } else {
          console.log("Connection failed");
          showAuthErrorModal(`No se pudo conectar a ${ip}:${port}.`);
        }
      } catch (error) {
        console.log("Connection error", error);
        showAuthErrorModal("Usuario o contraseña incorrectos.");
      }finally{
        hideLoading();
      }
    });
  }
});
