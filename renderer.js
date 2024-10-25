let gridApi = null;
document.addEventListener("DOMContentLoaded", async () => {
  const currentPage = window.location.pathname;
  const currentPath = window.location.pathname;
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
  const exportExcelButton = document.getElementById("exportExcel");

  if (exportExcelButton) {
    exportExcelButton.addEventListener("click", () => handleExport("excel"));
  }
  // Verifica si estamos en la página index.html
  if (currentPath.endsWith("index.html") || currentPath === "/") {
    createStatsButton();
  }
  function createStatsButton() {
    const statsButton = document.createElement("button");
    statsButton.textContent = "Mostrar Estadísticas";
    statsButton.id = "showStatsButton";
    statsButton.onclick = showStatistics;
    const topBar = document.createElement("div");
    topBar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background-color: #f8f9fa;
    padding: 5px;
    text-align: right;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 1000;
  `;
    topBar.appendChild(statsButton);
    document.body.insertBefore(topBar, document.body.firstChild);
    document.body.style.marginTop = "50px"; // Ajusta este valor según sea necesario
  }
  //const tooltipError = document.createElement("div");
  const processAllServersBtn = document.getElementById(
    "process-all-servers-btn"
  );
  const gridContainer = document.getElementById("gridContainer");
  const gridDiv = document.querySelector("#myGrid");
  let currentOS = ""; // Variable para el sistema operativo actual
  let selectedServer = null;
  // *** Función para actualizar las rutas de backup ***
  async function updateBackupRoutes() {
    const selectedIP = ipSelect.value; // IP seleccionada
    //console.log("IP seleccionada:", selectedIP); // Asegúrate de que esto se ejecute
    if (!selectedIP) {
      console.log("No hay IP seleccionada.");
      return;
    }
    try {
      // console.log(`Obteniendo rutas de backup para la IP: ${selectedIP}`);
      // Llamar a la función del main process para obtener las rutas de backup
      const backupRoutes = await window.electron.getBackupRoutesByIP(
        selectedIP
      );
      //console.log("Rutas de backup obtenidas:", backupRoutes); // Verifica que recibes datos
      // Limpiar las rutas previas
      backupRouteSelect.innerHTML = "";
      if (backupRoutes && backupRoutes.length > 0) {
        backupRoutes.forEach((route) => {
          const option = document.createElement("option");
          option.value = route.backupPath;
          option.textContent = route.backupPath;
          backupRouteSelect.appendChild(option);
        });
        backupRouteSelect.disabled = false;
      } else {
        backupRouteSelect.innerHTML =
          "<option>No se encontraron rutas</option>";
        backupRouteSelect.disabled = true;
      }
    } catch (error) {
      console.error("Error al obtener las rutas de backup:", error);
      backupRouteSelect.innerHTML = "<option>Error al cargar rutas</option>";
      backupRouteSelect.disabled = true;
    }
    ipSelect.addEventListener("change", updateBackupRoutes);
  }
  // Asegúrate de que esta función se llame cada vez que se cambia la IP seleccionada

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
    // Verifica si estamos en la página de agregar o editar servidor
    if (currentPage.includes("edit-server.html")) {
      const selectedServer = JSON.parse(
        window.localStorage.getItem("selectedServer")
      );
      // Verificamos si existe un servidor seleccionado
      if (selectedServer && selectedServer.id) {
        const serverId = selectedServer.id;
        console.log("Llamando a getServerDetails con el ID:", serverId); // LOG AQUÍ
        try {
          console.log("Cargando detalles del servidor con ID:", serverId);
          // Llamamos a la función de electron para obtener los detalles del servidor
          const serverData = await window.electron.getServerDetails(serverId);
          if (serverData && !serverData.error) {
            // Llenamos el formulario con los datos recibidos del servidor
            document.getElementById("server-id").value = serverData.id || "";
            document.getElementById("server-name").value =
              serverData.serverName || "";
            document.getElementById("ip").value = serverData.ip || "";
            document.getElementById("os").value = serverData.os || "";
            document.getElementById("port").value = serverData.port || "";
            document.getElementById("username").value = (
              serverData.username || ""
            ).replace(/^"|"$/g, "");
            document.getElementById("password").value = (
              serverData.password || ""
            ).replace(/^"|"$/g, "");
            console.log("Formulario actualizado con los datos del servidor.");
          } else {
            console.error("No se pudieron cargar los detalles del servidor.");
          }
        } catch (error) {
          console.error("Error al obtener los detalles del servidor:", error);
        }
      } else {
        console.error("No se ha seleccionado ningún servidor.");
        window.location.href = "select-server.html"; // Redirigir si no hay servidor seleccionado
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

        console.log("Editando servidor:", serverData);

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
        const servers = (await window.electron.getServers()) || [];
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
          console.log(
            "No hay servidores disponibles para este sistema operativo."
          );
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
    console.log("Entrando en showAuthErrorModal");
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
  if (
    typeof agGrid === "undefined" ||
    typeof agGrid.createGrid === "undefined"
  ) {
    return;
  }
  if (gridDiv) {
    console.log("Elemento del grid encontrado, inicializando...");
    initGrid(gridDiv);
  } else {
    console.error("Elemento #myGrid no encontrado");
  }
  if (processAllServersBtn) {
    processAllServersBtn.addEventListener("click", startProcessAllServers);
  } else {
    console.error("Botón process-all-servers-btn no encontrado");
  }
  function initGrid(gridDiv) {
    const gridOptions = {
      columnDefs: [
        {
          headerName: "Servidor",
          field: "serverName",
          sortable: true,
          filter: true,
          minWidth: 120,
        },
        {
          headerName: "IP",
          field: "ip",
          sortable: true,
          filter: true,
          minWidth: 100,
        },
        {
          headerName: "Estado",
          field: "status",
          sortable: true,
          filter: true,
          minWidth: 80,
          cellRenderer: (params) => {
            return `<div class="${params.data.statusClass}">${params.value}</div>`;
          },
        },
        {
          headerName: "Archivo de Log",
          field: "logFileName",
          sortable: true,
          filter: true,
          minWidth: 150,
        },
        {
          headerName: "Hora de Inicio",
          field: "startTime",
          sortable: true,
          filter: true,
          minWidth: 150,
        },
        {
          headerName: "Hora de Fin",
          field: "endTime",
          sortable: true,
          filter: true,
          minWidth: 150,
        },
        {
          headerName: "Duración",
          field: "duration",
          sortable: true,
          filter: true,
          minWidth: 100,
        },
        {
          headerName: "Tamaño Total DMP",
          field: "totalDmpSize",
          sortable: true,
          filter: true,
          minWidth: 100,
        },
        {
          headerName: "Tamaño Total Carpeta",
          field: "totalFolderSize",
          sortable: true,
          filter: true,
          minWidth: 100,
        },
        {
          headerName: "Estado de Backup",
          field: "backupStatus",
          sortable: true,
          filter: true,
          minWidth: 80,
        },
        {
          headerName: "Ruta de Backup",
          field: "backupPath",
          sortable: true,
          filter: true,
          minWidth: 150,
        },
        {
          headerName: "Grupo de control",
          field: "last10Lines",
          cellRenderer: (params) => {
            const button = document.createElement("button");
            button.innerHTML = "Ver";
            button.addEventListener("click", () => {
              showLast10LinesModal(
                params.data.last10Lines,
                params.data.hasWarning
              );
            });
            return button;
          },
          minwidth: 120,
        },
      ],
      pagination: true, // Habilita la paginación
      paginationPageSize: 10, // Número de filas por página
      defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true, // Asegúrate de que los filtros estén habilitados aquí
      },
      rowData: [],
      onGridReady: (params) => {
        params.api.sizeColumnsToFit();
      },
      domLayout: "autoHeight",
      onFirstDataRendered: (params) => {
        params.api.autoSizeAllColumns();
      },
      //domLayout: 'autoWidht'
    };
    try {
      gridApi = agGrid.createGrid(gridDiv, gridOptions);
      //console.log("Grid inicializado correctamente");
      window.addEventListener("resize", () => {
        if (gridApi) {
          gridApi.sizeColumnsToFit();
        }
      });
    } catch (error) {
      console.error("Error al inicializar AG-Grid:", error);
    }
  }
  async function startProcessAllServers() {
    console.log("Iniciando proceso de todos los servidores");
    try {
      showLoading();
      const result = await window.electron.processAllServers();
      hideLoading();
      if (result.success) {
        // Mostrar el contenedor del grid
        gridContainer.style.display = "block";
        // Inicializar el grid si aún no se ha hecho
        if (!gridApi) {
          initGrid(gridDiv);
        }
        displayAllServersResults(result.results);
      } else {
        console.error("Error al procesar los servidores:", result.error);
        showErrorMessage("Error al procesar los servidores: " + result.error);
      }
    } catch (error) {
      hideLoading();
      console.error("Error:", error);
      showErrorMessage("Error: " + error.message);
    }
  }
  function displayAllServersResults(results) {
    //console.log("Mostrando resultados de servidores:", results);
    if (gridApi && typeof gridApi.setRowData === "function") {
      const rowData = results.flatMap((serverResult) => {
        if (serverResult.error) {
          showErrorModal(
            `No se realizó la conexión con el servidor: ${
              serverResult.serverName || "Desconocido"
            }`,
            serverResult.ip || "IP desconocida"
          );
          return []; // No añadir nada al grid
        }
        if (serverResult.warning) {
          showErrorModal(
            `Backup Incompleto en servidor: ${
              serverResult.serverName || "Desconocido"
            }`,
            serverResult.ip || "IP desconocida" // Asegúrate de pasar la IP aquí
          );
          return []; // No añadir nada al grid
        }
        const processLogDetail = (logDetail) => {
          if (!logDetail || !logDetail.logFileName) {
            showErrorModal(
              `No se encontró archivo de log para el servidor: ${
                serverResult.serverName || "Desconocido"
              }`,
              serverResult.ip || "IP desconocida"
            );
            return null;
          }
          const status = serverResult.error
            ? "Error"
            : logDetail.logDetails?.success
            ? "Éxito"
            : "Fallo";
          const statusClass =
            status === "Fallo"
              ? "status-failure"
              : status === "Éxito"
              ? "status-success"
              : "status-error";
          const successClass = logDetail.logDetails?.success ? "" : "error-box";
          const totalDmpSize = Array.isArray(logDetail.dumpFileInfo)
            ? logDetail.dumpFileInfo.reduce(
                (sum, file) => sum + (file.fileSize || 0),
                0
              )
            : 0;
          const formattedDmpSize = formatFileSize(totalDmpSize); // Aquí usamos la nueva función
          const formattedFolderSize = logDetail.totalFolderSize
            ? formatFileSize(parseFloat(logDetail.totalFolderSize)) // Si hay tamaño de carpeta, lo formateamos
            : "N/A"; // Si no hay tamaño de carpeta, mostramos "N/A"
          const logInfo = logDetail.logDetails || {};
          const displayedLines = logInfo.hasWarning
            ? logDetail.last10Lines || []
            : [logDetail.lastLine || "No hay información disponible"];
          const groupControlInfo = logInfo.hasWarning
            ? "Ver grupos de control (Advertencia)"
            : "Ver última línea del log";
          return {
            serverName: serverResult.serverName,
            ip: serverResult.ip,
            status: status,
            statusClass: successClass,
            logFileName: logDetail.logFileName || "N/A",
            startTime: logDetail.logDetails?.startTime || "N/A",
            endTime: logDetail.logDetails?.endTime || "N/A",
            duration: logDetail.logDetails?.duration || "N/A",
            totalDmpSize: formattedDmpSize, // Cambiado de formattedDmpSize
            totalFolderSize: formattedFolderSize, // Cambiado de formattedFolderSize
            backupStatus: logDetail.logDetails?.backupStatus || "N/A",
            backupPath: logDetail.backupPath || "N/A",
            oraError: logDetail.logDetails?.oraError
              ? JSON.stringify(logDetail.logDetails.oraError)
              : null,
            statusClass: statusClass,
            last10Lines: displayedLines,
            groupControlInfo: groupControlInfo,
            hasWarning: logInfo.hasWarning,
          };
        };
        if (Array.isArray(serverResult.logDetails)) {
          return serverResult.logDetails
            .map((logDetail) => processLogDetail(logDetail))
            .filter((detail) => detail !== null);
        } else if (serverResult.logDetails) {
          const processed = processLogDetail(serverResult.logDetails);
          return processed ? [processed] : [];
        } else {
          showErrorModal(
            `No se encontraron rutas para el servidor: ${
              serverResult.serverName || "Desconocido"
            }`,
            serverResult.ip || "IP desconocida"
          );
          return [];
        }
      });

      gridApi.setRowData(rowData);
      let tooltipVisible = false;
      // Configurar el evento de clic en celda para mostrar el tooltip de error
      gridApi.addEventListener("cellClicked", (params) => {
        if (
          params.column.colId === "status" &&
          params.data.status !== "Éxito"
        ) {
          const tooltipError =
            document.getElementById("tooltipError") ||
            (() => {
              const div = document.createElement("div");
              div.id = "tooltipError";
              div.classList.add("tooltip-error");
              document.body.appendChild(div);
              return div;
            })();
          if (tooltipVisible) {
            tooltipError.style.display = "none";
            tooltipVisible = false;
            return;
          }
          if (params.data.oraError) {
            const oraError = JSON.parse(params.data.oraError);
            tooltipError.innerHTML = `
                            <p><strong>Error ORA encontrado:</strong></p>
                            <p>${oraError.previousLine}</p>
                            <p><strong>${oraError.errorLine}</strong></p>
                            <p>${oraError.nextLine}</p>
                        `;
          } else {
            tooltipError.textContent =
              "No se encontraron detalles específicos del error.";
          }
          const rect = params.event.target.getBoundingClientRect();
          tooltipError.style.top = `${rect.top + window.scrollY}px`;
          tooltipError.style.left = `${rect.right + 10}px`;
          tooltipError.style.display = "block";
          tooltipVisible = true;
        }
      });
      // Agregar evento para ocultar el tooltip al hacer clic en cualquier lugar
      document.addEventListener("click", (event) => {
        const tooltipError = document.getElementById("tooltipError");
        if (
          tooltipError &&
          tooltipVisible &&
          !tooltipError.contains(event.target)
        ) {
          tooltipError.style.display = "none";
          tooltipVisible = false;
        }
      });
    } else {
      console.warn("Grid API no disponible o setRowData no es una función");
    }
  }

  function showErrorModal(message, ip) {
    console.log("Entrando en showErrorModal");
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0,0,0,0.5)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

    const modalContent = document.createElement("div");
    modalContent.style.backgroundColor = "#fff";
    modalContent.style.padding = "20px";
    modalContent.style.borderRadius = "5px";
    modalContent.style.maxWidth = "80%";

    const errorMessage = document.createElement("p");
    errorMessage.textContent = message;

    const ipMessage = document.createElement("p");
    ipMessage.textContent = `IP: ${ip}`;

    const closeButton = document.createElement("button");
    closeButton.textContent = "Cerrar";
    closeButton.onclick = () => document.body.removeChild(modal);

    modalContent.appendChild(errorMessage);
    modalContent.appendChild(ipMessage);
    modalContent.appendChild(closeButton);
    modal.appendChild(modalContent);

    document.body.appendChild(modal);
  }
  function showErrorMessage(message) {
    console.error("Error:", message);
    alert(message);
  }
  function addLogEntry(logData) {
    if (logEntriesContainer) {
      const entryDiv = document.createElement("div");
      entryDiv.className = "log-entry";
      // Verifica que 'serverName' esté correctamente asignado
      const serverName = logData.serverName || "N/A";
      // Añade este log para verificar el valor en el lado del cliente
      //console.log(
      //"Tamaño de la carpeta recibido (logData.totalFolderSize):",
      //logData.totalFolderSize
      //);
      //console.log("Datos del log:", logData); // Para depuración
      // Si el valor de success es No, aplicar la clase 'error' a todo el párrafo
      const successClass = logData.logDetails.success ? "" : "error-box";
      const totalDmpSize = logData.dumpFileInfo.reduce(
        (sum, file) => sum + file.fileSize,
        0
      );
      const formattedDmpSize = formatFileSize(totalDmpSize); // Aquí usamos la nueva función
      // Manejo de `totalFolderSize` para asegurar que sea un número válido
      const folderSizeValue = Array.isArray(logData.totalFolderSize)
      ? logData.totalFolderSize[0]?.sizeInMB || "N/A"
      : logData.totalFolderSize;
    
    const formattedFolderSize = !isNaN(parseFloat(folderSizeValue))
      ? formatFileSize(parseFloat(folderSizeValue))
      : "Tamaño no disponible";
      // Añadir el estado del backup
      const backupStatus = logData.logDetails.backupStatus || "N/A";
      entryDiv.innerHTML = `
            <p><strong>IP:</strong> ${
              logData.ip
            }<strong> Nombre del servidor:</strong> ${serverName}</p>
            <p><strong>Tiempo de inicio:</strong> ${
              logData.logDetails.startTime || "N/A"
            }</p>
            <p><strong>Tiempo de fin:</strong> ${
              logData.logDetails.endTime || "N/A"
            }</p>
            <p><strong>Estado del backup:</strong> ${backupStatus}</p>
            <p><strong>Duración:</strong> ${
              logData.logDetails.duration || "N/A"
            }</p>
            <!-- Aplica la clase 'error' al párrafo si success es No -->
            <p class="${successClass}"><strong>Exitoso?:</strong> ${
        logData.logDetails.success ? "Yes" : "No"
      }</p>
            <p><strong>Peso total de archivo .dmp:</strong> ${formattedDmpSize}</p> <!-- Aquí -->
            <p><strong>Nombre del archivo .log:</strong> ${
              logData.logFileName || "N/A"
            }</p>
            <p><strong>Ruta del backup:</strong> ${
              logData.backupPath || "N/A"
            } (${formattedFolderSize})</p> <!-- Mostrar tamaño de carpeta aquí -->
        `;
      if (logData.logDetails.oraError) {
        entryDiv.dataset.oraError = JSON.stringify(logData.logDetails.oraError);
      }
      document
        .getElementById("close-result")
        .addEventListener("click", function () {
          const resultDiv = document.getElementById("result");
          if (resultDiv) {
            resultDiv.style.display = "none"; // Oculta el div por completo
          }
        });
      const showLogButton = document.createElement("button");
      showLogButton.textContent = logData.logDetails.hasWarning
        ? "Ver grupos de control (Advertencia)"
        : "Ver última línea del log";
      showLogButton.onclick = () => {
        const linesToShow = logData.logDetails.hasWarning
          ? logData.logDetails.last10Lines
          : [logData.lastLine || "No hay información disponible"];
        showLast10LinesModal(linesToShow, logData.logDetails.hasWarning);
      };
      entryDiv.appendChild(showLogButton);
      // Añadir la línea divisoria después del botón
      const hr = document.createElement("hr");
      entryDiv.appendChild(hr);
      logEntriesContainer.appendChild(entryDiv);
      if (resultDiv) resultDiv.style.display = "block";
    }
  }
  let tooltipError = null;
  if (logEntriesContainer) {
    logEntriesContainer.addEventListener("click", function (event) {
      if (event.target && event.target.classList.contains("error-box")) {
        if (!tooltipError) {
          tooltipError = document.createElement("div");
          tooltipError.classList.add("tooltip-error");
          document.body.appendChild(tooltipError);
        }
        const logEntry = event.target.closest(".log-entry");
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
          tooltipError.textContent =
            "No se encontraron detalles específicos del error.";
        }
        const rect = event.target.getBoundingClientRect();
        tooltipError.style.top = `${rect.top + window.scrollY}px`;
        tooltipError.style.left = `${rect.right + 10}px`;
        tooltipError.style.display = "block";
      }
    });
  }
  // Cerrar la ventana flotante cuando se hace clic fuera de ella
  window.onclick = function (event) {
    if (
      tooltipError &&
      !event.target.classList.contains("error-box") &&
      !tooltipError.contains(event.target)
    ) {
      tooltipError.style.display = "none"; // Esconde el tooltip
      // Eliminar el tooltip si ya no es necesario
      tooltipError.remove();
      tooltipError = null;
    }
  };
  async function exportToExcel(gridApi) {
    // Obtener las columnas visibles, excluyendo 'last10Lines'
    const columns = gridApi
      .getColumns()
      .filter(
        (column) => column.isVisible() && column.getColId() !== "last10Lines"
      )
      .map((column) => ({
        headerName: column.getColDef().headerName,
        field: column.getColId(),
      }));
    // Obtener los datos de las filas
    const rowData = [];
    gridApi.forEachNodeAfterFilterAndSort(function (node) {
      const rowDataFiltered = {};
      columns.forEach((col) => {
        rowDataFiltered[col.field] = node.data[col.field];
      });
      rowData.push(rowDataFiltered);
    });
    const data = {
      columns: columns.map((col) => col.headerName),
      rows: rowData.map((row) => columns.map((col) => row[col.field])),
    };
    const excelBuffer = await window.electron.exportToExcel(data);
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "backup_report.xlsx";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  function showLoadingIndicator() {
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loadingIndicator";
    loadingDiv.textContent = "Exportando...";
    loadingDiv.style.position = "fixed";
    loadingDiv.style.top = "50%";
    loadingDiv.style.left = "50%";
    loadingDiv.style.transform = "translate(-50%, -50%)";
    loadingDiv.style.padding = "20px";
    loadingDiv.style.background = "rgba(0,0,0,0.7)";
    loadingDiv.style.color = "white";
    loadingDiv.style.borderRadius = "5px";
    document.body.appendChild(loadingDiv);
  }
  function hideLoadingIndicator() {
    const loadingDiv = document.getElementById("loadingIndicator");
    if (loadingDiv) {
      document.body.removeChild(loadingDiv);
    }
  }
  async function handleExport(format) {
    if (!gridApi) {
      console.error("Grid API no está disponible");
      return;
    }
    showLoadingIndicator();
    try {
      if (format === "excel") {
        await exportToExcel(gridApi);
      } else {
        console.error("Formato de exportación no soportado");
      }
    } catch (error) {
      console.error("Error durante la exportación:", error);
      // Aquí podrías mostrar un mensaje de error al usuario
    } finally {
      hideLoadingIndicator();
    }
  }
  function showLast10LinesModal(lines, hasWarning) {
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>${
          hasWarning
            ? "Grupos de control (Advertencia)"
            : "Última línea del log"
        }</h2>
        <pre>${Array.isArray(lines) ? lines.join("\n") : lines}</pre>
      </div>
    `;
    document.body.appendChild(modal);
    const closeBtn = modal.querySelector(".close");
    closeBtn.onclick = function () {
      modal.style.display = "none";
      document.body.removeChild(modal);
    };
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
        document.body.removeChild(modal);
      }
    };
    modal.style.display = "block";
  }
  let statisticsModal = null;
  function createStatisticsModal() {
    if (statisticsModal) {
      console.log("Modal de estadísticas ya existe");
      return;
    }
    const modalHTML = `
          <div id="statisticsModal" class="modal">
              <div class="modal-content">
                  <span class="close">&times;</span>
                  <h2>Estadísticas de Backups</h2>
                  <div id="statisticsContent">
                      <p>Total de backups: <span id="totalBackups"></span></p>
                      <p>Backups exitosos: <span id="successfulBackups"></span></p>
                      <p>Duración promedio: <span id="avgDuration"></span> minutos</p>
                      <p>Servidores únicos: <span id="uniqueServers"></span></p>
                      <p>IPs únicas: <span id="uniqueIPs"></span></p>
                      <p>Fecha del último backup: <span id="lastBackupDate"></span></p>
                  </div>
                  <div>
                    <label for="daySelector">Mostrar datos de los últimos:</label>
                    <select id="daySelector">
                      <option value="30" selected>30 días</option>
                      <option value="60">60 días</option>
                      <option value="90">90 días</option>
                    </select>
                  </div>
                  <div>
                    <label for="serverSelector">Seleccionar servidor:</label>
                    <select id="serverSelector">
                      <option value="all">Todos los servidores</option>
                    </select>
                  </div>
                  <div class="hidden">
                    <label for="routeSelector">Seleccionar ruta:</label>
                    <select id="routeSelector">
                      <option value="all">Todas las rutas</option>
                    </select>
                  </div>
                  <div id="dmpSizeChartContainer" style="width: 100%; height: auto;min-height: 400px;">
                    <div id="serverChartsContainer"></div>
                  </div>
              </div>
          </div>
      `;
    const modalStyles = `
          <style>
              .modal {
                  display: none;
                  position: fixed;
                  z-index: 1;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  overflow: auto;
                  background-color: rgba(0,0,0,0.4);
              }
              .modal-content {
                  background-color: #fefefe;
                  margin: 5% auto;
                  padding: 20px;
                  border: 1px solid #888;
                  width: 80%;
                  max-width: 1000px;
                  max-height: auto; 
                  overflow-y: auto; // Permite scroll vertical
              }
              .close {
                  color: #aaa;
                  float: right;
                  font-size: 28px;
                  font-weight: bold;
                  cursor: pointer;
              }
                  .hidden {
  display: none;
}
              .close:hover,
              .close:focus {
                  color: black;
                  text-decoration: none;
                  cursor: pointer;
              }
          </style>
      `;
    // Insertar estilos
    const styleElement = document.createElement("style");
    styleElement.innerHTML = modalStyles;
    document.head.appendChild(styleElement);
    // Insertar HTML del modal
    const modalElement = document.createElement("div");
    modalElement.innerHTML = modalHTML;
    document.body.appendChild(modalElement.firstElementChild);
    statisticsModal = document.getElementById("statisticsModal");
    console.log("Modal de estadísticas creado");
  }
  async function showStatistics() {
    try {
      if (!statisticsModal) {
        console.log("Creando modal de estadísticas");
        createStatisticsModal();
      }
      if (!statisticsModal) {
        console.error("No se pudo crear el modal de estadísticas");
        alert(
          "Error al mostrar las estadísticas. Por favor, intenta de nuevo."
        );
        return;
      }

      const stats = await window.electron.getBackupStatistics();
      console.log("Estadísticas recibidas:", stats);

      // Actualizar estadísticas generales
      const formatValue = (value, formatter) => {
        if (value === null || value === undefined || isNaN(value)) {
          return "N/A";
        }
        return formatter(value);
      };

      const safelyUpdateContent = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = value;
        } else {
          console.warn(`Elemento con id '${id}' no encontrado`);
        }
      };

      const [
        totalBackups,
        successfulBackups,
        avgDurationSeconds,
        uniqueServers,
        uniqueIPs,
        lastBackupDate,
      ] = stats;

      safelyUpdateContent(
        "totalBackups",
        formatValue(totalBackups, (v) => v.toString())
      );
      safelyUpdateContent(
        "successfulBackups",
        `${formatValue(successfulBackups, (v) => v.toString())} (${formatValue(
          successfulBackups / totalBackups,
          (v) => (v * 100).toFixed(2)
        )}%)`
      );
      safelyUpdateContent(
        "avgDuration",
        formatValue(avgDurationSeconds, (v) => (v / 60).toFixed(2))
      );
      safelyUpdateContent(
        "uniqueServers",
        formatValue(uniqueServers, (v) => v.toString())
      );
      safelyUpdateContent(
        "uniqueIPs",
        formatValue(uniqueIPs, (v) => v.toString())
      );
      safelyUpdateContent(
        "lastBackupDate",
        formatValue(lastBackupDate, (v) => new Date(v).toLocaleString())
      );

      let globalDmpSizeData = [];

      const updateCharts = async (
        selectedDays,
        selectedServer,
        selectedRoute
      ) => {
        if (
          globalDmpSizeData.length === 0 ||
          selectedDays !== window.lastSelectedDays
        ) {
          const result = await window.electron.getDmpSizeData(selectedDays);
          globalDmpSizeData = result.data;
          window.lastSelectedDays = selectedDays;
        }

        console.log("Datos de tamaño DMP recibidos:", globalDmpSizeData);

        if (globalDmpSizeData.length === 0) {
          console.warn("No hay datos de tamaño DMP para mostrar");
          return;
        }

        // Filtrar datos según las selecciones
        let filteredData = globalDmpSizeData;
        if (selectedServer !== "all") {
          const [serverName, ip] = selectedServer.split(" - ");
          filteredData = filteredData.filter(
            (d) => d.serverName === serverName && d.ip === ip
          );
        }

        const chartContainer = document.getElementById("dmpSizeChartContainer");
        chartContainer.innerHTML = ""; // Limpiar gráficos existentes

        filteredData.forEach((serverData) => {
          console.log("Datos para el gráfico:", serverData);
          const canvasId = `chart-${serverData.identifier}`.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          );
          const canvasElement = document.createElement("canvas");
          canvasElement.id = canvasId;
          chartContainer.appendChild(canvasElement);

          const ctx = canvasElement.getContext("2d");

          const sortedData = serverData.data.sort(
            (a, b) => new Date(a.fecha) - new Date(b.fecha)
          );

          new Chart(ctx, {
            type: "line",
            data: {
              datasets: [
                {
                  label: serverData.identifier,
                  data: sortedData.map((d) => ({
                    x: new Date(d.fecha),
                    y: d.tamanoDMP,
                  })),
                  fill: false,
                  borderColor: getRandomColor(),
                  tension: 0.1,
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                tooltip: {
                  callbacks: {
                    label: function (context) {
                      const date = new Date(context.parsed.x);
                      const formattedDate = date.toLocaleString("es-PE", {
                        timeZone: "America/Lima",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      });
                      return `${formattedDate}: ${context.parsed.y.toFixed(
                        2
                      )} GB`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  type: "time",
                  time: {
                    unit: "day",
                    displayFormats: {
                      day: "dd/MM/yyyy",
                    },
                    tooltipFormat: "dd/MM/yyyy",
                  },
                  ticks: {
                    source: "data",
                    autoSkip: false,
                    maxRotation: 45,
                    minRotation: 45,
                    callback: function (value, index, values) {
                      const date = new Date(value);
                      return date.toLocaleDateString("es-PE", {
                        timeZone: "America/Lima",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                    },
                  },
                  distribution: "linear",
                  title: {
                    display: true,
                    text: "Fecha",
                  },
                },
                y: {
                  title: {
                    display: true,
                    text: "Tamaño (GB)",
                  },
                  ticks: {
                    callback: function (value) {
                      return value.toFixed(2);
                    },
                  },
                },
              },
            },
          });
        });
      };

      const populateSelectors = (result) => {
        const serverSelector = document.getElementById("serverSelector");
        const routeSelector = document.getElementById("routeSelector");

        // Limpiar opciones existentes
        serverSelector.innerHTML =
          '<option value="all">Todos los servidores</option>';
        routeSelector.innerHTML =
          '<option value="all">Todas las rutas</option>';

        console.log(
          "Todos los servidores y rutas:",
          result.allServersAndRoutes
        );
        console.log("Datos procesados:", result.data);

        // Crear un conjunto de servidores únicos
        const uniqueServers = new Set();
        result.allServersAndRoutes.forEach((server) => {
          uniqueServers.add(`${server.serverName} - ${server.ip}`);
        });

        // Llenar el selector de servidores
        uniqueServers.forEach((serverString) => {
          const option = document.createElement("option");
          option.value = serverString;
          option.textContent = serverString;
          serverSelector.appendChild(option);
        });

        // Configurar event listener para el selector de servidores
        serverSelector.addEventListener("change", () => {
          const selectedServer = serverSelector.value;
          routeSelector.innerHTML =
            '<option value="all">Todas las rutas</option>';

          if (selectedServer !== "all") {
            const [serverName, ip] = selectedServer.split(" - ");
            const serverRoutes = result.allServersAndRoutes.filter(
              (s) => s.serverName === serverName && s.ip === ip
            );
            serverRoutes.forEach((route) => {
              const option = document.createElement("option");
              option.value = route.backupPath;
              option.textContent = route.backupPath;
              routeSelector.appendChild(option);
            });
          }

          updateCharts(
            parseInt(daySelector.value),
            selectedServer,
            routeSelector.value
          );
        });

        // Configurar event listener para el selector de rutas
        routeSelector.addEventListener("change", () => {
          updateCharts(
            parseInt(daySelector.value),
            serverSelector.value,
            routeSelector.value
          );
        });
      };

      // Configurar el selector de días
      const daySelector = document.getElementById("daySelector");
      if (daySelector) {
        daySelector.addEventListener("change", () => {
          updateCharts(
            parseInt(daySelector.value),
            serverSelector.value,
            routeSelector.value
          );
        });
      } else {
        console.warn("Selector de días no encontrado");
      }

      // Inicializar el gráfico y los selectores con 30 días por defecto
      const initialResult = await window.electron.getDmpSizeData(30);
      console.log(
        "Estructura completa de initialResult:",
        JSON.stringify(initialResult, null, 2)
      );
      populateSelectors(initialResult);
      await updateCharts(30, "all", "all");

      statisticsModal.style.display = "block";
      statisticsModal.offsetHeight;

      // Configurar el cierre del modal
      const closeBtn = statisticsModal.querySelector(".close");
      if (closeBtn) {
        closeBtn.onclick = function () {
          statisticsModal.style.display = "none";
        };
      } else {
        console.warn("Botón de cierre no encontrado en el modal");
      }
      window.onclick = function (event) {
        if (event.target == statisticsModal) {
          statisticsModal.style.display = "none";
        }
      };
    } catch (error) {
      console.error("Error al obtener o mostrar estadísticas:", error);
      alert(
        "Error al obtener o mostrar estadísticas. Por favor, revisa la consola para más detalles."
      );
    }
  }
  function getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const form = document.getElementById("server-form");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      showLoading(); // Mostrar loading overlay
      const ip = ipSelect.value;
      const username = form.username.value;
      const password = form.password.value;
      const port = form.port.value;
      // Guardar los datos de conexión en el almacenamiento local
      window.localStorage.setItem(
        "connectionData",
        JSON.stringify({ os, ip, port, username, password })
      );
      try {
        const connectionResult = await window.electron.connectToServer(
          ip,
          port,
          username,
          password
        );
        console.log("Resultado de conexión:", connectionResult);
        if (!connectionResult.success) {
          throw new Error("Error al intentar conectar con el servidor"); // Si la conexión falla, lanzar el error devuelto
        }
        console.log("Connection successful");
        // Verificar las credenciales del usuario
        const result = await window.electron.verifyCredentials(
          ip,
          username,
          password
        );
        console.log("Resultado de verificación de credenciales:", result);
        if (!result.success) {
          throw new Error(result.message); // Lanzar error si la verificación falla
        }
        const os = result.osType;

        // Si el sistema operativo ha cambiado, limpiamos los logs anteriores
        if (currentOS !== os) {
          clearLogEntries();
          currentOS = os; // Actualizamos el sistema operativo actual
        }

        // Obtener las rutas de backup desde la base de datos usando la IP seleccionada
        const backupRoutes = await window.electron.getBackupRoutesByIP(ip);
        let directoryPath = "";
        // Si se encuentran rutas, buscar la correcta según el sistema operativo
        if (backupRoutes.length > 0) {
          const matchingRoute = backupRoutes.find((route) => route.os === os);
          if (matchingRoute) {
            directoryPath = matchingRoute.backupPath; // Asignamos la ruta correcta
            //console.log(`Ruta de backup encontrada: ${directoryPath}`);
          } else {
            showAuthErrorModal(
              `No se encontraron rutas para el sistema operativo ${os}`
            );
            return;
          }
        } else {
          showAuthErrorModal("No se encontraron rutas de backup para esta IP.");
          return;
        }

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
        console.log("logDetailsArray:", logDetailsArray);
        // Verifica si hay elementos en logDetailsArray
        // Antes del bucle que procesa los detalles del log
        let hasShownBackupIncompleteError = false;
        // Procesar los detalles del log
        if (Array.isArray(logDetailsArray)) {
          for (const logData of logDetailsArray) {
            //console.log("Adding log entry:", logData);
            if (logData.backupIncomplete === true && !hasShownBackupIncompleteError) {
              console.log("Mostrando modal de error por backup incompleto");
              showErrorModal(
                `Backup Incompleto: Se esperaban 7 carpetas pero se encontraron ${logData.foundFolders}`,
                ip
              );
              hasShownBackupIncompleteError = true; // Marcamos que ya se mostró el modal
            }
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
          if (logDetailsArray.backupIncomplete === true && !hasShownBackupIncompleteError) {
            console.log("Mostrando modal de error por backup incompleto");
            showErrorModal(
              `Backup Incompleto: Se esperaban 7 carpetas pero se encontraron ${logDetailsArray.foundFolders}`,
              ip
            );
            hasShownBackupIncompleteError = true; // Marcamos que ya se mostró el modal
          }
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
          throw new Error("Formato de log inesperado.");
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
