let mainGridApi = null;
let postgresGridApi = null;
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

  if (currentPage.includes("index.html")) {
    document
      .getElementById("verify-connection-btn")
      .addEventListener("click", async () => {
        // Obtén los valores del formulario
        const ip = document.getElementById("ip").value;
        const port = document.getElementById("port").value || 22; // Usa 22 como puerto por defecto
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
          // Llama a la función de conexión en el backend usando ipcRenderer
          const result = await window.electron.connectToServer(
            ip,
            port,
            username,
            password
          );

          if (result.success) {
            showCustomAlert("Conexión existosa al servidor");
          } else {
            showCustomAlert(`Error en la conexión: ${result.message}`);
          }
        } catch (error) {
          console.error("Error al intentar conectar:", error);
          showCustomAlert("Ocurrió un error inesperado al intentar conectar.");
        }
      });
  }
  if (exportExcelButton) {
    exportExcelButton.addEventListener("click", () => handleExport("excel"));
  }
  // Verifica si estamos en la página index.html
  if (currentPath.endsWith("index.html") || currentPath === "/") {
    createStatsButton();
  }
  // Función para mostrar un modal no bloqueante
  function showCustomAlert(message) {
    const modal = document.createElement("div");
    modal.className = "custom-alert"; // Agregar la clase al modal
    modal.innerHTML = `
    <div class="custom-alert-content">
      <span class="close-btn">&times;</span>
      <p>${message}</p>
      <button id="close-modal-btn">Cerrar</button>
    </div>
  `;

    // Estilos para el modal
    const styles = `
    .custom-alert {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: #b8f6fc; /* Color de fondo */
      color: #721c24; /* Color del texto */
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      width: 80%;
      max-width: 400px; /* Limitar tamaño máximo */
      text-align: center;
    }

    .custom-alert-content {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .custom-alert button {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 16px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 10px;
    }

    .custom-alert button:hover {
      background-color: #0056b3;
    }

    .custom-alert .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 24px;
      cursor: pointer;
      color: #721c24;
    }

    .custom-alert .close-btn:hover {
      color: #000;
    }
  `;

    // Añadir los estilos al documento
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Mostrar el modal
    document.body.appendChild(modal);

    // Añadir evento para cerrar el modal
    const closeModalBtn = modal.querySelector("#close-modal-btn");
    const closeBtn = modal.querySelector(".close-btn");

    closeModalBtn.addEventListener("click", () => {
      modal.remove();
    });

    closeBtn.addEventListener("click", () => {
      modal.remove();
    });
  }

  // Función para mostrar el modal de confirmación de eliminación
  function showConfirmDeleteModal(message) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "custom-alert";
      modal.innerHTML = `
      <div class="custom-alert-content">
        <span class="close-btn">&times;</span>
        <p>${message}</p>
        <button id="confirm-btn">Sí, eliminar</button>
        <button id="cancel-btn">Cancelar</button>
      </div>
    `;

      // Estilos para el modal
      const styles = `
      .custom-alert {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #b8f6fc;
        color: #333;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        z-index: 1001;
        width: 80%;
        max-width: 400px;
        text-align: center;
      }

      .custom-alert .custom-alert-content {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .custom-alert .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        font-size: 24px;
        cursor: pointer;
        color: #721c24;
      }

      .custom-alert .close-btn:hover {
        color: #000;
      }

      .custom-alert button {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        font-size: 16px;
        border-radius: 5px;
        cursor: pointer;
        margin: 10px;
      }

      .custom-alert button:hover {
        background-color: #0056b3;
      }
    `;

      // Añadir los estilos al documento
      const styleSheet = document.createElement("style");
      styleSheet.innerText = styles;
      document.head.appendChild(styleSheet);

      // Mostrar el modal
      document.body.appendChild(modal);

      // Función para cerrar el modal
      const closeModal = () => {
        modal.remove();
      };

      // Añadir evento para cerrar el modal
      const closeBtn = modal.querySelector(".close-btn");
      closeBtn.addEventListener("click", closeModal);

      // Evento para el botón de confirmar
      const confirmBtn = modal.querySelector("#confirm-btn");
      confirmBtn.addEventListener("click", () => {
        resolve(true); // Responde con 'true' si confirma
        closeModal();
      });

      // Evento para el botón de cancelar
      const cancelBtn = modal.querySelector("#cancel-btn");
      cancelBtn.addEventListener("click", () => {
        resolve(false); // Responde con 'false' si cancela
        closeModal();
      });
    });
  }
  function createStatsButton() {
    const statsButton = document.createElement("button");
    statsButton.id = "showStatsButton";
    statsButton.onclick = showStatistics;

    // Crear el ícono para el botón de estadísticas
    const statsIcon = document.createElement("i");
    statsIcon.className = "fas fa-chart-bar";

    // Agregar el ícono y el texto al botón
    statsButton.appendChild(statsIcon);
    statsButton.appendChild(document.createTextNode("Estadísticas"));
    statsButton.style.padding = "5px 10px";
    statsButton.style.marginLeft = "10px";

    const historyButton = document.createElement("button");
    historyButton.id = "showHistoryButton";
    historyButton.onclick = showHistory;

    // Crear el ícono para el botón de historial
    const historyIcon = document.createElement("i");
    historyIcon.className = "fas fa-history";

    // Agregar el ícono y el texto al botón
    historyButton.appendChild(historyIcon);
    historyButton.appendChild(document.createTextNode("Historial"));
    historyButton.style.padding = "5px 10px";
    historyButton.style.marginLeft = "10px";

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
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const controlContainer = document.createElement("div");
    controlContainer.style.display = "flex";
    controlContainer.style.alignItems = "center";
    controlContainer.style.justifyContent = "flex-end";

    const thresholdLabel = document.createElement("label");
    thresholdLabel.textContent = "Umbral de Advertencia:";
    thresholdLabel.setAttribute("for", "warningThresholdInput");
    thresholdLabel.style.marginRight = "10px";

    const thresholdInput = document.createElement("input");
    thresholdInput.type = "number";
    thresholdInput.id = "warningThresholdInput";
    thresholdInput.placeholder = "Umbral de Advertencia (ej: 90)";
    thresholdInput.style.marginRight = "10px";
    thresholdInput.value = 90;

    controlContainer.appendChild(thresholdLabel);
    controlContainer.appendChild(thresholdInput);
    controlContainer.appendChild(statsButton);
    controlContainer.appendChild(historyButton);

    topBar.appendChild(controlContainer);
    document.body.insertBefore(topBar, document.body.firstChild);
    document.body.style.marginTop = "50px";

    thresholdInput.addEventListener("input", () => {
      const thresholdValue = parseInt(thresholdInput.value, 10) || 90;
      window.electron.send("update-threshold", thresholdValue);
    });
  }
  async function showHistory() {
    const modal = document.createElement("div");
    modal.id = 'historyModal'
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1001";

    const content = document.createElement("div");
    content.style.position = "relative";
    content.style.backgroundColor = "#fff";
    content.style.padding = "20px";
    content.style.borderRadius = "8px";
    content.style.width = "90%";
    content.style.height = "90%";
    content.style.overflowY = "auto";

    const title = document.createElement("h2");
    title.textContent = "Historial de Verificaciones";
    content.appendChild(title);

    const closeXButton = document.createElement("button");
    closeXButton.textContent = "✕";
    closeXButton.style.position = "absolute";
    closeXButton.style.top = "10px";
    closeXButton.style.right = "10px";
    closeXButton.style.background = "black";
    closeXButton.style.border = "none";
    closeXButton.style.fontSize = "15px";
    closeXButton.style.cursor = "pointer";
    closeXButton.onclick = () => document.body.removeChild(modal);
    content.appendChild(closeXButton);

    // Contenedor del DatePicker y botones de navegación
    const dateWrapper = document.createElement("div");
    dateWrapper.style.display = "flex";
    dateWrapper.style.alignItems = "center";
    dateWrapper.style.marginBottom = "10px";
    dateWrapper.style.gap = "5px";

    const dateInput = document.createElement("input");
    dateInput.type = "text";
    dateInput.readOnly = true;

    let selectedDate = new Date();
    const updateDateInput = () => {
      dateInput.value = selectedDate.toLocaleDateString("es-ES");
    };

    updateDateInput(); // Inicializar con la fecha actual

    flatpickr(dateInput, {
      dateFormat: "d/m/Y",
      locale: "es",
      defaultDate: selectedDate,
      onChange: async (selectedDates) => {
        selectedDate = selectedDates[0];
        updateDateInput();
        await loadHistoryData(selectedDate.toISOString().split('T')[0], resultsContainer);
      }
    });

    // Botón para ir al día anterior
    const prevButton = document.createElement("button");
    prevButton.textContent = "◀";
    prevButton.onclick = async () => {
      selectedDate.setDate(selectedDate.getDate() - 1);
      updateDateInput();
      dateInput._flatpickr.setDate(selectedDate, true);
      await loadHistoryData(selectedDate.toISOString().split('T')[0], resultsContainer);
    };

    // Botón para ir al día siguiente
    const nextButton = document.createElement("button");
    nextButton.textContent = "▶";
    nextButton.onclick = async () => {
      selectedDate.setDate(selectedDate.getDate() + 1);
      updateDateInput();
      dateInput._flatpickr.setDate(selectedDate, true);
      await loadHistoryData(selectedDate.toISOString().split('T')[0], resultsContainer);
    };

    dateWrapper.appendChild(prevButton);
    dateWrapper.appendChild(dateInput);
    dateWrapper.appendChild(nextButton);
    content.appendChild(dateWrapper);

    const filterButton = document.createElement("button");
    filterButton.textContent = "Filtrar por Fecha de ejecución";
    filterButton.style.marginLeft = "10px";
    filterButton.onclick = async () => {
      const selected = dateInput._flatpickr.selectedDates[0];
      const formattedForAPI = selected.toISOString().split('T')[0];
      await loadHistoryData(formattedForAPI, resultsContainer);
    };
    content.appendChild(filterButton);

    const resultsContainer = document.createElement("div");
    resultsContainer.style.marginTop = "20px";
    resultsContainer.style.width = "100%";
    resultsContainer.style.height = "75vh";
    resultsContainer.style.overflowY = "auto";
    content.appendChild(resultsContainer);

    // Crear un contenedor para los botones
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "center";
    buttonContainer.style.gap = "15px"; // Espacio entre botones
    buttonContainer.style.marginTop = "20px";
    buttonContainer.style.marginBottom = "10px";

    // Mejorar el botón de exportación a Excel
    const exportButton = document.createElement("button");
    exportButton.id = "exportHistoryExcel";
    exportButton.textContent = "Exportar a Excel";
    exportButton.style.padding = "12px 20px";
    exportButton.style.backgroundColor = "#3498db";
    exportButton.style.color = "white";
    exportButton.style.border = "none";
    exportButton.style.borderRadius = "5px";
    exportButton.style.cursor = "pointer";
    exportButton.style.fontWeight = "600";
    exportButton.style.fontSize = "16px";
    exportButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
    exportButton.style.transition = "background-color 0.3s";

    // Agregar efecto hover con JavaScript
    exportButton.addEventListener("mouseover", () => {
      exportButton.style.backgroundColor = "#2980b9"; // Color más oscuro al pasar el mouse
    });
    exportButton.addEventListener("mouseout", () => {
      exportButton.style.backgroundColor = "#3498db"; // Color original al quitar el mouse
    });

    exportButton.addEventListener("click", () => {
      // El código existente para la exportación
      const gridApiToUse =
        resultsContainer.querySelector('.ag-theme-alpine')?.gridApi ||
        resultsContainer.gridApi ||
        Array.from(resultsContainer.children)
          .find(child => child.classList.contains('ag-theme-alpine'))?.gridApi;

      if (gridApiToUse) {
        exportHistoryToExcel(gridApiToUse, selectedDate);
      } else {
        console.error("Grid API no disponible para exportación");
        alert("No se puede exportar en este momento. Inténtelo de nuevo.");
      }
    });
    // Mejorar el botón de cerrar
    const closeButton = document.createElement("button");
    closeButton.textContent = "Cerrar";
    closeButton.style.padding = "12px 20px";
    closeButton.style.backgroundColor = "#95a5a6"; // Color gris para el botón secundario
    closeButton.style.color = "white";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "5px";
    closeButton.style.cursor = "pointer";
    closeButton.style.fontWeight = "600";
    closeButton.style.fontSize = "16px";
    closeButton.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
    closeButton.style.transition = "background-color 0.3s";

    // Agregar efecto hover con JavaScript
    closeButton.addEventListener("mouseover", () => {
      closeButton.style.backgroundColor = "#7f8c8d"; // Color más oscuro al pasar el mouse
    });
    closeButton.addEventListener("mouseout", () => {
      closeButton.style.backgroundColor = "#95a5a6"; // Color original al quitar el mouse
    });

    closeButton.onclick = () => document.body.removeChild(modal);

    // Agregar los botones al contenedor
    buttonContainer.appendChild(exportButton);
    buttonContainer.appendChild(closeButton);
    // Agregar el contenedor de botones al contenido principal
    content.appendChild(buttonContainer);

    modal.appendChild(content);
    document.body.appendChild(modal);


    // Cargar datos iniciales
    const formattedForAPI = selectedDate.toISOString().split('T')[0];
    await loadHistoryData(formattedForAPI, resultsContainer);

  }

  async function loadHistoryData(date, container) {
    try {
      // Llamar ambos handles en paralelo
      const [oracleData, postgresData] = await Promise.all([
        window.electron.getVerificationHistory(date),
        window.electron.getPostgresHistory(date)
      ]);

      // Unir los datos
      const historyData = oracleData.concat(postgresData);

      // Ordenar por fecha descendente
      historyData.sort((a, b) => new Date(b.executionDate) - new Date(a.executionDate));

      container.innerHTML = "";
      if (!historyData.length) {
        container.innerHTML = "<p>No hay verificaciones para esta fecha.</p>";
        return;
      }

      const gridDiv = document.createElement("div");
      gridDiv.classList.add("ag-theme-alpine"); // Aplica el tema Balham
      gridDiv.style.width = "100%";
      gridDiv.style.height = "100%";
      container.appendChild(gridDiv);

      const columnDefs = [
        {
          headerName: "Fecha de Ejecución",
          field: "executionDate",
          sortable: true,
          filter: true,
          minWidth: 180,
          cellRenderer: (params) => {
            const dateDiv = document.createElement("div");
            dateDiv.classList.add("server-cell");

            // Llamamos al valueFormatter para obtener la fecha con el formato deseado
            const formattedDate = new Date(params.data.executionDate);
            const formattedDateString = formattedDate.toLocaleString("es-ES", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });

            dateDiv.textContent = formattedDateString; // Muestra la fecha formateada
            dateDiv.style.cursor = "pointer"; // Agrega el cursor pointer para indicar que es clickeable

            // Agregar evento de clic para mostrar el modal con los detalles
            dateDiv.addEventListener("click", () => {
              console.log("Clic en Servidor:", params.data.serverName);
              showServerDetailsModal(params.data); // Llamar a la función para mostrar el modal con los datos del servidor
            });

            return dateDiv;
          },
        },
        {
          headerName: "Servidor",
          field: "serverName", // Coloca el nombre del servidor aquí
          sortable: true,
          filter: true,
          minWidth: 180,
          cellRenderer: (params) => {
            const serverDiv = document.createElement("div");
            serverDiv.classList.add("server-cell");
            serverDiv.textContent = `${params.data.serverName}`; // Muestra el nombre del servidor
            serverDiv.style.cursor = "pointer"; // Agrega el cursor pointer para indicar que es clickeable

            // Agregar evento de clic para mostrar el modal con los detalles
            serverDiv.addEventListener("click", () => {
              console.log("Clic en Servidor:", params.data.serverName);
              showServerDetailsModal(params.data); // Llamar a la función para mostrar el modal con los datos del servidor
            });

            return serverDiv;
          },
        },
        {
          headerName: "IP",
          field: "ip",
          sortable: true,
          filter: true,
          minWidth: 120,
          cellRenderer: (params) => {
            const ipDiv = document.createElement("div");
            ipDiv.classList.add("server-cell");
            ipDiv.textContent = `${params.data.ip}`; // Muestra el nombre del servidor
            ipDiv.style.cursor = "pointer"; // Agrega el cursor pointer para indicar que es clickeable

            ipDiv.addEventListener("click", () => {
              console.log("Clic en Servidor:", params.data.serverName);
              showServerDetailsModal(params.data); // Llamar a la función para mostrar el modal con los datos del servidor
            });
            return ipDiv;
          },
        },
        {
          headerName: "Estado",
          field: "success",
          sortable: true,
          filter: true,
          minWidth: 120,
          headerTooltip: "1 = Éxito, 0 = Fallo",
          cellRenderer: (params) => {
            const statusText = params.value === 1 ? "Éxito" : "Fallo";
            const statusClass =
              params.value === 1 ? "status-success" : "status-failure";
            const oraErrorMessage = params.data.oraErrorMessage;

            // Crear el elemento para el estado
            const statusDiv = document.createElement("div");
            statusDiv.classList.add(statusClass);
            statusDiv.textContent = statusText;
            statusDiv.style.cursor = "pointer"; // Indicar que es clicable

            if (params.value === 0 && oraErrorMessage) {
              statusDiv.classList.add("error-box");

              // Registrar el evento de clic
              statusDiv.addEventListener("click", (event) => {
                console.log("Click detectado en estado 'Fallo'");
                console.log("Contenido de oraErrorMessage:", oraErrorMessage);

                // Crear el tooltip
                const tooltipError = document.createElement("div");
                tooltipError.classList.add("tooltip-error");

                // Verificar si es un string JSON
                if (typeof oraErrorMessage === 'string' && oraErrorMessage.startsWith('{')) {
                  try {
                    // Intentar parsear como JSON
                    const errorObj = JSON.parse(oraErrorMessage);

                    // Usar HTML para formatear mejor el error
                    tooltipError.innerHTML = '';

                    if (errorObj.previousLine) {
                      const prevLine = document.createElement("div");
                      prevLine.innerHTML = '<strong style="color:#855;">Línea anterior:</strong> <div style="margin-bottom:8px; padding-left:10px;">' + errorObj.previousLine + '</div>';
                      tooltipError.appendChild(prevLine);
                    }

                    if (errorObj.errorLine) {
                      const errorLine = document.createElement("div");
                      errorLine.innerHTML = '<strong style="color:#a22;">Error:</strong> <div style="margin-bottom:8px; padding-left:10px; color:#a22; font-weight:bold;">' + errorObj.errorLine + '</div>';
                      tooltipError.appendChild(errorLine);
                    }

                    if (errorObj.nextLine) {
                      const nextLine = document.createElement("div");
                      nextLine.innerHTML = '<strong style="color:#855;">Línea siguiente:</strong> <div style="padding-left:10px;">' + errorObj.nextLine + '</div>';
                      tooltipError.appendChild(nextLine);
                    }
                  } catch (e) {
                    // Si falla el parseo, mostrar el texto original
                    tooltipError.textContent = oraErrorMessage;
                  }
                } else {
                  tooltipError.textContent = oraErrorMessage;
                }

                // Añadir el tooltip al documento
                document.body.appendChild(tooltipError);
                console.log("Tooltip creado y añadido al DOM");

                // Aplicar estilos al tooltip
                tooltipError.style.position = "fixed";
                tooltipError.style.top = `${event.clientY + 10}px`;
                tooltipError.style.left = `${event.clientX + 10}px`;
                tooltipError.style.backgroundColor = "#f8d7da";
                tooltipError.style.color = "#721c24";
                tooltipError.style.padding = "15px";
                tooltipError.style.border = "1px solid #f5c6cb";
                tooltipError.style.borderRadius = "5px";
                tooltipError.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";
                tooltipError.style.zIndex = "10000";
                tooltipError.style.display = "block";
                tooltipError.style.opacity = "1";
                tooltipError.style.maxWidth = "500px"; // Aumentado para mensajes largos
                tooltipError.style.wordWrap = "break-word";
                tooltipError.style.maxHeight = "350px";
                tooltipError.style.overflowY = "auto";
                tooltipError.style.lineHeight = "1.5";


                console.log(
                  "Estilos aplicados al tooltip:",
                  tooltipError.style
                );

                // Cerrar el tooltip al hacer clic fuera
                const closeTooltip = (e) => {
                  if (!tooltipError.contains(e.target)) {
                    console.log("Cerrando tooltip");
                    tooltipError.remove();
                    document.removeEventListener("click", closeTooltip);
                  }
                };

                // Escuchar clics fuera del tooltip para cerrarlo
                setTimeout(() => {
                  document.addEventListener("click", closeTooltip);
                }, 100);
              });
            }

            return statusDiv;
          },
        },
        {
          headerName: "Archivo de Log",
          field: "logFileName",
          sortable: true,
          filter: true,
          minWidth: 300,
          cellRenderer: (params) => {
            const logDiv = document.createElement("div");
            logDiv.classList.add("server-cell");
            logDiv.textContent = `${params.data.logFileName}`; // Muestra el nombre del servidor
            logDiv.style.cursor = "pointer"; // Agrega el cursor pointer para indicar que es clickeable

            logDiv.addEventListener("click", () => {
              console.log("Clic en Servidor:", params.data.logFileName);
              showServerDetailsModal(params.data); // Llamar a la función para mostrar el modal con los datos del servidor
            });
            return logDiv;
          },
        },
        {
          headerName: "Hora de Inicio",
          field: "horaINI",
          sortable: true,
          filter: true,
          minWidth: 180,
          valueFormatter: (params) => {
            const date = new Date(params.value);
            return date.toLocaleString("es-ES", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          },
        },
        {
          headerName: "Hora de Fin",
          field: "horaFIN",
          sortable: true,
          filter: true,
          minWidth: 180,
          valueFormatter: (params) => {
            const date = new Date(params.value);
            return date.toLocaleString("es-ES", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          },
        },
        {
          headerName: "Duración",
          field: "duration",
          sortable: true,
          filter: true,
          minWidth: 150,
        },
        {
          headerName: "Tamaño Total DMP",
          field: "dumpFileSize",
          sortable: true,
          filter: true,
          minWidth: 200,
        },
        {
          headerName: "Tamaño Total Carpeta",
          field: "totalFolderSize",
          sortable: true,
          filter: true,
          minWidth: 200,
        },
        {
          headerName: "Estado de Backup",
          field: "backupStatus",
          sortable: true,
          filter: true,
          minWidth: 200,
        },
        {
          headerName: "Ruta de Backup",
          field: "backupPath",
          sortable: true,
          filter: true,
          minWidth: 170,
        },
        {
          headerName: "Grupo de control",
          field: "last10Lines",
          minWidth: 250,
          cellRenderer: (params) => {
            const button = document.createElement("button");

            // Comprobamos si el servidor es "WebContent" o "Contratacion digital" y la ruta específica
            const isSpecialServer =
              params.data.serverName === "WebContent" ||
              (params.data.serverName === "Contratacion digital" &&
                params.data.backupPath === "/disco6/BK_RMAN_CONTRADIGI") || (params.data.serverName === "BIOMETRIA" &&
                  params.data.backupPath === "/adicional_new/BK_RMAN_BIOME/BK_RMAN_FULL");

            // Es un backup de PostgreSQL si osType lo indica
            const isPostgres = params.data.osType && params.data.osType.toLowerCase().includes('postgres');

            // Si es PostgreSQL y hay error, mostrar botón para ver error
            if (isPostgres && params.data.oraErrorMessage && params.data.oraErrorMessage !== "Sin errores") {
              button.innerHTML = "Ver error";
              button.addEventListener("click", () => {
                showLast10LinesModal(params.data.oraErrorMessage);
              });
            }
            // Si es un servidor especial RMAN de Oracle
            else if (isSpecialServer) {
              button.innerHTML = "Ver error";
              button.addEventListener("click", () => {
                const errorMessage =
                  params.data.oraErrorMessage || "Sin errores detectados";
                showLast10LinesModal(errorMessage);
              });
            } else {
              // Caso general Oracle
              if (
                params.data.groupControlInfo &&
                params.data.groupControlInfo.includes("Job")
              ) {
                button.innerHTML = "Ver última línea del log";
              } else {
                button.innerHTML = "Ver advertencias";
              }
              button.addEventListener("click", () => {
                const contentToShow =
                  params.data.groupControlInfo ||
                  params.data.oraErrorMessage ||
                  "No disponible";
                showLast10LinesModal(contentToShow);
              });
            }
            return button;
          },
        },
      ];

      const gridOptions = {
        columnDefs,
        rowData: historyData,
        pagination: true,
        paginationPageSize: 10,
        domLayout: "autoHeight",
        defaultColDef: {
          resizable: true,
          sortable: true,
          filter: true,
        },
        onGridReady: (params) => {
          params.api.sizeColumnsToFit();
          container.gridApi = params.api;
          gridDiv.gridApi = params.api;
        },
        onFirstDataRendered: (params) => {
          params.api.sizeColumnsToFit(); // Ajusta las columnas al tamaño del contenedor al renderizar los datos
        },
      };

      // Inicializar el grid con las opciones configuradas
      new agGrid.Grid(gridDiv, gridOptions);

      // Ajustar el tamaño de las columnas automáticamente al redimensionar la ventana
      window.addEventListener("resize", () => {
        gridOptions.api.sizeColumnsToFit();
      });
    } catch (error) {
      console.error("Error al cargar el historial de verificaciones:", error);
      container.innerHTML = "<p>Error al cargar el historial.</p>";
    }
  }
  // Función para exportar a Excel
  function exportHistoryToExcel(gridApi, selectedDate) {
    if (!gridApi) {
      console.error("Grid API no disponible");
      return;
    }

    // Mostrar indicador de carga
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
    loadingDiv.style.zIndex = "10001";
    document.body.appendChild(loadingDiv);

    try {
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
          // Si el campo es 'success' (estado), transformar el valor
          if (col.field === 'success') {
            rowDataFiltered[col.field] = node.data[col.field] === 1 ?
              "Éxito" :
              "Fallo";
          } else {
            rowDataFiltered[col.field] = node.data[col.field];
          }
        });
        rowData.push(rowDataFiltered);
      });

      const data = {
        columns: columns.map((col) => col.headerName),
        rows: rowData.map((row) => columns.map((col) => row[col.field])),
      };

      // Usar la fecha seleccionada para el nombre del archivo
      const fileDate = selectedDate
        ? selectedDate.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      // Exportar usando la función del main process
      window.electron.exportToExcel(data)
        .then(excelBuffer => {
          const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          // Usar la fecha seleccionada para el nombre del archivo
          link.download = `historial_verificaciones_${fileDate}.xlsx`;
          link.click();
          URL.revokeObjectURL(link.href);

          // Eliminar indicador de carga
          document.body.removeChild(loadingDiv);
        })
        .catch(error => {
          console.error("Error al exportar:", error);
          document.body.removeChild(loadingDiv);
          alert("Error al exportar: " + (error.message || "Error desconocido"));
        });
    } catch (error) {
      console.error("Error al preparar datos para exportación:", error);
      document.body.removeChild(loadingDiv);
    }
  }
  // Función para crear el modal con los detalles del servidor
  function showServerDetailsModal(serverData) {
    console.log("Mostrando detalles del servidor:", serverData);
    // Función para formatear la fecha en el formato yyyy/mm/dd hh:mm:ss
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const seconds = date.getSeconds().toString().padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Formatear las fechas horaINI y horaFIN
    const formattedHoraINI = formatDate(serverData.horaINI);
    const formattedHoraFIN = formatDate(serverData.horaFIN);

    // Determinar el estado "Exitoso?"
    const successStatus = serverData.success === 1 ? "Éxito" : "Fallo";
    const statusClass =
      serverData.success === 1 ? "status-success" : "status-failure";

    // DETECTAR SI ES POSTGRESQL
    const isPostgres = serverData.osType && serverData.osType.toLowerCase().includes('postgres');

    // Verificar si el servidor es Bantotal y si el backupPath contiene alguna de las subcarpetas especificadas
    const subcarpetas = [
      "ESQ_USRREPBI",
      "BK_ANTES2",
      "APP_ESQUEMAS",
      "BK_MD_ANTES",
      "BK_MD_ALL_ANTES",
      "BK_JAQL546_FPAE71",
      "BK_ANTES",
      "RENIEC",
    ];
    const isBantotal = serverData.serverName.includes("Bantotal"); // Verificar si es el servidor Bantotal
    let subcarpeta = "";

    if (isBantotal) {
      subcarpeta =
        subcarpetas.find((sub) => serverData.backupPath.includes(sub)) || ""; // Buscar si alguna subcarpeta está en la ruta de backup
    }

    // Verificar si el log contiene "Job"
    const containsJob = (serverData.groupControlInfo || "").includes("Job");

    // Verificar si es un servidor especial (RMAN)
    const isSpecialServer = serverData.serverName === "WebContent" ||
      (serverData.serverName === "Contratacion digital" &&
        serverData.backupPath === "/disco6/BK_RMAN_CONTRADIGI") || (serverData.serverName === "BIOMETRIA" &&
          serverData.backupPath === "/adicional_new/BK_RMAN_BIOME/BK_RMAN_FULL");

    // Determinar el título para las últimas líneas
    let last10LinesTitle;
    if (isSpecialServer) {
      // Para servidores RMAN, cambiar el título según el estado
      last10LinesTitle = serverData.success === 1 ? "Estado RMAN" : "Error RMAN";
    } else if (isPostgres) {
      // Para PostgreSQL, mostrar título específico
      last10LinesTitle = serverData.success === 1 ? "Estado PostgreSQL" : "Error PostgreSQL";
    } else {
      // Para servidores normales, usar la lógica original
      last10LinesTitle = containsJob ? "Ver última línea del log" : "Advertencia:";
    }
    // Determinar el estilo del pre según el tipo de servidor y el estado
    let preStyle = "background-color: #f0f0f0; padding: 10px; border-radius: 5px; max-height: 200px; white-space: pre-wrap; word-wrap: break-word; overflow-y: auto;";
    if (isSpecialServer && serverData.success === 0) {
      // Solo aplicar estilo de error si es servidor RMAN y el estado es fallido
      preStyle = "background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; max-height: 200px; white-space: pre-wrap; word-wrap: break-word; overflow-y: auto;";
    }
    // Crear contenido del modal
    const modalContent = `
    <h2 style="text-align: center; font-size: 20px;">Detalles del Servidor ${serverData.serverName
      }</h2>
    ${subcarpeta
        ? `<h3 style="text-align: center; font-size: 18px; color: #555;">Subcarpeta: ${subcarpeta}</h3>`
        : ""
      }
    <p><strong>IP:</strong> ${serverData.ip}</p>
    <p><strong>Archivo Log:</strong> ${serverData.logFileName || "No disponible"
      }</p>
    <p><strong>Hora de Inicio:</strong> ${formattedHoraINI || "No disponible"
      }</p>
    <p><strong>Hora de Fin:</strong> ${formattedHoraFIN || "No disponible"}</p>
    ${!isPostgres ? `<p><strong>Duración:</strong> ${serverData.duration || "No disponible"}</p>` : ''}
    <p><strong>Exitoso?:</strong> 
      <span id="success-status" class="${statusClass}" style="cursor: pointer;">
        ${successStatus || "No disponible"}
      </span>
    </p>
    <p style="word-wrap: break-word; white-space: normal; max-width: 100%; overflow-wrap: break-word;">
    <strong>Ruta de Backup:</strong> ${serverData.backupPath || "No disponible"}
    </p>
    </p>
    ${isSpecialServer
        ? ""
        : isPostgres
          ? `<p><strong>Tamaño total de carpeta:</strong> ${serverData.totalFolderSize || "No disponible"}</p>`
          : `
        <p><strong>Estado de Backup:</strong> ${serverData.backupStatus || "No disponible"}</p>
        <p><strong>Peso total del archivo .dmp:</strong> ${serverData.dumpFileSize || "No disponible"}</p>
        <p><strong>Tamaño total de carpeta:</strong> ${serverData.totalFolderSize || "No disponible"}</p>
      `
      }
    <h3 style="margin-top: 20px;">${last10LinesTitle || "No disponible"}</h3>
<pre style="
    background-color: #f0f0f0; 
    padding: 10px; 
    border-radius: 5px; 
    max-height: 200px; 
    white-space: pre-wrap; 
    word-wrap: break-word;
    overflow-y: auto;">${serverData.groupControlInfo || serverData.oraErrorMessage || "No disponible"}</pre>
  `;

    // Crear el contenedor del modal
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "9000";

    // Crear el contenido del modal
    const modalBox = document.createElement("div");
    modalBox.style.backgroundColor = "#fff";
    modalBox.style.padding = "20px";
    modalBox.style.borderRadius = "8px";
    modalBox.style.maxWidth = "600px";
    modalBox.style.width = "90%";
    modalBox.style.boxShadow = "0 5px 15px rgba(0, 0, 0, 0.3)";
    modalBox.innerHTML = modalContent;

    // Botón para cerrar el modal
    const closeButton = document.createElement("span");
    closeButton.textContent = "×";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "15px";
    closeButton.style.fontSize = "24px";
    closeButton.style.cursor = "pointer";
    closeButton.addEventListener("click", () => {
      modal.remove();
    });

    // Añadir el botón de cerrar al modal
    modalBox.appendChild(closeButton);

    // Añadir el contenedor al modal
    modal.appendChild(modalBox);

    // Añadir el modal al documento
    document.body.appendChild(modal);

    // Cerrar el modal al hacer clic fuera del contenido
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });
    // Mostrar el tooltip cuando el estado es "Fallo"
    const successStatusElement = modalBox.querySelector("#success-status");
    if (serverData.success === 0 && serverData.oraErrorMessage) {
      successStatusElement.addEventListener("click", (event) => {
        // Crear el tooltip
        const tooltipError = document.createElement("div");
        tooltipError.classList.add("tooltip-error");

        // Verificar si es un string JSON
        if (typeof serverData.oraErrorMessage === 'string' && serverData.oraErrorMessage.startsWith('{')) {
          try {
            // Intentar parsear como JSON
            const errorObj = JSON.parse(serverData.oraErrorMessage);

            // Usar HTML para formatear mejor el error
            tooltipError.innerHTML = '';

            if (errorObj.previousLine) {
              const prevLine = document.createElement("div");
              prevLine.innerHTML = '<strong style="color:#855;">Línea anterior:</strong> <div style="margin-bottom:8px; padding-left:10px;">' + errorObj.previousLine + '</div>';
              tooltipError.appendChild(prevLine);
            }

            if (errorObj.errorLine) {
              const errorLine = document.createElement("div");
              errorLine.innerHTML = '<strong style="color:#a22;">Error:</strong> <div style="margin-bottom:8px; padding-left:10px; color:#a22; font-weight:bold;">' + errorObj.errorLine + '</div>';
              tooltipError.appendChild(errorLine);
            }

            if (errorObj.nextLine) {
              const nextLine = document.createElement("div");
              nextLine.innerHTML = '<strong style="color:#855;">Línea siguiente:</strong> <div style="padding-left:10px;">' + errorObj.nextLine + '</div>';
              tooltipError.appendChild(nextLine);
            }
          } catch (e) {
            // Si falla el parseo, mostrar el texto original
            tooltipError.textContent = serverData.oraErrorMessage;
          }
        } else {
          tooltipError.textContent = serverData.oraErrorMessage;
        }

        // Añadir el tooltip al documento
        document.body.appendChild(tooltipError);

        // Aplicar estilos al tooltip
        tooltipError.style.position = "fixed";
        tooltipError.style.top = `${event.clientY + 10}px`;
        tooltipError.style.left = `${event.clientX + 10}px`;
        tooltipError.style.backgroundColor = "#f8d7da";
        tooltipError.style.color = "#721c24";
        tooltipError.style.padding = "15px";
        tooltipError.style.border = "1px solid #f5c6cb";
        tooltipError.style.borderRadius = "5px";
        tooltipError.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";
        tooltipError.style.zIndex = "10000";
        tooltipError.style.display = "block";
        tooltipError.style.opacity = "1";
        tooltipError.style.maxWidth = "500px";
        tooltipError.style.wordWrap = "break-word";
        tooltipError.style.maxHeight = "350px";
        tooltipError.style.overflowY = "auto";
        tooltipError.style.lineHeight = "1.5";

        // Cerrar el tooltip al hacer clic fuera
        const closeTooltip = (e) => {
          if (!tooltipError.contains(e.target)) {
            tooltipError.remove();
            document.removeEventListener("click", closeTooltip);
          }
        };

        // Escuchar clics fuera del tooltip para cerrarlo
        setTimeout(() => {
          document.addEventListener("click", closeTooltip);
        }, 100);
      });
    }
  }

  //const tooltipError = document.createElement("div");
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
            const confirmDelete = await showConfirmDeleteModal(
              `¿Estás seguro de que deseas eliminar el servidor ${selectedServer.name}?`
            );
            if (confirmDelete) {
              const result = await window.electron.deleteServer(
                selectedServer.id
              );
              if (result.success) {
                showCustomAlert("Servidor eliminado correctamente.");
                window.location.reload(); // Recargar la página para reflejar los cambios
              } else {
                showCustomAlert(
                  "Error al eliminar el servidor: " + result.error
                );
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
            // Aquí asignamos el valor de db_engine en el formulario
            document.getElementById("db_engine").value = serverData.db_engine || "oracle"; // Asumimos "oracle" si no hay valor 
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
          dbEngine: document.getElementById("db_engine").value,
        };

        console.log("Editando servidor:", serverData);

        try {
          const result = await window.electron.updateServer(serverData);

          if (result.success) {
            showCustomAlert("Servidor actualizado correctamente.");
            window.localStorage.removeItem("selectedServer");
            window.location.href = "select-server.html";
          } else {
            showCustomAlert("Error al actualizar el servidor.");
          }
        } catch (error) {
          console.error("Error al actualizar el servidor:", error);
          showCustomAlert("Hubo un error al actualizar el servidor.");
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
          dbEngine: document.getElementById("db_engine").value,
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
            showCustomAlert("Servidor guardado correctamente.");
            window.localStorage.removeItem("selectedServer"); // Eliminar el servidor seleccionado del localStorage
            window.location.href = "index.html"; // Redirigir a la página principal
          } else {
            showCustomAlert("Error al guardar el servidor.");
          }
        } catch (error) {
          console.error("Error al guardar el servidor:", error);
          showCustomAlert("Hubo un error al guardar el servidor.");
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
        // Obtén la lista de servidores desde el proceso principal a través de Electron
        const servers = (await window.electron.getServers()) || [];
        const selectedOS = osSelect.value;

        // Limpia las opciones previas en el select de IP
        ipSelect.innerHTML = "";

        // Filtra los servidores según el sistema operativo seleccionado
        const filteredServers = servers.filter(
          (server) => server.os === selectedOS
        );

        if (filteredServers.length > 0) {
          // Si hay servidores que coinciden, agrégalos al select de IP
          filteredServers.forEach((server) => {
            const option = document.createElement("option");
            option.value = server.ip;
            option.textContent = server.display;
            ipSelect.appendChild(option);
          });

          // Habilita el selector de IP y selecciona la primera IP por defecto
          ipSelect.disabled = false;
          ipSelect.value = ipSelect.options[0].value;
          updateBackupRoutes(); // Actualiza las rutas de backup
          await updateFormFields(ipSelect.value);
        } else {
          // Si no hay servidores que coincidan, deshabilita el selector de IP y muestra un mensaje
          const option = document.createElement("option");
          option.textContent = "No se encontraron IPs";
          option.disabled = true;
          ipSelect.appendChild(option);
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
  // Configura el evento para actualizar las IPs al cambiar el sistema operativo
  if (osSelect) {
    osSelect.addEventListener("change", updateIPOptions);
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
  // Llamamos a la función que escucha el evento 'start-processing'
  window.electron.startProcessingIfScheduled(() => {
    console.log("Ejecutando proceso automático");
    const processAllServersBtn = document.getElementById(
      "process-all-servers-btn"
    );
    if (processAllServersBtn) {
      console.log("Iniciando procesamiento automático...");
      processAllServersBtn.click();
    } else {
      console.error("No se encontró el botón de procesamiento");
    }
  });

  const processAllServersBtn = document.getElementById(
    "process-all-servers-btn"
  );

  if (processAllServersBtn) {
    processAllServersBtn.addEventListener("click", startProcessAllServers);
  } else {
    console.error("Botón process-all-servers-btn no encontrado");
  }
  async function showLogDetailsModal(logData) {
    console.log("Entrando en showLogDetailsModal con datos:", logData);
    const successStatus = logData.status === "Fallo" ? "Fallo" : "Éxito";
    const statusClass =
      logData.status === "Fallo" ? "status-failure" : "status-success";
    // Verificar si el servidor es WebContent o Contratacion Digital
    const isSpecialServer =
      logData.serverName === "WebContent" ||
      (logData.serverName === "Contratacion digital" &&
        logData.backupPath === "/disco6/BK_RMAN_CONTRADIGI") || (logData.serverName === "BIOMETRIA" &&
          logData.backupPath === "/adicional_new/BK_RMAN_BIOME/BK_RMAN_FULL");

    // Determinar si se deben mostrar las últimas 10 líneas del log
    let last10LinesContent = "";
    let last10LinesTitle = "";

    if (!isSpecialServer) {
      // Solo pedir last10Lines si no es WebContent o Contratacion Digital
      const logIncludesJob = (logData.last10Lines || []).some((line) =>
        line.includes("Job")
      );
      last10LinesTitle = logIncludesJob
        ? "Ver última línea del log"
        : "Advertencia:";
      last10LinesContent = `<pre style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; max-height: 200px; white-space: pre-wrap; word-wrap: break-word;">${(logData.last10Lines || []).join("\n") || "No disponible"}
    </pre>`;
    } else {
      // Determinar el título basado en el estado
      last10LinesTitle = logData.status === "Fallo" ? "Error RMAN" : "Estado RMAN";

      // Comprobar si el mensaje es "Recovery Manager complete." independientemente de dónde esté almacenado
      const isCompletionMessage = logData.oraError &&
        JSON.parse(logData.oraError).errorLine &&
        JSON.parse(logData.oraError).errorLine.includes("Recovery Manager complete.");

      // Si es un mensaje de completado exitoso, usar estilo de éxito aunque esté en oraError
      if (isCompletionMessage) {
        last10LinesContent = `<pre style="background-color: #f0f0f0; padding: 10px; border-radius: 
        5px; max-height: 200px; white-space: pre-wrap; word-wrap: break-word;">${JSON.parse(logData.oraError).errorLine}
        </pre>`;
      }
      // Si no es un mensaje de completado exitoso, seguir con la lógica normal
      else {
        last10LinesContent = logData.oraError ?
          `<pre style="background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 
          4px; max-height: 200px; white-space: pre-wrap; word-wrap: break-word;">${JSON.parse(logData.oraError).errorLine || logData.last10Lines || "No se encontraron detalles del error"}
          </pre>` :
          `<pre style="${logData.status === "Fallo" ? "background-color: #f8d7da; color: #721c24;" :
            "background-color: #f0f0f0;"} padding: 10px; border-radius: 5px; 
            max-height: 200px; white-space: pre-wrap; word-wrap: break-word; overflow-y: auto;">${logData.last10Lines || "No disponible"}
          </pre>`;
      }
    }

    // Verificar si el servidor es Bantotal y si el backupPath contiene alguna de las subcarpetas
    const subcarpetas = [
      "ESQ_USRREPBI",
      "BK_ANTES2",
      "APP_ESQUEMAS",
      "BK_MD_ANTES",
      "BK_MD_ALL_ANTES",
      "BK_JAQL546_FPAE71",
      "BK_ANTES",
      "RENIEC",
    ];
    const isBantotal = logData.serverName === "Bantotal"; // Asegurarse que el servidor sea "Bantotal"
    let subcarpeta = "";

    if (isBantotal) {
      // Buscar si alguna subcarpeta está en la ruta de backup
      subcarpeta =
        subcarpetas.find((sub) => logData.backupPath.includes(sub)) || "";
    }

    // Crear contenido del modal
    const modalContent = `
      <h2 style="text-align: center; font-size: 20px;">Detalles del Log para ${logData.serverName
      }</h2>
      ${subcarpeta
        ? `<h3 style="text-align: center; font-size: 18px; color: #555;">Subcarpeta: ${subcarpeta}</h3>`
        : ""
      }
      <p><strong>IP:</strong> ${logData.ip}
      <p><strong>Archivo de Log:</strong> ${logData.logFileName || "No disponible"
      }</p>
      <p><strong>Hora de Inicio:</strong> ${logData.startTime || "No disponible"
      }</p>
      <p><strong>Hora de Fin:</strong> ${logData.endTime || "No disponible"}</p>
      <p><strong>Duración:</strong> ${logData.duration || "No disponible"}</p>
      <p><strong>Estado de Backup:</strong> ${logData.backupStatus || "No disponible"
      }</p>
      ${!isSpecialServer
        ? `
        <p><strong>Peso total de archivo .dmp:</strong> ${logData.totalDmpSize || "No disponible"
        }</p>
        <p><strong>Tamaño Total Carpeta:</strong> ${logData.totalFolderSize || "No disponible"
        }</p>
        `
        : ""
      }
      <p><strong>Exitoso:</strong> 
      <span id="success-status" class="${statusClass}" style="cursor: pointer;">
        ${successStatus}
      </span>
    </p>
      <p style="word-wrap: break-word; white-space: normal; max-width: 100%; overflow-wrap: break-word;"><strong>Ruta del backup:</strong> ${logData.backupPath || "N/A"
      }
      <h3 style="margin-top: 20px;">${last10LinesTitle}</h3>
${last10LinesContent}
    `;

    // Crear el contenedor del modal
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100%";
    modal.style.height = "100%";
    modal.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    modal.style.display = "flex";
    modal.style.justifyContent = "center";
    modal.style.alignItems = "center";
    modal.style.zIndex = "1000";

    // Crear el contenido del modal
    const modalBox = document.createElement("div");
    modalBox.style.backgroundColor = "#fff";
    modalBox.style.padding = "20px";
    modalBox.style.borderRadius = "8px";
    modalBox.style.maxWidth = "600px";
    modalBox.style.width = "90%";
    modalBox.style.boxShadow = "0 5px 15px rgba(0, 0, 0, 0.3)";
    modalBox.style.position = 'fixed';
    modalBox.style.visibility = 'visible';
    modalBox.innerHTML = modalContent;

    // Botón para cerrar el modal
    const closeButton = document.createElement("span");
    closeButton.textContent = "×";
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "15px";
    closeButton.style.fontSize = "24px";
    closeButton.style.cursor = "pointer";
    closeButton.addEventListener("click", () => {
      modal.remove();
    });

    // Añadir el botón de cerrar al modal
    modalBox.appendChild(closeButton);

    // Añadir el contenedor al modal
    modal.appendChild(modalBox);

    // Añadir el modal al documento
    document.body.appendChild(modal);
    await new Promise(resolve => setTimeout(resolve, 500));


    // Cerrar el modal al hacer clic fuera del contenido
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.remove();
      }
    });
    // Añadir el tooltip para errores de ORA en caso de fallo
    if (logData.status === "Fallo" && logData.oraError) {
      const successStatusElement = modalBox.querySelector("#success-status");

      successStatusElement.addEventListener("click", (event) => {
        // Crear el tooltip
        const tooltip = document.createElement("div");
        tooltip.textContent = logData.oraError; // Aquí se pasa el contenido de oraError al tooltip
        tooltip.style.position = "fixed";
        tooltip.style.top = `${event.clientY + 10}px`;
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.backgroundColor = "#f8d7da";
        tooltip.style.color = "#721c24";
        tooltip.style.padding = "10px";
        tooltip.style.border = "1px solid #f5c6cb";
        tooltip.style.borderRadius = "5px";
        tooltip.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";
        tooltip.style.zIndex = "9000";
        tooltip.style.maxWidth = "600px"; // Ajusta el ancho máximo
        tooltip.style.wordWrap = "break-word"; // Asegura que el texto largo se ajuste

        document.body.appendChild(tooltip);

        // Cerrar el tooltip al hacer clic fuera
        const closeTooltip = (e) => {
          if (!tooltip.contains(e.target)) {
            tooltip.remove();
            document.removeEventListener("click", closeTooltip);
          }
        };
        setTimeout(() => document.addEventListener("click", closeTooltip), 100);
      });
    }
  }

  // Función para generar contenido HTML de las alertas
  function generateDurationAlertsHTML(alertsResult) {
    if (!alertsResult || alertsResult.alerts.length === 0) {
      return ''
    }

    const criticalAlerts = alertsResult.alerts.filter(a => a.severity === 'CRÍTICO');
    const warningAlerts = alertsResult.alerts.filter(a => a.severity === 'ADVERTENCIA');

    return `
    <div style="background-color: #f8d7da; color: #721c24; padding: 15px; margin-bottom: 20px; border-radius: 8px; border: 2px solid #dc3545;">
      <h3 style="margin-top: 0; color: #721c24;">⏰ Alertas de Duración Anómala de Backups</h3>
      <p>Se detectaron <strong>${alertsResult.alerts.length}</strong> backup(s) con duración superior al promedio + 1 hora:</p>
      <p style="font-size: 14px; margin: 5px 0;">
        • <span style="color: #dc3545; font-weight: bold;">Críticos</span>: ${criticalAlerts.length} (>2 horas adicionales)<br>
        • <span style="color: #fd7e14; font-weight: bold;">Advertencias</span>: ${warningAlerts.length} (1-2 horas adicionales)
      </p>
      
      <div style="margin-top: 15px;">
        ${alertsResult.alerts.map(alert => `
          <div style="background-color: ${alert.severity === 'CRÍTICO' ? '#f5c6cb' : '#fff3cd'}; 
                      color: ${alert.severity === 'CRÍTICO' ? '#721c24' : '#856404'}; 
                      padding: 12px; margin: 8px 0; border-radius: 6px; 
                      border-left: 4px solid ${alert.severity === 'CRÍTICO' ? '#dc3545' : '#ffc107'};">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <strong style="font-size: 16px;">${alert.serverName}</strong>
              <span style="background-color: ${alert.severity === 'CRÍTICO' ? '#dc3545' : '#ffc107'}; 
                           color: white; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                ${alert.severity}
              </span>
            </div>
            
            <div style="font-size: 14px; line-height: 1.4;">
              <p style="margin: 4px 0;"><strong>Tipo:</strong> 
                <span style="background-color: ${alert.backupType === 'ORACLE_DMP' ? '#e3f2fd' :
        alert.backupType === 'ORACLE_RMAN' ? '#fff3e0' : '#f3e5f5'}; 
                             color: ${alert.backupType === 'ORACLE_DMP' ? '#1976d2' :
        alert.backupType === 'ORACLE_RMAN' ? '#f57c00' : '#7b1fa2'}; 
                             padding: 2px 6px; border-radius: 3px; font-size: 11px;">
                  ${alert.backupType}
                </span>
              </p>
              <p style="margin: 4px 0;"><strong>IP:</strong> ${alert.ip}</p>
              <p style="margin: 4px 0; word-break: break-all;"><strong>Ruta:</strong> ${alert.backupPath}</p>
              <p style="margin: 4px 0;"><strong>Fecha del backup:</strong> ${alert.backupDate ? new Date(alert.backupDate).toLocaleString() : 'No disponible'}</p>
              
              <div style="background-color: rgba(255,255,255,0.3); padding: 8px; margin: 8px 0; border-radius: 4px;">
                <p style="margin: 2px 0;"><strong>⏱️ Duración actual:</strong> <span style="font-weight: bold; color: #dc3545;">${alert.currentDuration}</span></p>
                <p style="margin: 2px 0;"><strong>📊 Promedio histórico:</strong> ${alert.averageDuration}</p>
                <p style="margin: 2px 0;"><strong>⚠️ Tiempo excedido:</strong> <span style="font-weight: bold; color: #dc3545;">${alert.excessTime}</span></p>
                <p style="margin: 2px 0; font-size: 12px; opacity: 0.8;"><strong>Datos históricos:</strong> ${alert.historicalCount} backups analizados</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="margin-top: 15px; padding: 10px; background-color: rgba(255,255,255,0.2); border-radius: 4px; font-size: 13px;">
        <strong>💡 Recomendación:</strong> Revisar los logs de estos backups para identificar posibles causas del incremento en tiempo de ejecución (problemas de red, aumento de datos, recursos del servidor, etc.).
      </div>
    </div>
  `;
  }

  // Función para integrar las alertas en el email existente
  async function integrateBackupDurationAlerts() {
    try {
      console.log("🚀 Integrando alertas de duración en el reporte...");

      // Ejecutar análisis de duración usando IPC
      const alertsResult = await window.electron.checkBackupDurationAlerts(7);

      // Generar HTML de alertas
      const alertsHTML = generateDurationAlertsHTML(alertsResult);

      console.log(`✅ Alertas de duración integradas: ${alertsResult.alerts.length} alertas`);

      return {
        alertsHTML: alertsHTML,
        alertsData: alertsResult
      };

    } catch (error) {
      console.error("❌ Error integrando alertas de duración:", error);
      return {
        alertsHTML: `
        <div style="background-color: #f8d7da; color: #721c24; padding: 15px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #f5c6cb;">
          <h3 style="margin-top: 0;">❌ Error en Análisis de Duración</h3>
          <p>No se pudo completar el análisis de duración de backups. Error: ${error.message}</p>
        </div>
      `,
        alertsData: null
      };
    }
  }

  async function sendServerDetails(mainGridApi) {
    let rowData = [];
    mainGridApi.forEachNode(node => {
      if (node.data) rowData.push(node.data);
    });

    // Obtener datos del grid de PostgreSQL
    let postgresData = [];
    if (postgresGridApi) {
      postgresGridApi.forEachNode(node => {
        if (node.data) postgresData.push(node.data);
      });
    }
    // **NUEVA FUNCIONALIDAD: Integrar alertas de duración**
    console.log("🔍 Ejecutando análisis de duración de backups...");
    const durationAlerts = await integrateBackupDurationAlerts();

    // **CAMBIO PRINCIPAL: Combinar y ordenar todos los backups juntos**
    // Marcar el tipo de backup para poder identificarlos después
    const oracleBackups = rowData.map(data => ({
      ...data,
      backupType: 'Oracle',
      isError: data.status === "Fallo"
    }));

    const postgresBackups = postgresData.map(data => ({
      ...data,
      backupType: 'PostgreSQL',
      isError: data.estado_backup === "Fallo"
    }));

    // Combinar todos los backups
    const allBackups = [...oracleBackups, ...postgresBackups];

    // Ordenar: primero todos los errores (Oracle y PostgreSQL), luego los exitosos
    allBackups.sort((a, b) => {
      // Primero ordenar por error/éxito
      if (a.isError && !b.isError) return -1;
      if (!a.isError && b.isError) return 1;

      // Si ambos tienen el mismo estado, mantener orden por tipo (opcional)
      if (a.backupType !== b.backupType) {
        return a.backupType === 'Oracle' ? -1 : 1;
      }

      return 0;
    });
    const requiredFoldersBantotal = [
      "ESQ_USRREPBI",
      "BK_ANTES2",
      "APP_ESQUEMAS",
      "BK_MD_ANTES",
      "BK_JAQL546_FPAE71",
      "BK_ANTES",
      "RENIEC"
    ];

    const missingFoldersWarnings = [];

    // ✅ SOLUCIÓN: Ejecutar la verificación solo UNA vez, fuera del bucle
    const bantotalRecords = rowData.filter(d => d.serverName === "Bantotal" && d.backupPath);

    if (bantotalRecords.length > 0) {
      // Extraer todas las carpetas existentes de Bantotal
      const existingFolders = bantotalRecords.map(d => d.backupPath.split('/').pop());

      // Buscar cuáles carpetas requeridas no están presentes
      const missing = requiredFoldersBantotal.filter(req =>
        !existingFolders.some(folder => folder.startsWith(req))
      );

      // Solo agregar UNA entrada si hay carpetas faltantes
      if (missing.length > 0) {
        missingFoldersWarnings.push({
          serverName: "Bantotal",
          expected: requiredFoldersBantotal,
          found: existingFolders,
          missing: missing
        });
      }
    }
    const requiredFoldersEBS = [
      "APPLSYS",
      "XLA",
      "GL",
      "EBS_GENERIC" // Para identificar la carpeta genérica BK_EBS_YYYY_MM_DD_HHMM
    ];

    const missingFoldersEBSWarnings = [];

    // Verificación para EBS - ejecutar solo UNA vez
    const ebsRecords = rowData.filter(d => d.serverName === "EBS" && d.backupPath);

    if (ebsRecords.length > 0) {
      console.log(`Verificando carpetas EBS. Encontrados ${ebsRecords.length} registros`);

      // Extraer nombres de carpetas y clasificarlas
      const foundFolders = {
        APPLSYS: false,
        XLA: false,
        GL: false,
        EBS_GENERIC: false
      };

      const allFolderNames = [];

      ebsRecords.forEach(record => {
        const folderName = record.backupPath.split('/').pop();
        allFolderNames.push(folderName);

        console.log(`Analizando carpeta EBS: ${folderName} desde ruta: ${record.backupPath}`);

        // Patrones dinámicos con fecha/hora flexible
        // Patrón para APPLSYS: BK_EBS_APPLSYS_YYYY_MM_DD_HHMM
        const applsysPattern = /^BK_EBS_APPLSYS_\d{4}_\d{2}_\d{2}_\d{4}$/;
        // Patrón para XLA: BK_EBS_XLA_YYYY_MM_DD_HHMM  
        const xlaPattern = /^BK_EBS_XLA_\d{4}_\d{2}_\d{2}_\d{4}$/;
        // Patrón para GL: BK_EBS_GL_YYYY_MM_DD_HHMM
        const glPattern = /^BK_EBS_GL_\d{4}_\d{2}_\d{2}_\d{4}$/;
        // Patrón para carpeta genérica: BK_EBS_YYYY_MM_DD_HHMM (sin identificador específico)
        const genericPattern = /^BK_EBS_\d{4}_\d{2}_\d{2}_\d{4}$/;

        // Verificar cada tipo de carpeta con patrones dinámicos
        if (applsysPattern.test(folderName)) {
          foundFolders.APPLSYS = true;
          console.log('✓ Carpeta APPLSYS encontrada:', folderName);
        } else if (xlaPattern.test(folderName)) {
          foundFolders.XLA = true;
          console.log('✓ Carpeta XLA encontrada:', folderName);
        } else if (glPattern.test(folderName)) {
          foundFolders.GL = true;
          console.log('✓ Carpeta GL encontrada:', folderName);
        } else if (genericPattern.test(folderName)) {
          foundFolders.EBS_GENERIC = true;
          console.log('✓ Carpeta EBS genérica encontrada:', folderName);
        } else {
          console.log('⚠️ Carpeta EBS no reconocida:', folderName);
        }
      });

      // Identificar carpetas faltantes
      const missingEBS = [];
      Object.keys(foundFolders).forEach(folderType => {
        if (!foundFolders[folderType]) {
          // Mapear nombres técnicos a nombres amigables
          const friendlyNames = {
            'APPLSYS': 'BK_EBS_APPLSYS_*',
            'XLA': 'BK_EBS_XLA_*',
            'GL': 'BK_EBS_GL_*',
            'EBS_GENERIC': 'BK_EBS_YYYY_MM_DD_HHMM (carpeta principal)'
          };
          missingEBS.push(friendlyNames[folderType]);
        }
      });

      // Solo agregar advertencia si hay carpetas faltantes
      if (missingEBS.length > 0) {
        missingFoldersEBSWarnings.push({
          serverName: "EBS",
          expected: requiredFoldersEBS.map(folder => {
            const friendlyNames = {
              'APPLSYS': 'BK_EBS_APPLSYS_*',
              'XLA': 'BK_EBS_XLA_*',
              'GL': 'BK_EBS_GL_*',
              'EBS_GENERIC': 'BK_EBS_YYYY_MM_DD_HHMM'
            };
            return friendlyNames[folder];
          }),
          found: allFolderNames,
          missing: missingEBS
        });

        console.log(`⚠️ EBS: Faltan ${missingEBS.length} carpeta(s):`, missingEBS);
      } else {
        console.log('✅ EBS: Todas las carpetas requeridas están presentes');
      }
    }

    // Agregar después de la verificación de EBS (línea ~135 aproximadamente)

    const requiredFoldersDATAWH = [
      "MD",
      "DATAWH_GENERIC" // Para identificar la carpeta genérica BK_DATAWH_YYYY_MM_DD_HHMM
    ];

    const missingFoldersDATAWHWarnings = [];

    // Verificación para DATAWH - ejecutar solo UNA vez
    const datawhRecords = rowData.filter(d => d.serverName === "DATAWH" && d.backupPath);

    if (datawhRecords.length > 0) {
      console.log(`Verificando carpetas DATAWH. Encontrados ${datawhRecords.length} registros`);

      // Extraer nombres de carpetas y clasificarlas
      const foundFolders = {
        MD: false,
        DATAWH_GENERIC: false
      };

      const allFolderNames = [];

      datawhRecords.forEach(record => {
        const folderName = record.backupPath.split('/').pop();
        allFolderNames.push(folderName);

        console.log(`Analizando carpeta DATAWH: ${folderName} desde ruta: ${record.backupPath}`);

        // Patrones dinámicos con fecha/hora flexible
        // Patrón para MD: BK_DATAWH_MD_YYYY_MM_DD_HHMM
        const mdPattern = /^BK_DATAWH_MD_\d{4}_\d{2}_\d{2}_\d{4}$/;
        // Patrón para carpeta genérica: BK_DATAWH_YYYY_MM_DD_HHMM (sin identificador específico)
        const genericPattern = /^BK_DATAWH_\d{4}_\d{2}_\d{2}_\d{4}$/;

        // Verificar cada tipo de carpeta con patrones dinámicos
        if (mdPattern.test(folderName)) {
          foundFolders.MD = true;
          console.log('✓ Carpeta MD encontrada:', folderName);
        } else if (genericPattern.test(folderName)) {
          foundFolders.DATAWH_GENERIC = true;
          console.log('✓ Carpeta DATAWH genérica encontrada:', folderName);
        } else {
          console.log('⚠️ Carpeta DATAWH no reconocida:', folderName);
        }
      });

      // Identificar carpetas faltantes
      const missingDATAWH = [];
      Object.keys(foundFolders).forEach(folderType => {
        if (!foundFolders[folderType]) {
          // Mapear nombres técnicos a nombres amigables
          const friendlyNames = {
            'MD': 'BK_DATAWH_MD_*',
            'DATAWH_GENERIC': 'BK_DATAWH_YYYY_MM_DD_HHMM (carpeta principal)'
          };
          missingDATAWH.push(friendlyNames[folderType]);
        }
      });

      // Solo agregar advertencia si hay carpetas faltantes
      if (missingDATAWH.length > 0) {
        missingFoldersDATAWHWarnings.push({
          serverName: "DATAWH",
          expected: requiredFoldersDATAWH.map(folder => {
            const friendlyNames = {
              'MD': 'BK_DATAWH_MD_*',
              'DATAWH_GENERIC': 'BK_DATAWH_YYYY_MM_DD_HHMM'
            };
            return friendlyNames[folder];
          }),
          found: allFolderNames,
          missing: missingDATAWH
        });

        console.log(`⚠️ DATAWH: Faltan ${missingDATAWH.length} carpeta(s):`, missingDATAWH);
      } else {
        console.log('✅ DATAWH: Todas las carpetas requeridas están presentes');
      }
    }

    const requiredFoldersContratacion = [
      "CONTRAT_GENERIC",      // Para BK_CONTRAT_YYYY_MM_DD_HHMM (genérica)
      "CONTRAT_MD_ALL",       // Para BK_CONTRAT_MD_ALL_YYYY_MM_DD_HHMM  
      "BK_RMAN_CONTRADIGI"    // Carpeta fija, siempre igual
    ];

    const missingFoldersContratacionWarnings = [];

    // Verificación para Contratacion digital - ejecutar solo UNA vez
    const contratacionRecords = rowData.filter(d => d.serverName === "Contratacion digital" && d.backupPath);

    if (contratacionRecords.length > 0) {
      console.log(`Verificando carpetas Contratacion digital. Encontrados ${contratacionRecords.length} registros`);

      // Extraer nombres de carpetas y clasificarlas
      const foundFolders = {
        CONTRAT_GENERIC: false,
        CONTRAT_MD_ALL: false,
        BK_RMAN_CONTRADIGI: false
      };

      const allFolderNames = [];

      contratacionRecords.forEach(record => {
        const folderName = record.backupPath.split('/').pop();
        allFolderNames.push(folderName);

        console.log(`Analizando carpeta Contratacion digital: ${folderName} desde ruta: ${record.backupPath}`);

        // Patrones dinámicos con fecha/hora flexible + carpeta fija
        // Patrón para MD_ALL: BK_CONTRAT_MD_ALL_YYYY_MM_DD_HHMM
        const mdAllPattern = /^BK_CONTRAT_MD_ALL_\d{4}_\d{2}_\d{2}_\d{4}$/;
        // Patrón para carpeta genérica: BK_CONTRAT_YYYY_MM_DD_HHMM (sin MD_ALL)
        const genericPattern = /^BK_CONTRAT_\d{4}_\d{2}_\d{2}_\d{4}$/;
        // Carpeta fija RMAN (coincidencia exacta)
        const rmanName = "BK_RMAN_CONTRADIGI";

        // Verificar cada tipo de carpeta con patrones dinámicos
        if (mdAllPattern.test(folderName)) {
          foundFolders.CONTRAT_MD_ALL = true;
          console.log('✓ Carpeta MD_ALL encontrada:', folderName);
        } else if (genericPattern.test(folderName)) {
          foundFolders.CONTRAT_GENERIC = true;
          console.log('✓ Carpeta CONTRAT genérica encontrada:', folderName);
        } else if (folderName === rmanName) {
          foundFolders.BK_RMAN_CONTRADIGI = true;
          console.log('✓ Carpeta RMAN encontrada:', folderName);
        } else {
          console.log('⚠️ Carpeta Contratacion digital no reconocida:', folderName);
        }
      });

      // Identificar carpetas faltantes
      const missingContratacion = [];
      Object.keys(foundFolders).forEach(folderType => {
        if (!foundFolders[folderType]) {
          // Mapear nombres técnicos a nombres amigables
          const friendlyNames = {
            'CONTRAT_GENERIC': 'BK_CONTRAT_YYYY_MM_DD_HHMM (carpeta principal)',
            'CONTRAT_MD_ALL': 'BK_CONTRAT_MD_ALL_*',
            'BK_RMAN_CONTRADIGI': 'BK_RMAN_CONTRADIGI (carpeta fija)'
          };
          missingContratacion.push(friendlyNames[folderType]);
        }
      });

      // Solo agregar advertencia si hay carpetas faltantes
      if (missingContratacion.length > 0) {
        missingFoldersContratacionWarnings.push({
          serverName: "Contratacion digital",
          expected: requiredFoldersContratacion.map(folder => {
            const friendlyNames = {
              'CONTRAT_GENERIC': 'BK_CONTRAT_YYYY_MM_DD_HHMM',
              'CONTRAT_MD_ALL': 'BK_CONTRAT_MD_ALL_*',
              'BK_RMAN_CONTRADIGI': 'BK_RMAN_CONTRADIGI'
            };
            return friendlyNames[folder];
          }),
          found: allFolderNames,
          missing: missingContratacion
        });

        console.log(`⚠️ Contratacion digital: Faltan ${missingContratacion.length} carpeta(s):`, missingContratacion);
      } else {
        console.log('✅ Contratacion digital: Todas las carpetas requeridas están presentes');
      }
    }

    const requiredFoldersBiometria = [
      "BIOME_GENERIC",        // Para BK_BIOME_YYYY_MM_DD_HHMM (genérica)
      "BIOME_MD_ALL",         // Para BK_BIOME_MD_ALL_YYYY_MM_DD_HHMM  
      "BK_RMAN_FULL"          // Carpeta fija, siempre igual
    ];

    const missingFoldersBiometriaWarnings = [];

    // Verificación para BIOMETRIA - ejecutar solo UNA vez
    const biometriaRecords = rowData.filter(d => d.serverName === "BIOMETRIA" && d.backupPath);

    if (biometriaRecords.length > 0) {
      console.log(`Verificando carpetas BIOMETRIA. Encontrados ${biometriaRecords.length} registros`);

      // Extraer nombres de carpetas y clasificarlas
      const foundFolders = {
        BIOME_GENERIC: false,
        BIOME_MD_ALL: false,
        BK_RMAN_FULL: false
      };

      const allFolderNames = [];

      biometriaRecords.forEach(record => {
        const folderName = record.backupPath.split('/').pop();
        allFolderNames.push(folderName);

        console.log(`Analizando carpeta BIOMETRIA: ${folderName} desde ruta: ${record.backupPath}`);

        // Patrones dinámicos con fecha/hora flexible + carpeta fija
        // Patrón para MD_ALL: BK_BIOME_MD_ALL_YYYY_MM_DD_HHMM
        const mdAllPattern = /^BK_BIOME_MD_ALL_\d{4}_\d{2}_\d{2}_\d{4}$/;
        // Patrón para carpeta genérica: BK_BIOME_YYYY_MM_DD_HHMM (sin MD_ALL)
        const genericPattern = /^BK_BIOME_\d{4}_\d{2}_\d{2}_\d{4}$/;
        // Carpeta fija RMAN (coincidencia exacta)
        const rmanName = "BK_RMAN_FULL";

        // Verificar cada tipo de carpeta con patrones dinámicos
        if (mdAllPattern.test(folderName)) {
          foundFolders.BIOME_MD_ALL = true;
          console.log('✓ Carpeta BIOME MD_ALL encontrada:', folderName);
        } else if (genericPattern.test(folderName)) {
          foundFolders.BIOME_GENERIC = true;
          console.log('✓ Carpeta BIOME genérica encontrada:', folderName);
        } else if (folderName === rmanName) {
          foundFolders.BK_RMAN_FULL = true;
          console.log('✓ Carpeta RMAN_FULL encontrada:', folderName);
        } else {
          console.log('⚠️ Carpeta BIOMETRIA no reconocida:', folderName);
        }
      });

      // Identificar carpetas faltantes
      const missingBiometria = [];
      Object.keys(foundFolders).forEach(folderType => {
        if (!foundFolders[folderType]) {
          // Mapear nombres técnicos a nombres amigables
          const friendlyNames = {
            'BIOME_GENERIC': 'BK_BIOME_YYYY_MM_DD_HHMM (carpeta principal)',
            'BIOME_MD_ALL': 'BK_BIOME_MD_ALL_*',
            'BK_RMAN_FULL': 'BK_RMAN_FULL (carpeta fija)'
          };
          missingBiometria.push(friendlyNames[folderType]);
        }
      });

      // Solo agregar advertencia si hay carpetas faltantes
      if (missingBiometria.length > 0) {
        missingFoldersBiometriaWarnings.push({
          serverName: "BIOMETRIA",
          expected: requiredFoldersBiometria.map(folder => {
            const friendlyNames = {
              'BIOME_GENERIC': 'BK_BIOME_YYYY_MM_DD_HHMM',
              'BIOME_MD_ALL': 'BK_BIOME_MD_ALL_*',
              'BK_RMAN_FULL': 'BK_RMAN_FULL'
            };
            return friendlyNames[folder];
          }),
          found: allFolderNames,
          missing: missingBiometria
        });

        console.log(`⚠️ BIOMETRIA: Faltan ${missingBiometria.length} carpeta(s):`, missingBiometria);
      } else {
        console.log('✅ BIOMETRIA: Todas las carpetas requeridas están presentes');
      }
    }

    // Generar contenido HTML para PostgreSQL
    function convertPostgresToStandardDate(postgresDate) {
      if (!postgresDate || typeof postgresDate !== 'string') {
        return null;
      }

      try {
        // PostgreSQL format: "21/05/2025, 20:35:10"
        // Target format: "2025-05-21 20:35:10"

        const [datePart, timePart] = postgresDate.split(', ');
        if (!datePart || !timePart) {
          console.warn(`Formato de fecha PostgreSQL inválido: ${postgresDate}`);
          return null;
        }

        const [day, month, year] = datePart.split('/');
        if (!day || !month || !year) {
          console.warn(`Formato de fecha PostgreSQL inválido: ${postgresDate}`);
          return null;
        }

        // Convertir a formato ISO: YYYY-MM-DD HH:MM:SS
        const standardDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${timePart}`;

        // Verificar que la fecha sea válida
        const testDate = new Date(standardDate);
        if (isNaN(testDate.getTime())) {
          console.warn(`Fecha PostgreSQL no válida después de conversión: ${standardDate}`);
          return null;
        }

        console.log(`Fecha PostgreSQL convertida: ${postgresDate} -> ${standardDate}`);
        return standardDate;

      } catch (error) {
        console.error(`Error convirtiendo fecha PostgreSQL ${postgresDate}:`, error);
        return null;
      }
    }
    // *** MODIFICACIÓN: Combinar datos de Oracle y PostgreSQL para verificación de Networker ***
    console.log("Iniciando verificación de conflictos con Networker...");

    // Preparar datos combinados para la verificación
    const allBackupData = [
      // Datos de Oracle (formato original)
      ...rowData.map(data => ({
        ...data,
        backupType: 'Oracle'
      })),
      ...postgresData.map(data => {
        const convertedEndTime = convertPostgresToStandardDate(data.fecha_fin);
        const convertedStartTime = convertPostgresToStandardDate(data.fecha_inicio);

        console.log(`Mapeando PostgreSQL: ${data.serverName}, Path: ${data.backupPath}`);
        console.log(`  Fecha fin original: ${data.fecha_fin}`);
        console.log(`  Fecha fin convertida: ${convertedEndTime}`);
        console.log(`  Fecha inicio original: ${data.fecha_inicio}`);
        console.log(`  Fecha inicio convertida: ${convertedStartTime}`);

        return {
          ...data,
          backupType: 'PostgreSQL',
          serverName: data.serverName,
          backupPath: data.backupPath,
          endTime: convertedEndTime,    // ← FECHA CONVERTIDA
          startTime: convertedStartTime // ← FECHA CONVERTIDA
        };
      })
    ];
    // DEBUGGING ADICIONAL:
    console.log("=== DEBUGGING POSTGRESQL NETWORKER ===");
    console.log(`Total PostgreSQL backups: ${postgresData.length}`);
    postgresData.forEach((data, index) => {
      console.log(`PostgreSQL ${index}:`, {
        serverName: data.serverName,
        backupPath: data.backupPath,
        fecha_fin: data.fecha_fin,
        fecha_inicio: data.fecha_inicio
      });
    });
    console.log(`Procesando ${allBackupData.length} rutas de backup (${rowData.length} Oracle + ${postgresData.length} PostgreSQL) para verificar conflictos`);

    let networkerResult = { conflicts: [] };
    try {
      // Llamar a la función del backend para verificar conflictos con todos los datos
      networkerResult = await window.electron.checkNetworkerConflicts(allBackupData);
      console.log(`Resultado de verificación:`, networkerResult);
    } catch (error) {
      console.error('Error al verificar conflictos con Networker:', error);
    }

    const networkerConflicts = networkerResult.conflicts || [];
    console.log(`Se encontraron ${networkerConflicts.length} conflictos con Networker (Oracle + PostgreSQL)`);

    // Generar contenido HTML para conflictos de Networker (ahora incluye ambos tipos)
    let networkerConflictsContent = "";
    if (networkerConflicts.length > 0) {
      console.log("Generando contenido HTML para conflictos con Networker...");

      // Agrupar conflictos por tipo de conflicto
      const dailyConflicts = networkerConflicts.filter(c => c.conflictType === "Diario");
      const monthlyConflicts = networkerConflicts.filter(c => c.conflictType === "Mensual");
      const encryptedConflicts = networkerConflicts.filter(c => c.conflictType === "Encriptación Mensual");

      // Función para generar HTML para un tipo de conflicto (modificada para mostrar tipo de DB)
      const generateConflictHTML = (conflicts, title, borderColor) => {
        if (conflicts.length === 0) return '';

        return `
<div style="background-color: #f8d7da; color: #721c24; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 2px solid ${borderColor};">
  <h4 style="margin-top: 0; color: #721c24;">${title} (${conflicts.length})</h4>
  <ul style="margin-bottom: 0;">
    ${conflicts.map(conflict => `
      <li><strong>${conflict.serverName}</strong> 
        <span style="background-color: ${conflict.backupType === 'Oracle' ? '#e3f2fd' : '#f3e5f5'}; 
                     color: ${conflict.backupType === 'Oracle' ? '#1976d2' : '#7b1fa2'}; 
                     padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 5px;">
          ${conflict.backupType}
        </span>
        <br><span style="color: #721c24">Ruta completa: ${conflict.backupPath}</span>
        <br><span style="color: #721c24">Ruta configurada: ${conflict.configuredPath}</span>
        <br><span style="color: #721c24">Hora de fin del backup: ${new Date(conflict.backupEndTime).toLocaleString()}</span>
        <br><span style="color: #721c24">Hora programada en Networker: ${new Date(conflict.networkerStartTime).toLocaleString()}</span>
        <br><span style="color: #721c24">El backup termina ${conflict.minutesDifference} minutos después de iniciarse Networker</span>
      </li>`).join('')}
  </ul>
</div>`;
      };

      // Separar conflictos por tipo de base de datos para estadísticas
      const oracleConflicts = networkerConflicts.filter(c => c.backupType === 'Oracle');
      const postgresConflicts = networkerConflicts.filter(c => c.backupType === 'PostgreSQL');

      networkerConflictsContent = `
<div style="background-color: #f8d7da; color: #721c24; padding: 15px; margin-bottom: 30px; border-radius: 8px; border: 1px solid #f5c6cb;">
  <h3 style="margin-top: 0; color: #721c24;">⚠️ Conflictos con programación de Networker</h3>
  <p>Se detectaron ${networkerConflicts.length} conflicto(s) entre el fin del backup y el inicio del respaldo en Networker:</p>
  <p style="font-size: 14px; margin: 5px 0;">
    • Oracle: ${oracleConflicts.length} conflicto(s)<br>
    • PostgreSQL: ${postgresConflicts.length} conflicto(s)
  </p>
  
  ${generateConflictHTML(dailyConflicts, "Conflictos con respaldo diario", "#dc3545")}
  ${generateConflictHTML(monthlyConflicts, "Conflictos con respaldo mensual", "#fd7e14")}
  ${generateConflictHTML(encryptedConflicts, "Conflictos con encriptación mensual", "#6f42c1")}
</div>
`;
    }

    // *** NUEVO CÓDIGO: Detectar backups antiguos ***
    const outdatedBackups = [];
    const currentDate = new Date();

    console.log("Verificando antigüedad de backups para Oracle y PostgreSQL...");

    rowData.forEach(data => {
      // Verificar que startTime exista y sea una cadena de texto
      if (data.startTime && typeof data.startTime === 'string') {
        console.log(`Analizando fecha de backup: ${data.serverName}, Fecha: ${data.startTime}`);

        // Intentar crear fecha a partir del formato YYYY-MM-DD HH:MM:SS
        try {
          // Dividir la cadena en componentes de fecha y hora
          const [datePart, timePart] = data.startTime.split(' ');
          if (!datePart || !timePart) {
            console.log(`Formato de fecha inválido para ${data.serverName}: ${data.startTime}`);
            return;
          }

          const [year, month, day] = datePart.split('-').map(Number);
          const [hours, minutes, seconds] = timePart.split(':').map(Number);

          // JavaScript usa meses de 0-11, así que restamos 1 al mes
          const backupDate = new Date(year, month - 1, day, hours, minutes, seconds);

          if (isNaN(backupDate.getTime())) {
            console.log(`Fecha inválida para ${data.serverName}: ${data.startTime}`);
            return;
          }

          console.log(`Fecha parseada: ${backupDate.toISOString()}`);

          // Calcular diferencia en días
          const diffTime = currentDate.getTime() - backupDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          console.log(`Diferencia en días: ${diffDays}`);

          if (diffTime > (1000 * 60 * 60 * 24)) { // Más de 24 horas
            // El backup es de hace más de 1 día (2 días o más)
            data.isOutdated = true;
            data.outdatedDays = diffDays;
            outdatedBackups.push({
              serverName: data.serverName,
              backupPath: data.backupPath,
              startTime: data.startTime,
              outdatedDays: diffDays,
              backupType: 'Oracle'
            });
            console.log(`Backup antiguo detectado: ${data.serverName}, ${diffDays} días`);
          }
        } catch (error) {
          console.error(`Error al procesar la fecha para ${data.serverName}:`, error);
        }
      } else {
        console.log(`No hay fecha de inicio para ${data.serverName}`);
      }
    });
    // *** NUEVO: Verificar backups de PostgreSQL ***
    postgresData.forEach(data => {
      // Verificar que fecha_inicio exista
      if (data.fecha_inicio && typeof data.fecha_inicio === 'string') {
        console.log(`Analizando fecha de backup PostgreSQL: ${data.serverName}, Fecha: ${data.fecha_inicio}`);

        try {
          // Usar la función existente para convertir fecha de PostgreSQL
          const convertedStartTime = convertPostgresToStandardDate(data.fecha_inicio);

          if (!convertedStartTime) {
            console.log(`No se pudo convertir fecha PostgreSQL para ${data.serverName}: ${data.fecha_inicio}`);
            return;
          }

          // Crear objeto Date a partir de la fecha convertida
          const backupDate = new Date(convertedStartTime);

          if (isNaN(backupDate.getTime())) {
            console.log(`Fecha PostgreSQL inválida después de conversión para ${data.serverName}: ${convertedStartTime}`);
            return;
          }

          console.log(`Fecha PostgreSQL parseada: ${backupDate.toISOString()}`);

          // Calcular diferencia en días
          const diffTime = currentDate.getTime() - backupDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          console.log(`Diferencia en días PostgreSQL: ${diffDays}`);

          if (diffTime > (1000 * 60 * 60 * 24)) { // Más de 24 horas
            // El backup es de hace más de 1 día (2 días o más)
            data.isOutdated = true;
            data.outdatedDays = diffDays;
            outdatedBackups.push({
              serverName: data.serverName,
              backupPath: data.backupPath,
              startTime: data.fecha_inicio, // Mantener formato original para mostrar
              outdatedDays: diffDays,
              backupType: 'PostgreSQL'
            });
            console.log(`Backup PostgreSQL antiguo detectado: ${data.serverName}, ${diffDays} días`);
          }
        } catch (error) {
          console.error(`Error al procesar la fecha PostgreSQL para ${data.serverName}:`, error);
        }
      } else {
        console.log(`No hay fecha de inicio para PostgreSQL ${data.serverName}`);
      }
    });

    // Crear la sección de advertencia para backups antiguos
    let outdatedContent = "";
    if (outdatedBackups.length > 0) {
      // Separar por tipo para estadísticas
      const oracleOutdated = outdatedBackups.filter(b => b.backupType === 'Oracle');
      const postgresOutdated = outdatedBackups.filter(b => b.backupType === 'PostgreSQL');
      outdatedContent = `
    <div style="background-color: #fff3cd; color: #856404; padding: 15px; margin-bottom: 30px; border-radius: 8px; border: 1px solid #ffeeba;">
      <h3 style="margin-top: 0; color: #e67e22;">⚠️ Advertencia: Backups Desactualizados</h3>
      <p>Se detectaron ${outdatedBackups.length} backup(s) con fechas antiguas:</p>
      <p style="font-size: 14px; margin: 5px 0;">
        • Oracle: ${oracleOutdated.length} backup(s)<br>
        • PostgreSQL: ${postgresOutdated.length} backup(s)
      </p>
      <ul style="margin-bottom: 0;">
        ${outdatedBackups.map(backup => `
          <li><strong>${backup.serverName}</strong> 
            <span style="background-color: ${backup.backupType === 'Oracle' ? '#e3f2fd' : '#f3e5f5'}; 
                         color: ${backup.backupType === 'Oracle' ? '#1976d2' : '#7b1fa2'}; 
                         padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-left: 5px;">
              ${backup.backupType}
            </span>
            - ${backup.backupPath}
            <br><span style="color: #d35400">Fecha de inicio: ${backup.startTime} (hace ${backup.outdatedDays} días)</span>
          </li>`).join('')}
      </ul>
    </div>
  `;
    }

    let pendingContent = "";
    if (pendingBackups.length > 0) {
      pendingContent = `
        <div style="background-color: #eaf2ff; color: #003366; padding: 15px; margin-bottom: 30px; border-radius: 8px; border: 1px solid #b3d4fc;">
            <h3 style="margin-top: 0;">Servidores Pendientes de Backup</h3>
            <p>Se encontraron ${pendingBackups.length} servidor(es) con backup incompleto.</p>
            <ul style="margin-bottom: 0;">
                ${pendingBackups.map(server => `
                    <li><strong>${server.serverName}</strong> - ${server.error}</li>
                `).join('')}
            </ul>
        </div>
      `;
    }

    // Modificar la generación del contenido HTML para incluir EBS
    let missingFoldersContent = "";

    // Combinar advertencias de BANTOTAL y EBS
    const allMissingFolderWarnings = [
      ...missingFoldersWarnings,
      ...missingFoldersEBSWarnings,
      ...missingFoldersDATAWHWarnings,
      ...missingFoldersContratacionWarnings,
      ...missingFoldersBiometriaWarnings
    ];
    if (allMissingFolderWarnings.length > 0) {
      missingFoldersContent = `
    <div style="background-color: #fff3cd; color: #856404; padding: 15px; margin-bottom: 30px; border-radius: 8px; border: 1px solid #ffeeba;">
      <h3 style="margin-top: 0;">⚠️ Advertencia: Backups Faltantes</h3>
      ${allMissingFolderWarnings.map(w => `
        <div style="margin-bottom: 15px;">
          <p><strong>${w.serverName}</strong> tiene <strong>${w.missing.length}</strong> backup(s) faltante(s):</p>
          <ul style="margin-left: 20px;">
            ${w.missing.map(f => `<li style="color: #d35400;"><strong>${f}</strong></li>`).join('')}
          </ul>
          <p style="font-size: 12px; color: #666; margin-top: 5px;">
            <strong>Carpetas encontradas:</strong> ${w.found.join(', ')}
          </p>
        </div>
      `).join('')}
    </div>
  `;
    }

    // **MODIFICAR: Usar los backups combinados para el resumen de errores**
    const allFailedBackups = allBackups.filter(backup => backup.isError);

    let summaryContent = '';
    if (allFailedBackups.length > 0) {
      summaryContent = `
        <div style="background-color: #fff3cd; color: #856404; padding: 15px; margin-bottom: 30px; border-radius: 8px; border: 1px solid #ffeeba;">
            <h3 style="margin-top: 0;">Resumen de Errores</h3>
            <p>Se encontraron ${allFailedBackups.length} servidor(s) con errores de un total de ${allBackups.length} backups.</p>
            <ul style="margin-bottom: 0;">
                ${allFailedBackups.map(server => `
                    <li><strong>${server.serverName}</strong> (${server.backupType}) - ${server.backupPath || 'Ruta no disponible'}</li>
                `).join('')}
            </ul>
        </div>
      `;
    }
    // **FUNCIÓN PARA GENERAR CONTENIDO HTML UNIFICADO**
    const generateUnifiedContent = (backups) => {
      return backups.map(data => {
        if (data.backupType === 'Oracle') {
          // Lógica existente para Oracle
          const successStatus = data.status === "Fallo" ? "Fallo" : "Éxito";
          const statusStyle = data.status === "Fallo" ?
            'background-color: #f8d7da; color: #721c24; padding: 5px;' :
            'background-color: #d4edda; color: #155724; padding: 5px;';

          const isSpecialServer = data.serverName === "WebContent" ||
            (data.serverName === "Contratacion digital" &&
              data.backupPath === "/disco6/BK_RMAN_CONTRADIGI") ||
            (data.serverName === "BIOMETRIA" &&
              data.backupPath === "/adicional_new/BK_RMAN_BIOME/BK_RMAN_FULL");

          let logContent = '';
          let errorContent = '';

          if (isSpecialServer) {
            const statusTitle = "Estado RMAN:";
            let statusMessage;
            if (data.status === "Fallo") {
              statusMessage = (data.oraError ?
                JSON.parse(data.oraError).errorLine :
                data.last10Lines)?.trim() || "Error no especificado";
            } else {
              statusMessage = data.last10Lines || "Recovery Manager complete.";
            }

            errorContent = `
        <div style="${data.status === "Fallo" ?
                'background-color: #f8d7da; color: #721c24;' :
                'background-color: #f5f5f5; color: #333333;'}  
          padding: 10px; margin: 10px 0; border-radius: 4px;">
          <strong>${statusTitle}</strong><br>
          <pre style="white-space: pre-wrap; word-wrap: break-word; margin: 5px 0; font-family: monospace; padding: 0;">${statusMessage.trim()}</pre>
        </div>`;
          } else {
            logContent = `
        <div style="background-color: #f5f5f5; padding: 10px; margin: 10px 0;">
            <strong>${data.last10Lines ? "Últimas líneas del log:" : "Advertencia:"}</strong><br>
            <pre style="white-space: pre-wrap; word-wrap: break-word; margin: 5px 0; padding: 0;">${Array.isArray(data.last10Lines) ?
                data.last10Lines.map(line => line.trim()).join('<br>') :
                (data.last10Lines?.trim() || 'No disponible')
              }</pre>
        </div>`;

            if (data.status === "Fallo" && data.oraError) {
              const errorObj = JSON.parse(data.oraError);
              errorContent = `
            <div style="background-color: #f8d7da; color: #721c24; padding: 10px; margin: 10px 0; border-radius: 4px;">
              <strong>Error detectado:</strong>
              <pre style="white-space: pre-wrap; word-wrap: break-word; margin: 5px 0; font-family: monospace; padding: 0;">
        <strong>Línea anterior:</strong> ${errorObj.previousLine.trim()}
        <strong>Error:</strong> ${errorObj.errorLine.trim()}
        <strong>Línea siguiente:</strong> ${errorObj.nextLine.trim()}
              </pre>
            </div>`;
            }
          }

          const containerStyle = data.status === "Fallo" ?
            'border: 2px solid #dc3545;' :
            'border: 1px solid #ddd;';

          return `
            <div style="${containerStyle} padding: 20px; margin-bottom: 30px; border-radius: 8px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                    ${data.serverName} <span></span>
                </h2>
                
                <div style="margin: 15px 0;">
                    <p><strong>IP:</strong> ${data.ip}</p>
                    <p><strong>Archivo de Log:</strong> ${data.logFileName || "No disponible"}</p>
                    <p><strong>Hora de Inicio:</strong> ${data.startTime || "No disponible"}</p>
                    <p><strong>Hora de Fin:</strong> ${data.endTime || "No disponible"}</p>
                    <p><strong>Duración:</strong> ${data.duration || "No disponible"}</p>                
                    ${!isSpecialServer ? `
                        <p><strong>Estado de Backup:</strong> ${data.backupStatus || "No disponible"}</p>
                        <p><strong>Peso total de archivo .dmp:</strong> ${data.totalDmpSize || "No disponible"}</p>
                        <p><strong>Tamaño Total Carpeta:</strong> ${data.totalFolderSize || "No disponible"}</p>
                    ` : ''}
                    <p>
                        <strong>Estado:</strong> 
                        <span style="${statusStyle}; border-radius: 4px;">
                            ${successStatus}
                        </span>
                    </p>
                    <p style="word-break: break-all;"><strong>Ruta del backup:</strong> ${data.backupPath || "N/A"}</p>
                    <p>
     <strong style="background-color:rgb(192, 255, 206); padding: 5px 10px; border-radius: 4px; white-space: nowrap;">
       Máximo Grupo: <span style="color:rgb(4, 102, 48);">${data.groupNumber || "1"}</span>
     </strong>
     </p>
                </div>
                
                ${errorContent}
                ${logContent}
            </div>`;
        } else {
          // Lógica existente para PostgreSQL
          const statusColor = data.estado_backup === 'Éxito' ? 'green' : 'red';
          const borderStyle = data.estado_backup === 'Éxito' ?
            'border: 1px solid #e0e0e0;' :
            'border: 2px solid #dc3545;';

          let formattedLogs = "No disponible";
          if (data.logNames) {
            const logsList = data.logNames.split(';').map(log => log.trim()).filter(log => log);
            if (logsList.length > 0) {
              formattedLogs = `
            <ul style="margin: 5px 0; padding-left: 20px; list-style-type: disc;">
              ${logsList.map(log => `<li style="margin-left: 15px;">${log}</li>`).join('')}
            </ul>
          `;
            }
          }

          let formattedError = "Sin errores";
          if (data.error_message) {
            const errorParts = data.error_message.split("\n");
            const fileName = errorParts[0];
            const errors = errorParts.slice(1);

            formattedError = `
        <div style="background-color: #f8d7da; color: #721c24; padding: 15px; margin-bottom: 15px; border-radius: 8px; border: 2px solid #dc3545;">
          <p><strong>Archivo log:</strong> ${fileName}</p>
          <p><strong>Errores:</strong></p>
          <ul style="margin: 5px 0; padding-left: 20px; list-style-type: disc;">
            ${errors.map(error => `<li style="margin-left: 15px;">${error}</li>`).join('')}
          </ul>
        </div>
      `;
          }

          return `
          <div style="margin: 20px 0; ${borderStyle} padding: 15px; border-radius: 8px;">
            <h3 style="color: #2c3e50;">${data.serverName} <span></span></h3>
            <p><strong>IP:</strong> ${data.ip}</p>
            <div>
              <p style="margin-bottom: 5px;"><strong>Archivos de Log:</strong></p>
              ${formattedLogs}
            </div>
            <p><strong>Estado:</strong> 
            <span style="color: ${statusColor}; ${data.estado_backup === 'Fallo' ? 'background-color: #f8d7da; color: #721c24; padding: 5px; border-radius: 4px;' : ''}">
              ${data.estado_backup}
            </span>
          </p>
            <p><strong>Fecha Inicio:</strong> ${data.fecha_inicio || "No disponible"}</p>
            <p><strong>Fecha Fin:</strong> ${data.fecha_fin || "No disponible"}</p>
            <p><strong>Tamaño Total:</strong> ${data.totalFolderSize || "No disponible"}</p>
            <p><strong>Ruta Backup:</strong> ${data.backupPath || "No disponible"}</p>
            <p><strong>Mensaje de Error:</strong><br> 
          ${formattedError}
        </p>
          </div>
          `;
        }
      }).join('');
    };


    const emailData = {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
          <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">
            Reporte Detallado de Estado de Backups
          </h1>
          
          <!-- Información total -->
          <div style="background-color: #f8f9fa; padding: 10px; margin-bottom: 20px; border-radius: 5px; text-align: center; border: 1px solid #dee2e6;">
            <p style="font-size: 16px; margin: 0;">
              <strong>Total de backups monitoreados:</strong> ${rowData.length + postgresData.length} 
              (Oracle: ${rowData.length}, PostgreSQL: ${postgresData.length})
            </p>
          </div>
          ${durationAlerts.alertsHTML}
          <!-- Resumen de Errores Oracle -->
          ${summaryContent}
          ${missingFoldersContent}
          <!-- Otra información importante -->
          ${pendingContent}
          ${outdatedContent}
          ${networkerConflictsContent}
          ${generateUnifiedContent(allBackups)}
        </div>
      `,
      date: new Date().toLocaleDateString(),
      durationAlerts: durationAlerts.alertsData
    };

    try {
      await window.electron.sendEmailWithImages(emailData);
      // **NUEVO: Log adicional de alertas**
      if (durationAlerts.alertsData && durationAlerts.alertsData.alerts.length > 0) {
        console.log(`📧 Email enviado con ${durationAlerts.alertsData.alerts.length} alerta(s) de duración`);
        durationAlerts.alertsData.alerts.forEach(alert => {
          console.log(`   🚨 ${alert.severity}: ${alert.serverName} - Exceso: ${alert.excessTime}`);
        });
      } else {
        console.log('📧 Email enviado - Todas las duraciones de backup están dentro de parámetros normales');
      }

      console.log('Email enviado exitosamente');
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  }
  function initGrid(gridDiv, isPostgres = false) {
    let columnDefs = isPostgres ? [
      {
        headerName: "Servidor",
        field: "serverName",
        sortable: true,
        filter: true,
        minWidth: 120,
        cellRenderer: (params) => {
          const serverDiv = document.createElement("div");
          serverDiv.classList.add("server-cell");
          serverDiv.textContent = params.data.serverName;
          serverDiv.style.cursor = "pointer";

          serverDiv.addEventListener("click", () => {
            showLogDetailsModal(params.data);
          });

          return serverDiv;
        },
      },
      {
        headerName: "IP",
        field: "ip",
        sortable: true,
        filter: true,
        minWidth: 100,
      },
      {
        headerName: "Archivo de Log",
        field: "logNames",
        sortable: true,
        filter: true,
        minWidth: 200,
        cellRenderer: (params) => {
          const logDiv = document.createElement("div");
          logDiv.classList.add("server-cell");
          logDiv.textContent = params.value || "No disponible";
          logDiv.style.cursor = "pointer";

          // Agregar evento de clic para mostrar el modal
          logDiv.addEventListener("click", () => {
            showLogDetailsModal(params.data);
          });

          return logDiv;
        },
      },
      {
        headerName: "Estado",
        field: "estado_backup",
        sortable: true,
        filter: true,
        minWidth: 100,
        cellRenderer: (params) => {
          const statusClass = params.value === 'Éxito' ? 'status-success' : 'status-failure';
          return `<div class="${statusClass}">${params.value}</div>`;
        },
      },
      {
        headerName: "Fecha Inicio",
        field: "fecha_inicio",
        sortable: true,
        filter: true,
        minWidth: 150,
      },
      {
        headerName: "Fecha Fin",
        field: "fecha_fin",
        sortable: true,
        filter: true,
        minWidth: 150,
      },
      {
        headerName: "Tamaño Total",
        field: "totalFolderSize",
        sortable: true,
        filter: true,
        minWidth: 100,
      },
      {
        headerName: "Ruta de Backup",
        field: "backupPath",
        sortable: true,
        filter: true,
        minWidth: 200,
      },
      {
        headerName: "Mensajes de Error",
        field: "error_message",
        sortable: true,
        filter: true,
        minWidth: 200,
        cellRenderer: (params) => {
          if (!params.value) return 'Sin errores';

          const button = document.createElement("button");
          button.innerHTML = "Ver error";
          button.addEventListener("click", () => {
            showErrorDetailsModal(params.data.error_message);
          });
          return button;
        },
      }
    ] : [
      // Tus columnas originales para el grid principal
      {
        headerName: "Servidor",
        field: "serverName",
        sortable: true,
        filter: true,
        minWidth: 120,
        cellRenderer: (params) => {
          const serverDiv = document.createElement("div");
          serverDiv.classList.add("server-cell");
          serverDiv.textContent = params.data.serverName;
          serverDiv.style.cursor = "pointer";

          // Agregar evento de clic para mostrar el modal
          serverDiv.addEventListener("click", () => {
            console.log("Clic en Servidor:", params.data.serverName);
            showLogDetailsModal(params.data); // Llamar a la función para mostrar el modal
          });

          return serverDiv;
        },
      },
      {
        headerName: "IP",
        field: "ip",
        sortable: true,
        filter: true,
        minWidth: 100,
        cellRenderer: (params) => {
          const ipDiv = document.createElement("div");
          ipDiv.classList.add("server-cell");
          ipDiv.textContent = params.data.ip;
          ipDiv.style.cursor = "pointer";

          // Agregar evento de clic para mostrar el modal
          ipDiv.addEventListener("click", () => {
            showLogDetailsModal(params.data); // Llamar a la función para mostrar el modal
          });

          return ipDiv;
        },
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
        minWidth: 300,
        cellRenderer: (params) => {
          const logDiv = document.createElement("div");
          logDiv.classList.add("server-cell");
          logDiv.textContent = params.data.logFileName;
          logDiv.style.cursor = "pointer";

          // Agregar evento de clic para mostrar el modal
          logDiv.addEventListener("click", () => {
            showLogDetailsModal(params.data); // Llamar a la función para mostrar el modal
          });

          return logDiv;
        },
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
        headerName: "Grupo Maximo",
        field: "groupNumber",
        sortable: true,
        filter: true,
        minWidth: 100,
        cellRenderer: (params) => {
          return `<span>${params.value || "1"}</span>`;
        },
      },
      {
        headerName: "Grupo de control",
        field: "last10Lines",
        cellRenderer: (params) => {
          const button = document.createElement("button");
          button.innerHTML = params.data.groupControlInfo;
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
    ];

    const gridOptions = {
      columnDefs: columnDefs,
      pagination: true,
      paginationPageSize: 10,
      defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
      },
      rowData: [],
      onGridReady: (params) => {
        params.api.sizeColumnsToFit();
      },
      domLayout: "autoHeight",
      onFirstDataRendered: (params) => {
        params.api.autoSizeAllColumns();
      },
    };
    try {
      const gridApi = agGrid.createGrid(gridDiv, gridOptions);

      if (isPostgres) {
        postgresGridApi = gridApi;
      } else {
        mainGridApi = gridApi;
      }

      window.addEventListener("resize", () => {
        if (gridApi) {
          gridApi.sizeColumnsToFit();
        }
      });

      return gridApi;
    } catch (error) {
      console.error(`Error al inicializar ${isPostgres ? 'PostgreSQL' : 'principal'} AG-Grid:`, error);
      return null;
    }
  }
  async function startProcessAllServers() {
    console.log("Iniciando proceso de todos los servidores");
    try {
      showLoading();
      const result = await window.electron.processAllServers();
      hideLoading();
      if (result.success) {
        // Mostrar contenedores de grid
        document.getElementById("gridContainer").style.display = "block";
        document.getElementById("postgresqlGridContainer").style.display = "block";

        // Inicializar los grids si aún no se han hecho
        if (!mainGridApi) {
          mainGridApi = initGrid(document.getElementById("myGrid"), false);
        }

        if (!postgresGridApi) {
          postgresGridApi = initGrid(document.getElementById("postgresqlGrid"), true);
        }

        // Procesar y mostrar los resultados
        displayAllServersResults(result.results);

        // Enviar detalles del servidor (si es necesario)
        if (mainGridApi) {
          await sendServerDetails(mainGridApi);
        }
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
  function showErrorpathModal(message, ip) {
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
  let pendingBackups = [];
  function displayAllServersResults(results) {
    // Verifica que las API de los grids estén disponibles
    if (mainGridApi && typeof mainGridApi.setRowData === "function" && postgresGridApi && typeof postgresGridApi.setRowData === "function") {

      // Creamos dos arrays para los datos del grid principal y el grid de PostgreSQL
      const mainGridData = [];
      const postgresGridData = [];

      results.forEach((serverResult) => {
        console.table(serverResult); // Muestra los resultados en consola

        // Si el servidor tiene un error, lo manejamos
        if (serverResult.error) {
          if (serverResult.error.includes("no existe")) {
            showErrorpathModal(
              "Ruta de Backup No Existente",
              `${serverResult.ip} La ruta ${serverResult.backupPath} no existe en el servidor ${serverResult.serverName}`
            );
          } else if (serverResult.error.includes("/Backup incompleto")) {
            showErrorModal(
              serverResult.error,
              serverResult.ip,
              serverResult.serverName
            );
          } else {
            showErrorModal(
              `No se realizó la conexión con el servidor: ${serverResult.serverName || "Desconocido"}`,
              serverResult.ip || "IP desconocida"
            );
          }
          pendingBackups.push({
            serverName: serverResult.serverName || "Desconocido",
            ip: serverResult.ip || "IP desconocida",
            backupPath: serverResult.backupPath || "Ruta desconocida",
            error: serverResult.error || "Error desconocido"
          });
          return; // No añadir nada al grid
        }

        // Si hay una advertencia, mostramos el modal correspondiente
        if (serverResult.warning) {
          showErrorModal(
            "Backup Incompleto",
            serverResult.warning,
            serverResult.serverName,
            serverResult.ip
          );
          pendingBackups.push({
            serverName: serverResult.serverName || "Desconocido",
            ip: serverResult.ip || "IP desconocida",
            backupPath: serverResult.backupPath || "Ruta desconocida",
            error: serverResult.warning || "Advertencia desconocida"
          });
          return; // No añadir nada al grid
        }
        // Aquí procesamos los detalles del log
        const processLogDetail = (logDetail) => {
          if (logDetail.backupVoid) {
            if (serverResult.serverName !== "Bantotal") {
              showErrorModal(
                "Carpeta Vacía Detectada",
                `${serverResult.ip} La carpeta en la ruta ${logDetail.backupPath} está vacía. \n Servidor: ${serverResult.serverName}`,
                serverResult.serverName,
                serverResult.ip
              );
              return null; // No añadir al grid
            } else {
              console.log(`Omitiendo modal de carpeta vacía para BANTOTAL: ${logDetail.backupPath}`);
              return null; // No añadir al grid
            }
          }

          if (!logDetail || !logDetail.logFileName) {
            if (serverResult.serverName === "Bantotal") {
              console.log(`Omitiendo alerta de log no encontrado para BANTOTAL: ${logDetail?.backupPath || 'ruta desconocida'}`);
              return null;
            }

            showErrorModal(
              `No se encontró archivo de log para el servidor: ${serverResult.serverName || "Desconocido"}`,
              serverResult.ip || "IP desconocida"
            );
            return null;
          }

          const status = serverResult.error ? "Error" : logDetail.logDetails?.success ? "Éxito" : "Fallo";
          const statusClass = status === "Fallo" ? "status-failure" : status === "Éxito" ? "status-success" : "status-error";
          const successClass = logDetail.logDetails?.success ? "" : "error-box";
          const totalDmpSize = Array.isArray(logDetail.dumpFileInfo)
            ? logDetail.dumpFileInfo.reduce((sum, file) => sum + (file.fileSize || 0), 0)
            : 0;
          const formattedDmpSize = formatFileSize(totalDmpSize);
          const formattedFolderSize = logDetail.totalFolderSize
            ? formatFileSize(parseFloat(logDetail.totalFolderSize))
            : "N/A";
          const logInfo = logDetail.logDetails || {};
          const displayedLines = logInfo.hasWarning ? logDetail.last10Lines || [] : [logDetail.lastLine || "No hay información disponible"];
          const groupControlInfo = logInfo.hasWarning ? "Ver grupos de control (Advertencia)" : "Ver última línea del log";

          // Datos específicos para WebContent
          if (
            serverResult.serverName === "WebContent" ||
            (serverResult.serverName === "Contratacion digital" && logDetail.backupPath.trim() === "/disco6/BK_RMAN_CONTRADIGI") ||
            (serverResult.serverName === "BIOMETRIA" && logDetail.backupPath.trim() === "/adicional_new/BK_RMAN_BIOME/BK_RMAN_FULL")
          ) {
            console.log(
              "Procesando servidor especial:",
              serverResult.serverName,
              "con ruta:",
              logDetail.backupPath
            );

            // Para WebContent y otros servidores especiales, omitimos algunos datos
            return {
              serverName: serverResult.serverName || "N/A",
              ip: serverResult.ip || "N/A",
              status: logDetail.logDetails?.estadoBackup || "N/A",
              logFileName: logDetail.logFileName || "N/A",
              startTime: logDetail.logDetails?.fechaInicio || "N/A",
              endTime: logDetail.logDetails?.fechaFin || "N/A",
              duration: logDetail.logDetails?.duracion || "N/A",
              totalDmpSize: "N/A", // No aplica para WebContent
              totalFolderSize: "N/A", // No aplica para WebContent
              statusClass: logDetail.logDetails?.estadoBackup === "Éxito" ? "status-success" : "status-failure",
              oraError: logDetail.logDetails?.errorMessage ? JSON.stringify({ errorLine: logDetail.logDetails.errorMessage }) : null,
              backupPath: logDetail.backupPath || "N/A",
              last10Lines: logDetail.logDetails?.errorMessage || "Recovery Manager complete.",
              groupControlInfo: logDetail.logDetails?.errorMessage ? "Ver error" : "Sin errores",
            };
          }

          // Para servidores no especiales, retornamos los datos con los campos estándar
          return {
            serverName: serverResult.serverName,
            ip: serverResult.ip || "N/A",
            status: status || "N/A",
            statusClass: successClass || "N/A",
            logFileName: logDetail.logFileName || "N/A",
            startTime: logDetail.logDetails?.startTime || "N/A",
            endTime: logDetail.logDetails?.endTime || "N/A",
            duration: logDetail.logDetails?.duration || "N/A",
            totalDmpSize: formattedDmpSize || "N/A", // Cambiado de formattedDmpSize
            totalFolderSize: formattedFolderSize || "N/A", // Cambiado de formattedFolderSize
            backupStatus: logDetail.logDetails?.backupStatus || "N/A",
            backupPath: logDetail.backupPath || "N/A",
            oraError: logDetail.logDetails?.oraError
              ? JSON.stringify(logDetail.logDetails.oraError)
              : null || "N/A",
            statusClass: statusClass || "N/A",
            last10Lines: displayedLines || "N/A",
            groupControlInfo: groupControlInfo || "N/A",
            hasWarning: logInfo.hasWarning || "N/A",
            groupNumber: logDetail.logDetails?.groupNumber || "1", // Agregar esta línea
          };
        };

        // Nueva función específica para procesar datos de PostgreSQL
        const processPostgresDetail = (postgresDetail) => {
          // Eliminar validación incorrecta de backupVoid
          if (!postgresDetail) return null;

          // Mapeo correcto
          return {
            serverName: postgresDetail.serverName || "N/A",
            ip: postgresDetail.ip || "N/A",
            logNames: postgresDetail.logNames || "N/A",
            estado_backup: postgresDetail.estado_backup || "N/A",
            fecha_inicio: postgresDetail.fecha_inicio || "N/A",
            fecha_fin: postgresDetail.fecha_fin || "N/A",
            totalFolderSize: postgresDetail.totalFolderSize || "N/A",
            backupPath: postgresDetail.backupPath || "N/A",
            error_message: postgresDetail.error_message || null
          };
        };
        // Procesar PostgreSQL primero
        if (serverResult.dbEngine === "postgresql") {
          console.log("Procesando PostgreSQL:", serverResult);
          const processed = processPostgresDetail(serverResult);
          if (processed) {
            postgresGridData.push(processed);
            console.log("Datos PostgreSQL procesados:", processed);
          }
          return; // ¡Importante! No continuar con Oracle
        }


        // Procesamiento de los datos de log para el servidor principal
        if (Array.isArray(serverResult.logDetails)) {
          serverResult.logDetails.forEach((logDetail) => {
            const processed = processLogDetail(logDetail);
            if (processed) mainGridData.push(processed);
          });
        } else if (serverResult.logDetails) {
          const processed = processLogDetail(serverResult.logDetails);
          if (processed) mainGridData.push(processed);
        } else {
          showErrorModal(
            `No se encontraron rutas para el servidor: ${serverResult.serverName || "Desconocido"}`,
            serverResult.ip || "IP desconocida"
          );
        }
      });
      console.log('Datos para el grid PostgreSQL:', postgresGridData);
      // Enviar los datos a los grids correspondientes
      mainGridApi.setRowData(mainGridData);
      postgresGridApi.setRowData(postgresGridData);
      let tooltipVisible = false;
      // Configurar el evento de clic en celda para mostrar el tooltip de error
      mainGridApi.addEventListener("cellClicked", (params) => {
        if (params.column.colId === "status" && params.data.status !== "Éxito") {
          const tooltipError = document.getElementById("tooltipError") || (() => {
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
              <div style="padding: 10px;">
                <p><strong>Error ORA encontrado:</strong></p>
                <pre style="margin: 5px 0; white-space: pre-wrap;">${oraError.errorLine || params.data.last10Lines}</pre>
              </div>`;
          } else {
            tooltipError.innerHTML = `
              <div style="padding: 10px;">
                <p><strong>Error encontrado:</strong></p>
                <pre style="margin: 5px 0; white-space: pre-wrap;">${params.data.last10Lines}</pre>
              </div>`;
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
    showCustomAlert(message);
  }
  function addLogEntry(logData) {
    if (logData.backupVoid) {
      return;
    }

    console.log("Datos del log:", logData); // Para verificar el contenido de logData

    if (logData.backupVoid) {
      // Si la carpeta está vacía, no hacer nada y simplemente regresar
      return;
    }
    if (logEntriesContainer) {
      const entryDiv = document.createElement("div");
      entryDiv.className = "log-entry";
      // Verifica que 'serverName' esté correctamente asignado
      const serverName = logData.serverName || "N/A";
      const isPostgreSQL = logData.dbEngine && logData.dbEngine.toLowerCase() === 'postgresql';
      console.log("Es PostgreSQL:", isPostgreSQL);

      if (isPostgreSQL) {
        // Aquí procesas los logs de PostgreSQL, que pueden no tener las mismas propiedades que Oracle.
        const logNames = logData.logNames || "N/A";

        // Convertir CLOB (logNames) si está disponible
        const formattedLogNames = typeof logNames === 'string' ? logNames : 'No se encontraron logs';

        // Asegurarse de que las fechas estén en formato Date
        const parseDate = (dateString) => {
          if (!dateString) return null;
          const parts = dateString.split(/[\s,:/]+/);  // Separar la fecha por los delimitadores
          return new Date(parts[2], parts[1] - 1, parts[0], parts[3], parts[4], parts[5]);
        };

        // Convertir las fechas (en formato 'DD/MM/YYYY, HH:mm:ss') a objetos Date
        const startDate = parseDate(logData.fecha_inicio);
        const endDate = parseDate(logData.fecha_fin);

        // Formatear las fechas como 'DD/MM/YYYY, HH:mm:ss'
        const formattedStartDate = startDate
          ? startDate.toLocaleString('es-PE', {
            hour12: false, // 24 horas
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
          : "N/A";

        const formattedEndDate = endDate
          ? endDate.toLocaleString('es-PE', {
            hour12: false, // 24 horas
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
          : "N/A";

        console.log("Fecha de inicio recibida:", logData.fecha_inicio);
        console.log("Fecha de fin recibida:", logData.fecha_fin);

        console.log("Fecha de inicio formateada:", formattedStartDate);
        console.log("Fecha de fin formateada:", formattedEndDate);

        entryDiv.innerHTML = `
    <p><strong>IP:</strong> ${logData.ip}</p>
    <p><strong>Servidor:</strong> ${serverName}</p>
    <p><strong>Fecha de inicio:</strong> ${formattedStartDate}</p>
    <p><strong>Fecha de fin:</strong> ${formattedEndDate}</p>
    <p><strong>Ruta del backup:</strong> ${logData.backupPath || "N/A"}</p>
    <p><strong>Nombre(s) del archivo(s) .log:</strong> ${formattedLogNames}</p>
    <p><strong>Estado del backup:</strong> ${logData.estado_backup || "No disponible"}</p>
    <p><strong>Mensaje de error:</strong> ${logData.error_message || "Sin errores detectados"}</p>
    <p><strong>Tamaño de la carpeta:</strong> ${logData.totalFolderSize || "N/A"}</p>
  `;
      } else {
        if (
          serverName === "WebContent" ||
          (serverName === "Contratacion digital" &&
            logData.backupPath === "/disco6/BK_RMAN_CONTRADIGI") || (serverName === "BIOMETRIA" &&
              logData.backupPath === "/adicional_new/BK_RMAN_BIOME/BK_RMAN_FULL")
        ) {
          const {
            fechaInicio,
            fechaFin,
            duracion,
            estadoBackup,
            rutaBackup,
            errorMessage,
          } = logData.logDetails;

          entryDiv.innerHTML = `
          <p><strong>IP:</strong> ${logData.ip}</p>
          <p><strong>Servidor:</strong> ${serverName}</p>
          <p><strong>Fecha de inicio:</strong> ${fechaInicio || "N/A"}</p>
          <p><strong>Fecha de fin:</strong> ${fechaFin || "N/A"}</p>
          <p><strong>Duración:</strong> ${duracion || "N/A"}</p>
          <p><strong>Estado del backup:</strong> ${estadoBackup}</p>
          <p><strong>Ruta del backup:</strong> ${logData.backupPath || "N/A"
            }</p>
          <p><strong>Nombre del archivo .log:</strong> ${logData.logFileName || "N/A"
            }</p>
          <p><strong>Mensaje de error:</strong> ${errorMessage || "Sin errores detectados"
            }</p>
      `;
        } else {
          const successClass = logData.logDetails?.success ? "" : "error-box";
          console.log("Contenido de dumpFileInfo:", logData.dumpFileInfo); // Verifica qué archivos se están pasando
          // Subcarpetas que queremos verificar en la ruta de backup
          const subcarpetas = [
            "ESQ_USRREPBI",
            "BK_ANTES2",
            "APP_ESQUEMAS",
            "BK_MD_ANTES",
            "BK_JAQL546_FPAE71",
            "BK_ANTES",
            "RENIEC",
          ];
          let subcarpeta = "";

          // Verificar si el servidor es Bantotal y si la ruta de backup contiene alguna subcarpeta de las definidas
          if (logData.serverName === "Bantotal" && logData.backupPath) {
            // Verificar si alguna subcarpeta está en la ruta de backup
            subcarpeta =
              subcarpetas.find((sub) => logData.backupPath.includes(sub)) || "";
          }

          // Si se encuentra una subcarpeta, la mostramos debajo del título
          let subcarpetaContent = "";
          if (subcarpeta) {
            subcarpetaContent = `<h3 style="font-size: 16px; color: #555;">Subcarpeta: ${subcarpeta}</h3>`;
          }

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
            <p><strong>IP:</strong> ${logData.ip
            }<strong> Nombre del servidor:</strong> ${serverName}</p>
        ${subcarpetaContent}
            <p><strong>Tiempo de inicio:</strong> ${logData.logDetails.startTime || "N/A"
            }</p>
            <p><strong>Tiempo de fin:</strong> ${logData.logDetails.endTime || "N/A"
            }</p>
            <p><strong>Estado del backup:</strong> ${backupStatus}</p>
            <p><strong>Duración:</strong> ${logData.logDetails.duration || "N/A"
            }</p>
            <!-- Aplica la clase 'error' al párrafo si success es No -->
            <p class="${successClass}"><strong>Exitoso?:</strong> ${logData.logDetails.success ? "Yes" : "No"
            }</p>
            <p><strong>Peso total de archivo .dmp:</strong> ${formattedDmpSize}</p> <!-- Aquí -->
            <p><strong>Nombre del archivo .log:</strong> ${logData.logFileName || "N/A"
            }</p>
            <p><strong>Ruta del backup:</strong> ${logData.backupPath || "N/A"
            } (${formattedFolderSize})</p> <!-- Mostrar tamaño de carpeta aquí -->
        `;

          if (logData.logDetails.oraError) {
            entryDiv.dataset.oraError = JSON.stringify(
              logData.logDetails.oraError
            );
          }
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
        }
      }
      document
        .getElementById("close-result")
        .addEventListener("click", function () {
          const resultDiv = document.getElementById("result");
          if (resultDiv) {
            resultDiv.style.display = "none"; // Oculta el div por completo
          }
        });

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
        // Eliminar tooltip existente si hay uno
        if (tooltipError) {
          tooltipError.remove();
        }

        // Crear nuevo tooltip
        tooltipError = document.createElement("div");
        tooltipError.classList.add("tooltip-error");
        document.body.appendChild(tooltipError);

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

        // Prevenir que el click se propague al documento
        event.stopPropagation();
      }
    });

    // Manejar el click en cualquier parte del documento
    document.addEventListener("click", function (event) {
      if (tooltipError && !event.target.classList.contains("error-box")) {
        tooltipError.remove();
        tooltipError = null;
      }
    });
  }
  // Agregar también el manejo de la tecla Escape
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && tooltipError) {
      tooltipError.remove();
      tooltipError = null;
    }
  });
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
    if (!mainGridApi) {
      console.error("Grid API no está disponible");
      return;
    }
    showLoadingIndicator();
    try {
      if (format === "excel") {
        await exportToExcel(mainGridApi);
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
    modal.style.zIndex = "2000";
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>${hasWarning
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
                      <p>Servidores: <span id="uniqueIPs"></span></p>
                      <p>Fecha del último backup: <span id="lastBackupDate"></span></p>
                  </div>
                  <div>
                    <label for="daySelector">Mostrar datos de los últimos:</label>
                    <select id="daySelector">
                      <option value="15" selected>15 días</option>
                      <option value="30">30 días</option>
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
  function convertDurationToMinutes(duration) {
    if (!duration) return 0; // Manejar null/undefined/empty

    try {
      // Convertir a string y limpiar
      const durationStr = String(duration).trim();

      // 1. Formato HH:mm:ss (Oracle estándar y PostgreSQL calculado)
      const hhmmssPattern = /^(\d{1,3}):(\d{2}):(\d{2})$/;

      // 2. Formato con días (Oracle para duraciones largas)
      const daysPattern = /^(\d+)\s+days?\s+(\d{1,2}):(\d{2}):(\d{2})$/i;

      // 3. Formato solo minutos (alternativa)
      const minsPattern = /^(\d+(?:\.\d+)?)\s*min$/i;

      // 4. Formato solo segundos 
      const secsPattern = /^(\d+(?:\.\d+)?)\s*sec$/i;

      // 5. Formato de Oracle INTERVAL
      const intervalPattern = /^\+?(\d{2,})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/;

      let match;

      // Caso 1: Formato HH:mm:ss
      if ((match = durationStr.match(hhmmssPattern))) {
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const seconds = parseInt(match[3]);
        return hours * 60 + minutes + seconds / 60;
      }
      // Caso 2: Formato con días
      else if ((match = durationStr.match(daysPattern))) {
        const days = parseInt(match[1]);
        const hours = parseInt(match[2]);
        const minutes = parseInt(match[3]);
        const seconds = parseInt(match[4]);
        return (days * 1440) + (hours * 60) + minutes + (seconds / 60);
      }
      // Caso 3: Formato en minutos
      else if ((match = durationStr.match(minsPattern))) {
        return parseFloat(match[1]);
      }
      // Caso 4: Formato en segundos
      else if ((match = durationStr.match(secsPattern))) {
        return parseFloat(match[1]) / 60;
      }
      // Caso 5: Formato INTERVAL de Oracle
      else if ((match = durationStr.match(intervalPattern))) {
        const days = parseInt(match[1]);
        const hours = parseInt(match[2]);
        const minutes = parseInt(match[3]);
        const seconds = parseInt(match[4]);
        return (days * 1440) + (hours * 60) + minutes + (seconds / 60);
      }

      console.warn(`Formato de duración no reconocido: "${durationStr}"`);
      return 0;
    } catch (e) {
      console.error(`Error al convertir duración: "${duration}"`, e);
      return 0;
    }
  }

  async function showStatistics() {
    const loadingIndicator = document.createElement('div');
    loadingIndicator.textContent = 'Cargando estadísticas...';
    loadingIndicator.style.position = 'fixed';
    loadingIndicator.style.top = '50%';
    loadingIndicator.style.left = '50%';
    loadingIndicator.style.transform = 'translate(-50%, -50%)';
    loadingIndicator.style.backgroundColor = 'rgba(0,0,0,0.5)';
    loadingIndicator.style.color = 'white';
    loadingIndicator.style.padding = '20px';
    loadingIndicator.style['backdrop-filter'] = 'blur(5px)';
    document.body.appendChild(loadingIndicator);
    try {
      if (!statisticsModal) {
        console.log("Creando modal de estadísticas");
        createStatisticsModal();
      }
      if (!statisticsModal) {
        console.error("No se pudo crear el modal de estadísticas");
        showCustomAlert(
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

        //console.log("Datos de tamaño DMP recibidos:", globalDmpSizeData);

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

        filteredData.forEach((serverData, index) => {
          // Crear un contenedor div para cada gráfico
          const chartDiv = document.createElement("div");
          chartDiv.style.marginBottom = "30px";
          chartDiv.style.paddingBottom = "20px";
          chartDiv.style.borderBottom = "2px solid #e0e0e0";
          // Si es el último elemento, quitamos el borde
          if (index === filteredData.length - 1) {
            chartDiv.style.borderBottom = "none";
          }
          //console.log("Datos para el gráfico:", serverData);
          const canvasId = `chart-${serverData.identifier}`.replace(
            /[^a-zA-Z0-9]/g,
            "_"
          );
          const canvasElement = document.createElement("canvas");
          canvasElement.id = canvasId;
          chartDiv.appendChild(canvasElement);
          // Agregar el div contenedor al contenedor principal
          chartContainer.appendChild(chartDiv);

          const ctx = canvasElement.getContext("2d");

          const sortedData = serverData.data
            .map((d) => ({
              ...d,
              duracion: convertDurationToMinutes(d.duracion), // Convertir duración a minutos
            }))
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

          new Chart(ctx, {
            type: "line",
            data: {
              datasets: [
                {
                  label: `${serverData.identifier} - Tamaño`,
                  data: sortedData.map((d) => ({
                    x: new Date(d.fecha),
                    y: d.tamanoDMP,
                  })),
                  fill: false,
                  borderColor: getRandomColor(),
                  tension: 0.1,
                  yAxisID: "y1",
                },
                {
                  label: `${serverData.identifier} - Duración`,
                  data: sortedData.map((d) => ({
                    x: new Date(d.fecha),
                    y: d.duracion, // Duración en minutos
                  })),
                  fill: false,
                  borderColor: getRandomColor(),
                  tension: 0.1,
                  yAxisID: "y2",
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: serverData.serverName,
                  font: {
                    size: 16,
                    weight: 'bold'
                  },
                  padding: {
                    top: 10,
                    bottom: 15
                  }
                },
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
                      if (context.datasetIndex === 0) {
                        return `Tamaño: ${context.parsed.y.toFixed(2)} GB`;
                      } else {
                        return `Duración: ${context.parsed.y.toFixed(2)} min`;
                      }
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
                y1: {
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
                y2: {
                  type: "linear",
                  display: true,
                  position: "right",
                  title: {
                    display: true,
                    text: "Duración (min)",
                  },
                  grid: {
                    drawOnChartArea: false,
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

        //console.log(
        //"Todos los servidores y rutas:",
        //result.allServersAndRoutes
        //);
        //console.log("Datos procesados:", result.data);

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

      // Inicializar el gráfico y los selectores con 15 días por defecto
      const initialResult = await window.electron.getDmpSizeData(15);
      //console.log(
      // "Estructura completa de initialResult:",
      // JSON.stringify(initialResult, null, 2)
      //);
      populateSelectors(initialResult);
      await updateCharts(15, "all", "all");

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
      showCustomAlert(
        "Error al obtener o mostrar estadísticas. Por favor, revisa la consola para más detalles."
      );
    } finally {
      document.body.removeChild(loadingIndicator);
    }
  }
  function getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const addRouteModal = document.createElement("div");
  addRouteModal.id = "add-route-modal";
  addRouteModal.className = "modal";
  addRouteModal.style.display = "none"; // Inicialmente oculto
  addRouteModal.innerHTML = `
    <div class="modal-content">
      <span id="close-modal" class="close">&times;</span>
      <h2>Agregar Nueva Ruta de Backup</h2>
      <form id="add-route-form">
        <label for="new-backup-path">Ruta de Backup:</label>
        <input type="text" id="new-backup-path" name="new-backup-path" required />
        <button type="submit">Guardar Ruta</button>
      </form>
    </div>
  `;
  document.body.appendChild(addRouteModal);

  // Configuración de botones e interacciones
  const addRouteBtn = document.getElementById("add-route-btn");
  const closeModal = document.getElementById("close-modal");
  const addRouteForm = document.getElementById("add-route-form");
  const backupRoutesSelect = document.getElementById("backup-routes");

  // Mostrar el modal al hacer clic en el botón de agregar ruta
  addRouteBtn.addEventListener("click", () => {
    addRouteModal.style.display = "block";
  });

  // Cerrar el modal al hacer clic en la "x" del modal
  closeModal.addEventListener("click", () => {
    addRouteModal.style.display = "none";
  });

  // Cerrar el modal al hacer clic fuera del contenido del modal
  window.onclick = function (event) {
    if (event.target === addRouteModal) {
      addRouteModal.style.display = "none";
    }
  };

  // Manejar el envío del formulario de agregar ruta
  addRouteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newBackupPath = document.getElementById("new-backup-path").value;
    const selectedIP = document.getElementById("ip").value;

    try {
      // Llamada al backend para agregar la nueva ruta
      const response = await window.electron.addBackupRoute(
        selectedIP,
        newBackupPath
      );
      if (response.success) {
        // Añadir la nueva ruta al select de rutas
        const option = document.createElement("option");
        option.value = newBackupPath;
        option.textContent = newBackupPath;
        backupRoutesSelect.appendChild(option);
        showCustomAlert("Ruta agregada correctamente");

        // Cerrar el modal y reiniciar el formulario
        addRouteModal.style.display = "none";
        addRouteForm.reset();
      } else {
        showCustomAlert(
          "Error al agregar la ruta. Por favor, intenta de nuevo."
        );
      }
    } catch (error) {
      console.error("Error al agregar la ruta:", error);
      showCustomAlert("Error al agregar la ruta.");
    }
  });

  // Crear el modal para editar una ruta de backup
  const editRouteModal = document.createElement("div");
  editRouteModal.id = "edit-route-modal";
  editRouteModal.className = "modal";
  editRouteModal.style.display = "none"; // Inicialmente oculto
  editRouteModal.innerHTML = `
  <div class="modal-content">
    <span id="close-edit-modal" class="close">&times;</span>
    <h2>Editar Ruta de Backup</h2>
    <form id="edit-route-form">
      <label for="edit-backup-path">Nueva Ruta de Backup:</label>
      <input type="text" id="edit-backup-path" name="edit-backup-path" required />
      <button type="submit">Guardar Cambios</button>
    </form>
  </div>
`;
  document.body.appendChild(editRouteModal);
  const editRouteBtn = document.getElementById("edit-route-btn");
  const closeEditModal = document.getElementById("close-edit-modal");
  const editRouteForm = document.getElementById("edit-route-form");
  const editBackupPathInput = document.getElementById("edit-backup-path");

  // Mostrar el modal de edición al hacer clic en el botón de editar ruta
  editRouteBtn.addEventListener("click", () => {
    const selectedOption =
      backupRoutesSelect.options[backupRoutesSelect.selectedIndex];
    if (selectedOption) {
      editBackupPathInput.value = selectedOption.value; // Cargar el valor actual en el input
      editRouteModal.style.display = "block";
    } else {
      showCustomAlert("Por favor, selecciona una ruta de backup para editar.");
    }
  });

  // Cerrar el modal de edición al hacer clic en la "x"
  closeEditModal.addEventListener("click", () => {
    editRouteModal.style.display = "none";
  });

  // Cerrar el modal al hacer clic fuera del contenido del modal
  window.onclick = function (event) {
    if (event.target === editRouteModal) {
      editRouteModal.style.display = "none";
    }
  };

  // Manejar el envío del formulario para editar la ruta
  editRouteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newBackupPath = editBackupPathInput.value;
    const selectedOption =
      backupRoutesSelect.options[backupRoutesSelect.selectedIndex];
    const selectedIP = document.getElementById("ip").value;

    try {
      // Llamada al backend para actualizar la ruta en la base de datos
      const response = await window.electron.updateBackupRoute(
        selectedIP,
        selectedOption.value,
        newBackupPath
      );
      if (response.success) {
        // Actualizar el valor de la ruta en el select
        selectedOption.value = newBackupPath;
        selectedOption.textContent = newBackupPath;
        showCustomAlert("Ruta actualizada correctamente");

        // Cerrar el modal y reiniciar el formulario
        editRouteModal.style.display = "none";
        editRouteForm.reset();
      } else {
        showCustomAlert(
          "Error al actualizar la ruta. Por favor, intenta de nuevo."
        );
      }
    } catch (error) {
      console.error("Error al actualizar la ruta:", error);
      showCustomAlert("Error al actualizar la ruta.");
    }
  });

  const deleteRouteBtn = document.getElementById("delete-route-btn");

  // Manejar el clic en el botón de eliminar ruta
  deleteRouteBtn.addEventListener("click", async () => {
    const selectedOption =
      backupRoutesSelect.options[backupRoutesSelect.selectedIndex];
    const selectedIP = document.getElementById("ip").value;

    if (selectedOption) {
      // Mostrar alerta de confirmación
      const confirmDelete = await showConfirmDeleteModal(
        `¿Estás seguro de que deseas eliminar la ruta "${selectedOption.value}"?`
      );
      if (confirmDelete) {
        try {
          // Llamada al backend para eliminar la ruta
          const response = await window.electron.deleteBackupRoute(
            selectedIP,
            selectedOption.value
          );
          if (response.success) {
            // Eliminar la opción de la lista si la eliminación fue exitosa
            selectedOption.remove();
            showCustomAlert("Ruta eliminada correctamente");
          } else {
            showCustomAlert(
              "Error al eliminar la ruta. Por favor, intenta de nuevo."
            );
          }
        } catch (error) {
          console.error("Error al eliminar la ruta:", error);
          showCustomAlert("Error al eliminar la ruta.");
        }
      }
    } else {
      showCustomAlert(
        "Por favor, selecciona una ruta de backup para eliminar."
      );
      setTimeout(() => {
        const firstInput = document.querySelector("input"); // Selecciona el primer campo input
        if (firstInput) {
          firstInput.focus(); // Mueve el foco al primer campo input
        }
      }, 0);
    }
  });
  // Función para actualizar los campos del formulario con los datos del servidor
  async function updateFormFields(selectedIp) {
    try {
      // Obtener la lista completa de servidores
      const servers = await window.electron.getServers();

      // Buscar el servidor que tiene la IP seleccionada
      const selectedServer = servers.find((server) => server.ip === selectedIp);

      if (selectedServer && selectedServer.id) {
        const serverDetails = await window.electron.getServerDetails(
          selectedServer.id
        );
        console.log("Detalles del servidor obtenidos:", serverDetails);

        if (serverDetails) {
          // Rellenar los campos del formulario con los detalles del servidor
          document.getElementById("username").value =
            serverDetails.username || "";
          document.getElementById("password").value =
            serverDetails.password || "";
        } else {
          console.warn(
            "No se encontraron detalles para el servidor seleccionado."
          );
        }
      } else {
        console.warn("No se encontró ningún servidor con la IP seleccionada.");
      }
    } catch (error) {
      console.error("Error al obtener los detalles del servidor:", error);
    }
  }

  // Eventos para actualizar las credenciales cuando cambia el sistema operativo o la IP
  osSelect.addEventListener("change", updateIPOptions);
  ipSelect.addEventListener("change", () => {
    updateFormFields(ipSelect.value);
  });
  function convertToGB(totalFolderSize) {
    if (typeof totalFolderSize === "number") {
      return `${(totalFolderSize / 1000).toFixed(2)} GB`; // Si el tamaño es un número, convertirlo a GB directamente
    }
    // Extrae el número de "totalFolderSize"
    const sizePattern = /(\d+(?:\.\d+)?)\s*(MB|GB)?/i;
    const match = totalFolderSize.match(sizePattern);

    if (!match) return totalFolderSize; // Si el formato es incorrecto, regresamos el valor sin cambios

    let sizeInMB = parseFloat(match[1]);
    const unit = match[2] ? match[2].toUpperCase() : "MB"; // Asume "MB" si no hay unidad

    // Solo convierte si la unidad es "MB" y el valor es mayor o igual a 1000
    if (unit === "MB" && sizeInMB >= 1000) {
      const sizeInGB = (sizeInMB / 1000).toFixed(2);
      return `${sizeInGB} GB`;
    }

    // Devuelve el tamaño en MB o GB sin cambios si es menor a 1000 MB o ya está en GB
    return `${sizeInMB.toFixed(2)} ${unit}`;
  }

  // Definir las subcarpetas requeridas para Bantotal
  const requiredSubfolders = [
    "ESQ_USRREPBI",
    "BK_ANTES2",
    "APP_ESQUEMAS",
    "BK_MD_ANTES",
    "BK_JAQL546_FPAE71",
    "BK_ANTES",
    "RENIEC",
  ];
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
        if (!connectionResult.success) {
          throw new Error("Error al intentar conectar con el servidor"); // Si la conexión falla, lanzar el error devuelto
        }
        console.log("Connection successful");

        const os = result.osType;

        // Si el sistema operativo ha cambiado, limpiamos los logs anteriores
        if (currentOS !== os) {
          clearLogEntries();
          currentOS = os; // Actualizamos el sistema operativo actual
        }

        let directoryPath = backupRouteSelect.value; // Usa la ruta actual seleccionada en backupRouteSelect

        console.log("Ruta de backup seleccionada:", directoryPath);
        const servers = await window.electron.getServers(); // Asegúrate de que esta llamada sea correcta
        console.log("Servers:", servers); // Para ver qué estás obteniendo

        if (!Array.isArray(servers)) {
          console.error(
            "Los servidores no se obtuvieron como un array:",
            servers
          );
          return; // O maneja el error de otra manera
        }

        const server = servers.find((s) => s.ip === ip);
        const serverName = server ? server.name : "N/A";

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
        // Verificar si se devolvió un error sobre la ruta

        if (logDetailsArray?.error) {
          showErrorModal(
            logDetailsArray.error,
            logDetailsArray.ip,
            serverName,
            logDetailsArray.backupPath
          );
          return;
        }
        if (logDetailsArray === null) {
          console.log(`Ruta ${directoryPath} excluida del procesamiento.`);
          return; // Ignorar rutas excluidas
        }

        if (
          !logDetailsArray ||
          (Array.isArray(logDetailsArray) && logDetailsArray.length === 0)
        ) {
          const warningMessage = `Archivo log no válido o incompatible para la ruta: ${directoryPath}, en el servidor: ${serverName}`;
          showErrorModal(warningMessage, ip);
          return; // Mostrar modal solo si no hay datos válidos reales
        }
        // Verifica si hay elementos en logDetailsArray
        // Antes del bucle que procesa los detalles del log
        let hasShownBackupIncompleteError = false;
        // Procesar los detalles del log
        if (Array.isArray(logDetailsArray)) {
          for (const logData of logDetailsArray) {
            const serverName = logData.serverName;
            if (
              serverName === "WebContent" ||
              (serverName === "Contratacion digital" &&
                logData.backupPath === "/disco6/BK_RMAN_CONTRADIGI") || (serverName === "BIOMETRIA" &&
                  logData.backupPath === "/adicional_new/BK_RMAN_BIOME/BK_RMAN_FULL")
            ) {
              // Para WebContent, solo agregamos la entrada del log
              addLogEntry({ ...logData, ip });
            } else {
              //console.log("Adding log entry:", logData);
              if (
                serverName === "Bantotal" &&
                logData.backupIncomplete &&
                !hasShownBackupIncompleteError
              ) {
                // Encuentra las subcarpetas existentes en `directories`
                const existingSubfolders = directoryPath.split("/").pop(); // Obtener solo el nombre de la carpeta, puedes adaptarlo a cómo se obtienen tus subcarpetas.

                // Filtrar las subcarpetas requeridas que no están presentes
                const missingSubfolders = requiredSubfolders.filter(
                  (required) => !existingSubfolders.includes(required) // Comparación exacta
                );

                // Mensaje para el modal
                let warningMessage = `Backup Incompleto: Se esperaban 7 carpetas, pero se encontraron ${logData.foundFolders}.`;
                if (missingSubfolders.length > 0) {
                  warningMessage += ` Faltan las siguientes carpetas: ${missingSubfolders.join(
                    ", "
                  )}.`;
                }
                console.log("Mostrando modal de error por backup incompleto");
                showErrorModal(warningMessage, ip);
                hasShownBackupIncompleteError = true; // Marcamos que ya se mostró el modal
              }
              // Verificación para mostrar modal si se detecta carpeta vacía
              if (logData.backupVoid === true) {
                console.log("Mostrando modal de advertencia por carpeta vacía");
                showErrorModal(
                  `Advertencia: Se detectó una carpeta vacía en la ruta ${logData.backupPath}, 
                 En el servidor :${serverName}`,
                  ip
                );
              }
              addLogEntry({ ...logData, ip });
              const formattedTotalFolderSize = convertToGB(
                logData.totalFolderSize
              );
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
                  logData.backupPath,
                  formattedTotalFolderSize || "0 MB"
                );
              }
            }
          }
        } else if (logDetailsArray && typeof logDetailsArray === "object") {
          const serverName = logDetailsArray.serverName;
          if (
            serverName === "WebContent" ||
            (serverName === "Contratacion digital" &&
              logData.backupPath === "/disco6/BK_RMAN_CONTRADIGI") || (serverName === 'BIOMETRIA' && logData.backupPath === "/adicional_new/BK_RMAN_BIOME/BK_RMAN_FULL")
          ) {
            // Para WebContent, solo agregamos la entrada del log
            addLogEntry({ ...logDetailsArray, ip });
          } else {
            if (
              serverName === "Bantotal" &&
              logDetailsArray.backupIncomplete &&
              !hasShownBackupIncompleteError
            ) {
              const existingSubfolders = directoryPath.split("/").pop(); // Obtener solo el nombre de la carpeta

              const missingSubfolders = requiredSubfolders.filter(
                (required) => !existingSubfolders.includes(required) // Comparación exacta
              );

              let warningMessage = `Backup Incompleto: Se esperaban 7 carpetas, pero se encontraron ${logDetailsArray.foundFolders}.`;
              if (missingSubfolders.length > 0) {
                warningMessage += ` Faltan las siguientes carpetas: ${missingSubfolders.join(
                  ", "
                )}.`;
              }
              console.log("Mostrando modal de error por backup incompleto");
              showErrorModal(warningMessage, ip);
              hasShownBackupIncompleteError = true; // Marcamos que ya se mostró el modal
            }
            // Verificación para mostrar modal si se detecta carpeta vacía
            if (logDetailsArray.backupVoid === true) {
              console.log("Mostrando modal de advertencia por carpeta vacía");
              showErrorModal(
                `Advertencia: Se detectó una carpeta vacía en la ruta ${logDetailsArray.backupPath}, 
               En el servidor:${serverName}`,
                ip
              );
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
                logData.backupPath,
                formattedTotalFolderSize
              );
            }
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
