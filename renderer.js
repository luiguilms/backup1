document.addEventListener("DOMContentLoaded", async () => {
  const currentPage = window.location.pathname;
  const backButton = document.getElementById("back-button");
  console.log("Current Page Path:", currentPage);

  // Obtener los elementos del DOM
  const osSelect = document.getElementById("os");
  const ipSelect = document.getElementById("ip");
  const editServerBtn = document.getElementById("edit-server-btn");
  const addServerBtn = document.getElementById("add-server-btn");
  const logEntriesContainer = document.getElementById("log-entries");
  const resultDiv = document.getElementById("result");
  const selectServerBtn = document.getElementById("select-server-btn");
  const deleteServerBtn = document.getElementById("delete-server-btn");
  const backupRouteSelect = document.getElementById("backup-routes");
  //const tooltipError = document.createElement("div");
  

  let currentOS = ""; // Variable para el sistema operativo actual
  let selectedServer = null;
  // *** Función para actualizar las rutas de backup ***
  async function updateBackupRoutes() {
    const selectedIP = ipSelect.value; // IP seleccionada
    console.log("IP seleccionada:", selectedIP);  // Asegúrate de que esto se ejecute

    if (!selectedIP) {
      console.log("No hay IP seleccionada.");
      return;
    }

    try {
      console.log(`Obteniendo rutas de backup para la IP: ${selectedIP}`);

      // Llamar a la función del main process para obtener las rutas de backup
      const backupRoutes = await window.electron.getBackupRoutesByIP(selectedIP);

      console.log("Rutas de backup obtenidas:", backupRoutes);  // Verifica que recibes datos

      // Limpiar las rutas previas
      backupRouteSelect.innerHTML = "";

      if (backupRoutes.length > 0) {
        backupRoutes.forEach(route => {
          const option = document.createElement("option");
          option.value = route.backupPath;
          option.textContent = route.backupPath;
          backupRouteSelect.appendChild(option);
        });
      } else {
        backupRouteSelect.innerHTML = "<option>No se encontraron rutas</option>";
      }
    } catch (error) {
      console.error("Error al obtener las rutas de backup:", error);
      backupRouteSelect.innerHTML = "<option>Error al cargar rutas</option>";
    }
  }
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

  // *** Página de selección de servidores ***
  if (currentPage.includes("select-server.html")) {
    const serverListDiv = document.getElementById("server-list");

    // Si hay servidores, los mostramos
    if (servers.length > 0) {
      servers.forEach((server) => {
        const serverItem = document.createElement("div");
        serverItem.className = "server-item";
        serverItem.textContent = `Nombre: ${server.name} - IP: ${server.ip}`;

        serverItem.addEventListener("click", () => {
          document
            .querySelectorAll(".server-item")
            .forEach((item) => item.classList.remove("selected"));
          serverItem.classList.add("selected");
          selectedServer = server;
          selectServerBtn.disabled = false; // Habilitar el botón cuando se seleccione un servidor
          deleteServerBtn.disabled = false;
        });

        serverListDiv.appendChild(serverItem); // Añadir los servidores a la lista
      });
    } else {
      serverListDiv.textContent = "No se encontraron servidores.";
    }

    // Manejar la selección de servidor para editar
    if (selectServerBtn) {
      selectServerBtn.addEventListener("click", () => {
        if (selectedServer) {
          window.localStorage.setItem(
            "selectedServer",
            JSON.stringify(selectedServer)
          );
          window.location.href = "edit-server.html"; // Redirigir a la página de edición
        }
      });
      // *** Botón para eliminar servidor ***
      if (deleteServerBtn) {
        deleteServerBtn.addEventListener("click", async () => {
          if (selectedServer) {
            const confirmDelete = confirm(
              `¿Estás seguro de que deseas eliminar el servidor ${selectedServer.name}?`
            );
            if (confirmDelete) {
              const result = await window.electron.deleteServer(
                selectedServer.id
              );
              if (result.success) {
                alert("Servidor eliminado correctamente.");
                window.location.reload(); // Recargar la página para reflejar los cambios
              } else {
                alert("Error al eliminar el servidor: " + result.error);
              }
            }
          }
        });
      }
    }
  }
  // *** Botón para agregar servidor ***
  if (addServerBtn) {
    addServerBtn.addEventListener("click", () => {
      window.localStorage.removeItem("selectedServer"); // Elimina cualquier selección previa de servidor
      window.location.href = "add-server.html"; // Redirigir a la página de agregar servidor
    });
  }
  // *** Verifica si estamos en la página de agregar o editar servidor ***
  if (
    currentPage.includes("add-server.html") ||
    currentPage.includes("edit-server.html")
  ) {
    const serverData = JSON.parse(
      window.localStorage.getItem("selectedServer")
    );

   // Verifica si estamos en la página de agregar o editar servidor
   if (currentPage.includes("edit-server.html")) {
    const selectedServer = JSON.parse(window.localStorage.getItem("selectedServer"));

    // Verificamos si existe un servidor seleccionado
    if (selectedServer && selectedServer.id) {
      const serverId = selectedServer.id;

      console.log('Llamando a getServerDetails con el ID:', serverId); // LOG AQUÍ

      try {
        console.log("Cargando detalles del servidor con ID:", serverId);

        // Llamamos a la función de electron para obtener los detalles del servidor
        const serverData = await window.electron.getServerDetails(serverId);
        

        if (serverData && !serverData.error) {
          // Llenamos el formulario con los datos recibidos del servidor
          document.getElementById("server-id").value = serverData.id || "";
          document.getElementById("server-name").value = serverData.serverName || "";
          document.getElementById("ip").value = serverData.ip || "";
          document.getElementById("os").value = serverData.os || "";
          document.getElementById("port").value = serverData.port || "";
          document.getElementById("username").value = (serverData.username || "").replace(/^"|"$/g, '');
          document.getElementById("password").value = (serverData.password || "").replace(/^"|"$/g, '');

          console.log("Formulario actualizado con los datos del servidor.");
        } else {
          console.error("No se pudieron cargar los detalles del servidor.");
        }
      } catch (error) {
        console.error("Error al obtener los detalles del servidor:", error);
      }
    } else {
      console.error("No se ha seleccionado ningún servidor.");
      window.location.href = 'select-server.html'; // Redirigir si no hay servidor seleccionado
    }
  }
  // Enviar cambios al editar
  const editServerForm = document.getElementById("edit-server-form");

  if (editServerForm) {
    editServerForm.addEventListener("submit", async (event) => {
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

      console.log('Editando servidor:', serverData);

      try {
        const result = await window.electron.updateServer(serverData);

        if (result.success) {
          alert("Servidor actualizado correctamente.");
          window.localStorage.removeItem("selectedServer");
          window.location.href = "select-server.html";
        } else {
          alert("Error al actualizar el servidor.");
        }
      } catch (error) {
        console.error("Error al actualizar el servidor:", error);
        alert("Hubo un error al actualizar el servidor.");
      }
    });
  }
  


    // *** Agregar o editar el servidor al enviar el formulario ***
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
          let result;
          if (currentPage.includes("add-server.html")) {
            // Si estamos en la página de agregar
            result = await window.electron.addServer(serverData);
          } else {
            // Si estamos en la página de edición
            result = await window.electron.updateServer(serverData);
          }

          if (result.success) {
            alert("Servidor guardado correctamente.");
            window.localStorage.removeItem("selectedServer"); // Eliminar el servidor seleccionado del localStorage
            window.location.href = "index.html"; // Redirigir a la página principal
          } else {
            alert("Error al guardar el servidor.");
          }
        } catch (error) {
          console.error("Error al guardar el servidor:", error);
          alert("Hubo un error al guardar el servidor.");
        }
      });
    }
  }

  // *** Redirigir al selector de servidores cuando se hace clic en Editar ***
  if (editServerBtn) {
    editServerBtn.addEventListener("click", () => {
      window.location.href = "select-server.html"; // Redirigir a la nueva página de selección de servidores
    });
  }

  // *** Función para actualizar las opciones de IP en base al sistema operativo ***
  async function updateIPOptions() {
    if (currentPage.includes("index.html")) {
      try {
        const servers = await window.electron.getServers() || [];
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
          // Si hay opciones de IP disponibles, selecciona la primera por defecto
          if (ipSelect.options.length > 0) {
            ipSelect.value = ipSelect.options[0].value;
            updateBackupRoutes(); // Forzar la actualización de las rutas de backup
          }
        } else {
          ipSelect.disabled = true;
          console.log("No hay servidores disponibles para este sistema operativo.");
        }
      } catch (error) {
        console.error("Error al actualizar las opciones de IP:", error);
      }
    }
  }

  if (osSelect) {
    osSelect.addEventListener("change", updateIPOptions); // Cuando cambie el OS, actualiza las IPs
    updateIPOptions(); // Llama a la función al cargar para llenar las IPs del OS seleccionado por defecto
  }

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
      // Añade este log para verificar el valor en el lado del cliente
      console.log("Tamaño de la carpeta recibido (logData.totalFolderSize):", logData.totalFolderSize);
      console.log("Datos del log:", logData); // Para depuración  
      // Si el valor de success es No, aplicar la clase 'error' a todo el párrafo
      const successClass = logData.logDetails.success ? "" : "error-box";

      const totalDmpSize = logData.dumpFileInfo.reduce(
        (sum, file) => sum + file.fileSize,
        0
      );
      const formattedDmpSize = formatFileSize(totalDmpSize); // Aquí usamos la nueva función
      const formattedFolderSize = logData.totalFolderSize
        ? formatFileSize(parseFloat(logData.totalFolderSize)) // Si hay tamaño de carpeta, lo formateamos
        : "N/A"; // Si no hay tamaño de carpeta, mostramos "N/A"

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
            <p><strong>Backup Path:</strong> ${logData.backupPath || "N/A"} (${formattedFolderSize})</p> <!-- Mostrar tamaño de carpeta aquí -->
            <hr>
        `;
        if (logData.logDetails.oraError) {
          entryDiv.dataset.oraError = JSON.stringify(logData.logDetails.oraError);
      }

      logEntriesContainer.appendChild(entryDiv);
      if (resultDiv) resultDiv.style.display = "block";
    }
  }
  let tooltipError = null;
  if (logEntriesContainer) {
    logEntriesContainer.addEventListener("click", function(event) {
        if (event.target && event.target.classList.contains("error-box")) {
            if (!tooltipError) {
                tooltipError = document.createElement("div");
                tooltipError.classList.add("tooltip-error");
                document.body.appendChild(tooltipError);
            }

            const logEntry = event.target.closest('.log-entry');
            const errorDetails = logEntry ? logEntry.dataset.oraError : null;
            
            if (errorDetails) {
                const oraError = JSON.parse(errorDetails);
                tooltipError.innerHTML = `
                    <p><strong>Error ORA encontrado:</strong></p>
                    <p>${oraError.previousLine}</p>
                    <p><strong>${oraError.errorLine}</strong></p>
                    <p>${oraError.nextLine}</p>
                `;
            } else {
                tooltipError.textContent = "No se encontraron detalles específicos del error.";
            }

            const rect = event.target.getBoundingClientRect();
            tooltipError.style.top = `${rect.top + window.scrollY}px`;
            tooltipError.style.left = `${rect.right + 10}px`;
            tooltipError.style.display = "block";
        }
    });
}
  
  // Cerrar la ventana flotante cuando se hace clic fuera de ella
  window.onclick = function(event) {
      if (tooltipError && !event.target.classList.contains("error-box") && !tooltipError.contains(event.target)) {
          tooltipError.style.display = "none";  // Esconde el tooltip
  
          // Eliminar el tooltip si ya no es necesario
          tooltipError.remove();
          tooltipError = null;
      }
  };
  const form = document.getElementById("server-form");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      showLoading(); // Mostrar loading overlay
  
      const ip = ipSelect.value;
      const username = form.username.value;
      const password = form.password.value;
  
      // Guardar los datos de conexión en el almacenamiento local
      window.localStorage.setItem(
        "connectionData",
        JSON.stringify({ os, ip, port, username, password })
      );
  
      try {
        // Verificar las credenciales del usuario
        const result = await window.electron.verifyCredentials(ip, username, password);
  
        if (!result.success) {
          throw new Error(result.message); // Lanzar error si la verificación falla
        }
  
        const os = result.osType;
        const port = result.port;
  
        // Si el sistema operativo ha cambiado, limpiamos los logs anteriores
        if (currentOS !== os) {
          clearLogEntries();
          currentOS = os; // Actualizamos el sistema operativo actual
        }
  
        console.log("Connection successful");
  
        // Obtener las rutas de backup desde la base de datos usando la IP seleccionada
        const backupRoutes = await window.electron.getBackupRoutesByIP(ip);
        let directoryPath = "";
  
        // Si se encuentran rutas, buscar la correcta según el sistema operativo
        if (backupRoutes.length > 0) {
          const matchingRoute = backupRoutes.find(route => route.os === os);
  
          if (matchingRoute) {
            directoryPath = matchingRoute.backupPath; // Asignamos la ruta correcta
            console.log(`Ruta de backup encontrada: ${directoryPath}`);
          } else {
            showAuthErrorModal(`No se encontraron rutas para el sistema operativo ${os}`);
            return;
          }
        } else {
          showAuthErrorModal("No se encontraron rutas de backup para esta IP.");
          return;
        }
  
        try {
          // Obtener los detalles del log
          console.log("Fetching log details...");
          const logDetailsArray = await window.electron.getLogDetails(
            directoryPath,
            ip,
            port,
            username,
            password,
            os
          );
  
          // Procesar los detalles del log
          if (Array.isArray(logDetailsArray)) {
            for (const logData of logDetailsArray) {
              console.log("Adding log entry:", logData);
              addLogEntry({ ...logData, ip });
  
              if (logData.logDetails && Object.keys(logData.logDetails).length > 0) {
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
  
            if (logData.logDetails && Object.keys(logData.logDetails).length > 0) {
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
            console.log("No se encontraron detalles de log o el formato es inesperado:", logDetailsArray);
            showAuthErrorModal("No se encontraron detalles de log o el formato es inesperado.");
          }
        } catch (error) {
          showAuthErrorModal(`Error al obtener detalles del log: ${error.message}`);
        }
      } catch (error) {
        console.log("Connection error", error);
        showAuthErrorModal(error.message || "Error de conexión. Por favor, verifique sus credenciales.");
      } finally {
        hideLoading(); // Ocultar loading overlay
      }
    });
  }
  
});


