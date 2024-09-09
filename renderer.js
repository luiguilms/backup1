document.addEventListener("DOMContentLoaded", async () => {
  const currentPage = window.location.pathname;
  

  // Obtener los elementos del DOM
  const osSelect = document.getElementById("os");
  const ipSelect = document.getElementById("ip");
  const editServerBtn = document.getElementById("edit-server-btn");
  const addServerBtn = document.getElementById("add-server-btn");
  const modalEditServer = document.getElementById("editServerModal");
  const closeEditModal = document.getElementById("closeEditModal");
  const serverListDiv = document.getElementById("server-list");
  const selectServerBtn = document.getElementById("select-server-btn");
  const logEntriesContainer = document.getElementById('log-entries');
  const resultDiv = document.getElementById("result");

  let currentOS = ''; // Variable para el sistema operativo actual
  let selectedServer = null;
  // *** Función para cargar servidores ***
  async function loadServers() {
    try {
      const servers = await window.electron.getServers();
      console.log("Servidores recuperados:", servers);
      return servers;
    } catch (error) {
      console.error("Error al recuperar los servidores:", error);
      return [];
    }
  }

  let servers = await loadServers(); // Cargamos los servidores al inicio

  // *** Botón para agregar servidor ***
  if (addServerBtn) {
    addServerBtn.addEventListener("click", () => {
      window.localStorage.removeItem('selectedServer'); // Elimina cualquier selección previa de servidor
      window.location.href = "add-server.html"; // Redirigir a la página de agregar servidor
    });
  }

  // *** Lógica para agregar un servidor (sin editar) ***
  if (currentPage.includes('add-server.html')) {
    const addServerForm = document.getElementById("add-server-form");

    if (addServerForm) {
      addServerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const serverData = {
          id: document.getElementById("server-id").value,
          serverName: document.getElementById("server-name").value,
          ip: document.getElementById("ip").value,
          os: document.getElementById("os").value,
          port: document.getElementById("port").value,
          username: document.getElementById("username").value,
          password: document.getElementById("password").value,
        };

        try {
          const result = await window.electron.addServer(serverData); // Llamada para agregar servidor

          if (result.success) {
            alert("Servidor agregado correctamente");
            window.location.href = "index.html"; // Redirigir a la página principal
          } else {
            alert("Error al agregar el servidor.");
          }
        } catch (error) {
          console.error("Error al agregar el servidor:", error);
          alert("Hubo un error al agregar el servidor.");
        }
      });
    }
  }


  async function updateIPOptions() {
    try {
      const servers = await window.electron.getServers(); // Asegúrate de que esta función devuelve los servidores correctamente
      const selectedOS = osSelect.value;

      ipSelect.innerHTML = ""; // Limpia las opciones previas
      const filteredServers = servers.filter(
        (server) => server.os === selectedOS
      );

      if (filteredServers.length > 0) {
        filteredServers.forEach((server) => {
          const option = document.createElement("option");
          option.value = server.ip;
          option.textContent = server.ip;
          ipSelect.appendChild(option);
        });
      } else {
        ipSelect.disabled = true;
        console.log(
          "No hay servidores disponibles para este sistema operativo."
        );
      }
    } catch (error) {
      console.error("Error al actualizar las opciones de IP:", error);
    }
  }

  osSelect.addEventListener("change", updateIPOptions); // Cuando cambie el OS, actualiza las IPs

  // Llama a la función al cargar para llenar las IPs del OS seleccionado por defecto
  updateIPOptions();

  function showLoading() {
    document.getElementById("loading-overlay").style.display = "flex";
  }

  function hideLoading() {
    document.getElementById("loading-overlay").style.display = "none";
  }

  function showAuthErrorModal(errorMessage) {
    requestAnimationFrame(() => {
      const modalAuthError = document.getElementById("authErrorModal");
      const message = document.getElementById("errorMessage");
      if (modalAuthError && message) {
        message.textContent =
          errorMessage ||
          "Error de autenticación. Por favor, inténtelo de nuevo.";
        modalAuthError.style.display = "block";

        const retryButton = document.getElementById("retryButton");
        const closeAuthModal = document.getElementById("closeModal");

        if (retryButton) {
          retryButton.onclick = function () {
            modalAuthError.style.display = "none";
          };
        }

        if (closeAuthModal) {
          closeAuthModal.onclick = function () {
            modalAuthError.style.display = "none";
          };
        }

        window.onclick = function (event) {
          if (event.target == modalAuthError) {
            modalAuthError.style.display = "none";
          }
        };
      }
    });
  }

  function clearLogEntries() {
    if (logEntriesContainer) {
      logEntriesContainer.innerHTML = ""; // Limpiar los logs anteriores
    }
  }

  function formatFileSize(sizeInMB) {
    if (sizeInMB >= 1000) {
      let sizeInGB = (sizeInMB / 1000).toFixed(2);
      return `${sizeInGB} GB`;
    } else {
      return `${sizeInMB.toFixed(2)} MB`;
    }
  }

  function addLogEntry(logData) {
    if (logEntriesContainer) {
      const entryDiv = document.createElement("div");
      entryDiv.className = "log-entry";

      // Si el valor de success es No, aplicar la clase 'error' a todo el párrafo
      const successClass = logData.logDetails.success ? "" : "error";

      const totalDmpSize = logData.dumpFileInfo.reduce(
        (sum, file) => sum + file.fileSize,
        0
      );
      const formattedDmpSize = formatFileSize(totalDmpSize); // Aquí usamos la nueva función

      entryDiv.innerHTML = `
            <p><strong>Server IP:</strong> ${logData.ip}</p>
            <p><strong>Start Time:</strong> ${
              logData.logDetails.startTime || "N/A"
            }</p>
            <p><strong>End Time:</strong> ${
              logData.logDetails.endTime || "N/A"
            }</p>
            <p><strong>Duration:</strong> ${
              logData.logDetails.duration || "N/A"
            }</p>
            <!-- Aplica la clase 'error' al párrafo si success es No -->
            <p class="${successClass}"><strong>Success:</strong> ${
        logData.logDetails.success ? "Yes" : "No"
      }</p>
            <p><strong>Total Dump File Size:</strong> ${formattedDmpSize}</p> <!-- Aquí -->
            <p><strong>Log File Name:</strong> ${
              logData.logFileName || "N/A"
            }</p>
            <p><strong>Backup Path:</strong> ${logData.backupPath || "N/A"}</p>
            <hr>
        `;

      logEntriesContainer.appendChild(entryDiv);
      if (resultDiv) resultDiv.style.display = "block";
    }
  }

  const form = document.getElementById("server-form");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      showLoading(); // Mostrar loading overlay

      const ip = ipSelect.value;
      const username = form.username.value;
      const password = form.password.value;

      window.localStorage.setItem(
        "connectionData",
        JSON.stringify({ os, ip, port, username, password })
      );

      try {
        const result = await window.electron.verifyCredentials(
          ip,
          username,
          password
        );

        if (result.success) {
          const os = result.osType;
          const port = result.port;
          // Si el OS ha cambiado, limpiamos los logs anteriores
          if (currentOS !== os) {
            clearLogEntries();
            currentOS = os; // Actualizamos el OS actual
          }

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
              for (const logData of logDetailsArray) {
                console.log("Adding log entry:", logData);
                addLogEntry({ ...logData, ip });
                if (
                  logData.logDetails &&
                  Object.keys(logData.logDetails).length > 0
                ) {
                  await window.electron.saveLogToDatabase(
                    logData.logDetails,
                    logData.dumpFileInfo,
                    os,
                    logData.logFileName,
                    logData.ip,
                    logData.backupPath
                  );
                }
              }
            } else if (logDetailsArray && typeof logDetailsArray === "object") {
              const logData = { ...logDetailsArray, ip };
              console.log("Adding log entry:", logData);
              addLogEntry(logData);
              if (
                logData.logDetails &&
                Object.keys(logData.logDetails).length > 0
              ) {
                await window.electron.saveLogToDatabase(
                  logData.logDetails,
                  logData.dumpFileInfo,
                  os,
                  logData.logFileName,
                  logData.ip,
                  logData.backupPath
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
          console.log(result.message);
          throw new Error(result.message);
        }
      } catch (error) {
        console.log("Connection error", error);
        showAuthErrorModal(
          error.message ||
            "Error de conexión. Por favor, verifique sus credenciales."
        );
      } finally {
        hideLoading(); // Ocultar loading overlay
      }
    });
  }
});
