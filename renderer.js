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


  if (currentPage.includes("index.html")) {
    document.getElementById("verify-connection-btn").addEventListener("click", async () => {
      // Obtén los valores del formulario
      const ip = document.getElementById("ip").value;
      const port = document.getElementById("port").value || 22; // Usa 22 como puerto por defecto
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      try {
        // Llama a la función de conexión en el backend usando ipcRenderer
        const result = await window.electron.connectToServer(ip, port, username, password);

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
    // Botón de Historial
    const historyButton = document.createElement("button");
    historyButton.textContent = "Historial de Verificaciones";
    historyButton.id = "showHistoryButton";
    historyButton.onclick = showHistory;
    topBar.appendChild(statsButton);
    topBar.appendChild(historyButton);
    document.body.insertBefore(topBar, document.body.firstChild);
    document.body.style.marginTop = "50px"; // Ajusta este valor según sea necesario
  }
  async function showHistory() {
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
    closeXButton.style.fontSize = "20px";
    closeXButton.style.cursor = "pointer";
    closeXButton.onclick = () => document.body.removeChild(modal);
    content.appendChild(closeXButton);

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = new Date().toISOString().split("T")[0];
    dateInput.style.marginBottom = "10px";
    content.appendChild(dateInput);

    const filterButton = document.createElement("button");
    filterButton.textContent = "Filtrar por Fecha de ejecución";
    filterButton.onclick = async () => {
      const selectedDate = dateInput.value;
      await loadHistoryData(selectedDate, resultsContainer);
    };
    content.appendChild(filterButton);

    const resultsContainer = document.createElement("div");
    resultsContainer.style.marginTop = "20px";
    resultsContainer.style.width = "100%";
    resultsContainer.style.height = "75vh"; // Aumenta la altura para ocupar el espacio del modal
    resultsContainer.style.overflowY = "auto"; // Habilita el scroll solo en el contenedor de resultados
    content.appendChild(resultsContainer);

    const closeButton = document.createElement("button");
    closeButton.textContent = "Cerrar";
    closeButton.onclick = () => document.body.removeChild(modal);
    content.appendChild(closeButton);

    modal.appendChild(content);
    document.body.appendChild(modal);

    await loadHistoryData(dateInput.value, resultsContainer);
  }

  async function loadHistoryData(date, container) {
    try {
      const historyData = await window.electron.getVerificationHistory(date);
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
          valueFormatter: (params) => {
            const date = new Date(params.value);
            return date.toLocaleString("es-ES", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit"
            });
          }
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
          }
        },
        { headerName: "IP", field: "ip", sortable: true, filter: true, minWidth: 120 },
        {
          headerName: "Estado",
          field: "success",
          sortable: true,
          filter: true,
          minWidth: 120,
          headerTooltip: "1 = Éxito, 0 = Fallo",
          cellRenderer: (params) => {
            const statusText = params.value === 1 ? "Éxito" : "Fallo";
            const statusClass = params.value === 1 ? "status-success" : "status-failure";
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

                // Mostrar el contenido completo de oraErrorMessage
                tooltipError.textContent = oraErrorMessage;

                // Añadir el tooltip al documento
                document.body.appendChild(tooltipError);
                console.log("Tooltip creado y añadido al DOM");

                // Aplicar estilos al tooltip
                tooltipError.style.position = "fixed";
                tooltipError.style.top = `${event.clientY + 10}px`;
                tooltipError.style.left = `${event.clientX + 10}px`;
                tooltipError.style.backgroundColor = "#f8d7da";
                tooltipError.style.color = "#721c24";
                tooltipError.style.padding = "10px";
                tooltipError.style.border = "1px solid #f5c6cb";
                tooltipError.style.borderRadius = "5px";
                tooltipError.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";
                tooltipError.style.zIndex = "10000";
                tooltipError.style.display = "block";
                tooltipError.style.opacity = "1";
                tooltipError.style.maxWidth = "300px";
                tooltipError.style.wordWrap = "break-word";

                console.log("Estilos aplicados al tooltip:", tooltipError.style);

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
          }
        },
        { headerName: "Archivo de Log", field: "logFileName", sortable: true, filter: true, minWidth: 150 },
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
              second: "2-digit"
            });
          }
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
              second: "2-digit"
            });
          }
        },
        { headerName: "Duración", field: "duration", sortable: true, filter: true, minWidth: 150 },
        { headerName: "Tamaño Total DMP", field: "dumpFileSize", sortable: true, filter: true, minWidth: 200 },
        { headerName: "Tamaño Total Carpeta", field: "totalFolderSize", sortable: true, filter: true, minWidth: 200 },
        { headerName: "Estado de Backup", field: "backupStatus", sortable: true, filter: true, minWidth: 200 },
        { headerName: "Ruta de Backup", field: "backupPath", sortable: true, filter: true, minWidth: 170 },
        {
          headerName: "Grupo de control",
          field: "last10Lines",
          minWidth: 250,
          cellRenderer: (params) => {
            const button = document.createElement("button");

            // Comprobamos si el servidor es "WebContent" o "Contratacion digital" y la ruta específica
            const isSpecialServer =
              (params.data.serverName === "WebContent" ||
                (params.data.serverName === "Contratacion digital" && params.data.backupPath === "/disco3/BK_RMAN_CONTRADIGI"));

            // Si es un servidor especial, usamos `error_message` como contenido del botón
            if (isSpecialServer) {
              button.innerHTML = "Ver error"; // Título del botón
              button.addEventListener("click", () => {
                const errorMessage = params.data.oraErrorMessage || "Sin errores detectados"; // `oraErrorMessage` o mensaje por defecto
                showLast10LinesModal(errorMessage); // Llamada al modal con `error_message`
              });
            } else {
              // Caso general: comprobamos si `groupControlInfo` tiene "Job" para determinar el título
              if (params.data.groupControlInfo && params.data.groupControlInfo.includes("Job")) {
                button.innerHTML = "Ver última línea del log";
              } else {
                button.innerHTML = "Ver advertencias";
              }

              // Lógica para el caso general: mostrar `groupControlInfo`
              button.addEventListener("click", () => {
                const contentToShow = params.data.groupControlInfo || "No disponible";
                showLast10LinesModal(contentToShow);
              });
            }

            return button;
          }
        }
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
        },
        onFirstDataRendered: (params) => {
          params.api.sizeColumnsToFit(); // Ajusta las columnas al tamaño del contenedor al renderizar los datos
        }
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
  // Función para crear el modal con los detalles del servidor
  function showServerDetailsModal(serverData) {
    console.log("Mostrando detalles del servidor:", serverData);
    // Función para formatear la fecha en el formato yyyy/mm/dd hh:mm:ss
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    };

    // Formatear las fechas horaINI y horaFIN
    const formattedHoraINI = formatDate(serverData.horaINI);
    const formattedHoraFIN = formatDate(serverData.horaFIN);

    // Determinar el estado "Exitoso?"
    const successStatus = serverData.success === 1 ? "Éxito" : "Fallo";
    const statusClass = serverData.success === 1 ? "status-success" : "status-failure";

    // Verificar si el servidor es Bantotal y si el backupPath contiene alguna de las subcarpetas especificadas
    const subcarpetas = ["ESQ_USRREPBI", "BK_ANTES2", "APP_ESQUEMAS", "BK_MD_ANTES", "BK_JAQL546_FPAE71", "BK_ANTES", "RENIEC"];
    const isBantotal = serverData.serverName.includes("Bantotal"); // Verificar si es el servidor Bantotal
    let subcarpeta = '';

    if (isBantotal) {
      subcarpeta = subcarpetas.find(sub => serverData.backupPath.includes(sub)) || ''; // Buscar si alguna subcarpeta está en la ruta de backup
    }


    // Verificar si el log contiene "Job"
    const containsJob = (serverData.groupControlInfo || '').includes("Job");

    // Determinar el título para las últimas 10 líneas
    const last10LinesTitle = containsJob ? "Ver última línea del log" : "Advertencia:";

    // Crear contenido del modal
    const modalContent = `
    <h2 style="text-align: center; font-size: 20px;">Detalles del Servidor ${serverData.serverName}</h2>
    ${subcarpeta ? `<h3 style="text-align: center; font-size: 18px; color: #555;">Subcarpeta: ${subcarpeta}</h3>` : ''}
    <p><strong>IP:</strong> ${serverData.ip}</p>
    <p><strong>Archivo Log:</strong> ${serverData.logFileName || 'No disponible'}</p>
    <p><strong>Hora de Inicio:</strong> ${formattedHoraINI || 'No disponible'}</p>
    <p><strong>Hora de Fin:</strong> ${formattedHoraFIN || 'No disponible'}</p>
    <p><strong>Duración:</strong> ${serverData.duration || 'No disponible'}</p>
    <p><strong>Estado de Backup:</strong> ${serverData.backupStatus || "No disponible"}</p>
    <p><strong>Exitoso?:</strong> 
      <span id="success-status" class="${statusClass}" style="cursor: pointer;">
        ${successStatus || 'No disponible'}
      </span>
    </p>
    <p><strong>Ruta de Backup:</strong> ${serverData.backupPath || "No disponible"}</p>
    ${serverData.serverName === 'WebContent' || (serverData.serverName === 'Contratacion digital' && serverData.backupPath === '/disco3/BK_RMAN_CONTRADIGI')
        ? ''
        : `
        <p><strong>Peso total del archivo .dmp:</strong> ${serverData.dumpFileSize || 'No disponible'}</p>
        <p><strong>Tamaño total de carpeta:</strong> ${serverData.totalFolderSize || 'No disponible'}</p>
      `}
    <h3 style="margin-top: 20px;">${last10LinesTitle || 'No disponible'}</h3>
    <pre style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; max-height: 200px; overflow-y: auto;">
       ${(serverData.groupControlInfo || serverData.oraErrorMessage || "No disponible")}
    </pre>
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

        // Mostrar el contenido completo de oraErrorMessage
        tooltipError.textContent = serverData.oraErrorMessage;

        // Añadir el tooltip al documento
        document.body.appendChild(tooltipError);

        // Aplicar estilos al tooltip
        tooltipError.style.position = "fixed";
        tooltipError.style.top = `${event.clientY + 10}px`;
        tooltipError.style.left = `${event.clientX + 10}px`;
        tooltipError.style.backgroundColor = "#f8d7da";
        tooltipError.style.color = "#721c24";
        tooltipError.style.padding = "10px";
        tooltipError.style.border = "1px solid #f5c6cb";
        tooltipError.style.borderRadius = "5px";
        tooltipError.style.boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";
        tooltipError.style.zIndex = "10000";
        tooltipError.style.display = "block";
        tooltipError.style.opacity = "1";
        tooltipError.style.maxWidth = "300px";
        tooltipError.style.wordWrap = "break-word";

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
                showCustomAlert("Error al eliminar el servidor: " + result.error);
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
        const filteredServers = servers.filter(server => server.os === selectedOS);

        if (filteredServers.length > 0) {
          // Si hay servidores que coinciden, agrégalos al select de IP
          filteredServers.forEach(server => {
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
          console.log("No hay servidores disponibles para este sistema operativo.");
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
  if (processAllServersBtn) {
    processAllServersBtn.addEventListener("click", startProcessAllServers);
  } else {
    console.error("Botón process-all-servers-btn no encontrado");
  }
  function showLogDetailsModal(logData) {
    console.log("Entrando en showLogDetailsModal con datos:", logData);
    const successStatus = logData.status ? "Éxitoso" : "Fallo";
    const statusClass = logData.status ? "status-success" : "status-failure";
    const statusStyle = logData.status ? "" : "color: red; cursor: pointer;";
    // Verificar si el servidor es WebContent o Contratacion Digital
    const isSpecialServer = logData.serverName === "WebContent" || logData.serverName === "Contratacion digital" && logData.backupPath === "/disco3/BK_RMAN_CONTRADIGI";

    // Determinar si se deben mostrar las últimas 10 líneas del log
    let last10LinesContent = '';
    let last10LinesTitle = '';

    if (!isSpecialServer) {
      // Solo pedir last10Lines si no es WebContent o Contratacion Digital
      const logIncludesJob = (logData.last10Lines || []).some(line => line.includes("Job"));
      last10LinesTitle = logIncludesJob ? "Ver última línea del log" : "Advertencia:";
      last10LinesContent = `<pre style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; max-height: 200px; overflow-y: auto;">
      ${(logData.last10Lines || []).join('\n') || 'No disponible'}
    </pre>`;
    } else {
      // Si es WebContent o Contratacion Digital, solo mostrar otros datos relevantes
      last10LinesTitle = "Errores RMAN?";
      last10LinesContent = logData.groupControlInfo;
    }

    // Verificar si el servidor es Bantotal y si el backupPath contiene alguna de las subcarpetas
    const subcarpetas = ["ESQ_USRREPBI", "BK_ANTES2", "APP_ESQUEMAS", "BK_MD_ANTES", "BK_JAQL546_FPAE71", "BK_ANTES", "RENIEC"];
    const isBantotal = logData.serverName === "Bantotal"; // Asegurarse que el servidor sea "Bantotal"
    let subcarpeta = '';

    if (isBantotal) {
      // Buscar si alguna subcarpeta está en la ruta de backup
      subcarpeta = subcarpetas.find(sub => logData.backupPath.includes(sub)) || '';
    }

    // Crear contenido del modal
    const modalContent = `
      <h2 style="text-align: center; font-size: 20px;">Detalles del Log para ${logData.serverName}</h2>
      ${subcarpeta ? `<h3 style="text-align: center; font-size: 18px; color: #555;">Subcarpeta: ${subcarpeta}</h3>` : ''}
      <p><strong>IP:</strong> ${logData.ip}
      <p><strong>Archivo de Log:</strong> ${logData.logFileName || 'No disponible'}</p>
      <p><strong>Hora de Inicio:</strong> ${logData.startTime || 'No disponible'}</p>
      <p><strong>Hora de Fin:</strong> ${logData.endTime || 'No disponible'}</p>
      <p><strong>Duración:</strong> ${logData.duration || 'No disponible'}</p>
      <p><strong>Estado de Backup:</strong> ${logData.backupStatus || 'No disponible'}</p>
      <p><strong>Peso total de archivo .dmp:</strong> ${logData.totalDmpSize || 'No disponible'}</p>
      <p><strong>Tamaño Total Carpeta:</strong> ${logData.totalFolderSize || 'No disponible'}</p>
      <p><strong>Exitoso:</strong> 
      <span id="success-status" class="${statusClass}" style="${statusStyle}">
        ${successStatus}
      </span>
    </p>
      <p><strong>Ruta del backup:</strong> ${logData.backupPath || "N/A"}
      <h3 style="margin-top: 20px;">${last10LinesTitle}</h3>
    <pre style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; max-height: 200px; overflow-y: auto;">
      ${last10LinesContent}
    </pre>
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
    // Añadir el tooltip para errores de ORA en caso de fallo
    if (logData.status === "Fallo" && logData.oraError) {
      const successStatusElement = modalBox.querySelector("#success-status");

      successStatusElement.addEventListener("click", (event) => {
        // Crear el tooltip
        const tooltip = document.createElement("div");
        tooltip.textContent = logData.oraError;  // Aquí se pasa el contenido de oraError al tooltip
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
        tooltip.style.maxWidth = "300px";
        tooltip.style.wordWrap = "break-word";

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
  function initGrid(gridDiv) {
    const gridOptions = {
      columnDefs: [
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

  function displayAllServersResults(results) {
    //console.log("Mostrando resultados de servidores:", results);
    if (gridApi && typeof gridApi.setRowData === "function") {
      const rowData = results.flatMap((serverResult) => {
        console.table(serverResult); // Si `results` es un array de objetos `serverResult`
        if (serverResult.error) {
          if (serverResult.error.includes("no existe")) {
            // Mostrar modal específico para la ruta inexistente
            showErrorpathModal(
              "Ruta de Backup No Existente",
              `${serverResult.ip} La ruta ${serverResult.backupPath} no existe en el servidor ${serverResult.serverName}`
            );
          } else if (serverResult.error.includes("Archivo log no válido o incompatible")) {
            showErrorModal(
              serverResult.error,
              serverResult.ip,
              serverResult.serverName // Asegúrate de que este valor esté disponible
            );
          } else {
            showErrorModal(
              `No se realizó la conexión con el servidor: ${serverResult.serverName || "Desconocido"}`,
              serverResult.ip || "IP desconocida"
            );
          }
          return []; // No añadir nada al grid
        }
        if (serverResult.warning) {
          showErrorModal(
            "Backup Incompleto",
            serverResult.warning,
            serverResult.serverName,
            serverResult.ip
          );
          return []; // No añadir nada al grid
        }
        const processLogDetail = (logDetail) => {
          // Verificar si el logDetail indica carpeta vacía
          if (logDetail.backupVoid) {
            showErrorModal(
              "Carpeta Vacía Detectada",
              `${serverResult.ip} La carpeta en la ruta ${logDetail.backupPath} está vacía. \n Servidor: ${serverResult.serverName}`,
              serverResult.serverName,
              serverResult.ip
            );
            return null; // No añadir al grid
          }

          if (!logDetail || !logDetail.logFileName) {
            showErrorModal(
              `No se encontró archivo de log para el servidor: ${serverResult.serverName || "Desconocido"
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
          // Datos específicos para WebContent
          if (serverResult.serverName === 'WebContent' || (serverResult.serverName === 'Contratacion digital' && logDetail.backupPath.trim() === '/disco3/BK_RMAN_CONTRADIGI')) {

            console.log('Procesando servidor:', serverResult.serverName, 'con ruta:', logDetail.backupPath);
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
              backupStatus: logDetail.logDetails?.estadoBackup === "Éxito" ? "Completado" : "Fallo",
              backupPath: logDetail.backupPath || "N/A",
              last10Lines: logDetail.logDetails?.errorMessage || "No hay errores",
              groupControlInfo: logDetail.logDetails?.errorMessage ? "Ver error" : "Sin errores"
            };
          }
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
            `No se encontraron rutas para el servidor: ${serverResult.serverName || "Desconocido"
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
      // Añade este log para verificar el valor en el lado del cliente
      //console.log(
      //"Tamaño de la carpeta recibido (logData.totalFolderSize):",
      //logData.totalFolderSize
      //);
      //console.log("Datos del log:", logData); // Para depuración
      // Si el valor de success es No, aplicar la clase 'error' a todo el párrafo
      // Caso específico para WebContent
      if (serverName === 'WebContent' || (serverName === 'Contratacion digital' && logData.backupPath === '/disco3/BK_RMAN_CONTRADIGI')) {
        const { fechaInicio, fechaFin, duracion, estadoBackup, rutaBackup, errorMessage } = logData.logDetails;

        entryDiv.innerHTML = `
          <p><strong>IP:</strong> ${logData.ip}</p>
          <p><strong>Servidor:</strong> ${serverName}</p>
          <p><strong>Fecha de inicio:</strong> ${fechaInicio || "N/A"}</p>
          <p><strong>Fecha de fin:</strong> ${fechaFin || "N/A"}</p>
          <p><strong>Duración:</strong> ${duracion || "N/A"}</p>
          <p><strong>Estado del backup:</strong> ${estadoBackup}</p>
          <p><strong>Ruta del backup:</strong> ${logData.backupPath || "N/A"}</p>
          <p><strong>Nombre del archivo .log:</strong> ${logData.logFileName || "N/A"}</p>
          <p><strong>Mensaje de error:</strong> ${errorMessage || "Sin errores detectados"}</p>
      `;
      } else {
        const successClass = logData.logDetails?.success ? "" : "error-box";
        console.log("Contenido de dumpFileInfo:", logData.dumpFileInfo); // Verifica qué archivos se están pasando
        // Subcarpetas que queremos verificar en la ruta de backup
        const subcarpetas = ["ESQ_USRREPBI", "BK_ANTES2", "APP_ESQUEMAS", "BK_MD_ANTES", "BK_JAQL546_FPAE71", "BK_ANTES", "RENIEC"];
        let subcarpeta = '';

        // Verificar si el servidor es Bantotal y si la ruta de backup contiene alguna subcarpeta de las definidas
        if (logData.serverName === "Bantotal" && logData.backupPath) {
          // Verificar si alguna subcarpeta está en la ruta de backup
          subcarpeta = subcarpetas.find(sub => logData.backupPath.includes(sub)) || '';
        }

        // Si se encuentra una subcarpeta, la mostramos debajo del título
        let subcarpetaContent = '';
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
          entryDiv.dataset.oraError = JSON.stringify(logData.logDetails.oraError);
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
          tooltipError.textContent = "No se encontraron detalles específicos del error.";
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
  function convertDurationToMinutes(duration) {
    const match = duration.match(/^(\d+):(\d+):(\d+)$/); // HH:mm:ss
    if (!match) return 0; // Retornar 0 si el formato es inválido
    const [_, hours, minutes, seconds] = match.map(Number);
    return hours * 60 + minutes + seconds / 60; // Convertir todo a minutos
  }
  
  async function showStatistics() {
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

          const sortedData = serverData.data.map((d) => ({
            ...d,
            duracion: convertDurationToMinutes(d.duracion), // Convertir duración a minutos
          })).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

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
                  yAxisID: 'y1'
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
                  yAxisID: 'y2'
                }
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
                  type: 'linear',
                  display: true,
                  position: 'right',
                  title: {
                    display: true,
                    text: 'Duración (min)',
                  },
                  grid: {
                    drawOnChartArea: false,
                  }
              },}
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
      showCustomAlert(
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
        showCustomAlert("Error al agregar la ruta. Por favor, intenta de nuevo.");
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
        showCustomAlert("Error al actualizar la ruta. Por favor, intenta de nuevo.");
      }
    } catch (error) {
      console.error("Error al actualizar la ruta:", error);
      showCustomAlert("Error al actualizar la ruta.");
    }
  });

  const deleteRouteBtn = document.getElementById("delete-route-btn");

  // Manejar el clic en el botón de eliminar ruta
  deleteRouteBtn.addEventListener("click", async () => {
    const selectedOption = backupRoutesSelect.options[backupRoutesSelect.selectedIndex];
    const selectedIP = document.getElementById("ip").value;

    if (selectedOption) {
      // Mostrar alerta de confirmación
      const confirmDelete = await showConfirmDeleteModal(`¿Estás seguro de que deseas eliminar la ruta "${selectedOption.value}"?`);
      if (confirmDelete) {
        try {
          // Llamada al backend para eliminar la ruta
          const response = await window.electron.deleteBackupRoute(selectedIP, selectedOption.value);
          if (response.success) {
            // Eliminar la opción de la lista si la eliminación fue exitosa
            selectedOption.remove();
            showCustomAlert("Ruta eliminada correctamente");
          } else {
            showCustomAlert("Error al eliminar la ruta. Por favor, intenta de nuevo.");
          }
        } catch (error) {
          console.error("Error al eliminar la ruta:", error);
          showCustomAlert("Error al eliminar la ruta.");
        }
      }
    } else {
      showCustomAlert("Por favor, selecciona una ruta de backup para eliminar.");
      setTimeout(() => {
        const firstInput = document.querySelector('input'); // Selecciona el primer campo input
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
    const selectedServer = servers.find(server => server.ip === selectedIp);

    if (selectedServer && selectedServer.id) {
      const serverDetails = await window.electron.getServerDetails(selectedServer.id);
      console.log("Detalles del servidor obtenidos:", serverDetails);

      if (serverDetails) {
        // Rellenar los campos del formulario con los detalles del servidor
        document.getElementById("username").value = serverDetails.username || '';
        document.getElementById("password").value = serverDetails.password || '';
      } else {
        console.warn("No se encontraron detalles para el servidor seleccionado.");
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
    "RENIEC"
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
          console.error("Los servidores no se obtuvieron como un array:", servers);
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
        // Verificar si logDetailsArray está vacío y mostrar un modal si es necesario
        if (!logDetailsArray || (Array.isArray(logDetailsArray) && logDetailsArray.length === 0)) {
          const warningMessage = `Archivo log no válido o incompatible para la ruta: ${directoryPath}, en el servidor: ${serverName}`;
          showErrorModal(warningMessage, ip);
          return; // Salimos si no hay datos válidos
        }
        // Verifica si hay elementos en logDetailsArray
        // Antes del bucle que procesa los detalles del log
        let hasShownBackupIncompleteError = false;
        // Procesar los detalles del log
        if (Array.isArray(logDetailsArray)) {
          for (const logData of logDetailsArray) {
            const serverName = logData.serverName;
            if (serverName === 'WebContent' || (serverName === 'Contratacion digital' && logData.backupPath === '/disco3/BK_RMAN_CONTRADIGI')) {
              // Para WebContent, solo agregamos la entrada del log
              addLogEntry({ ...logData, ip });
            } else {
              //console.log("Adding log entry:", logData);
              if (serverName === "Bantotal" && logData.backupIncomplete && !hasShownBackupIncompleteError) {
                // Encuentra las subcarpetas existentes en `directories`
                const existingSubfolders = directoryPath.split('/').pop(); // Obtener solo el nombre de la carpeta, puedes adaptarlo a cómo se obtienen tus subcarpetas.

                // Filtrar las subcarpetas requeridas que no están presentes
                const missingSubfolders = requiredSubfolders.filter(required =>
                  !existingSubfolders.includes(required) // Comparación exacta
                );

                // Mensaje para el modal
                let warningMessage = `Backup Incompleto: Se esperaban 7 carpetas, pero se encontraron ${logData.foundFolders}.`;
                if (missingSubfolders.length > 0) {
                  warningMessage += ` Faltan las siguientes carpetas: ${missingSubfolders.join(", ")}.`;
                }
                console.log("Mostrando modal de error por backup incompleto");
                showErrorModal(
                  warningMessage,
                  ip
                );
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
              const formattedTotalFolderSize = convertToGB(logData.totalFolderSize);
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
          if (serverName === 'WebContent' || (serverName === 'Contratacion digital' && logData.backupPath === '/disco3/BK_RMAN_CONTRADIGI')) {
            // Para WebContent, solo agregamos la entrada del log
            addLogEntry({ ...logDetailsArray, ip });
          } else {
            if (serverName === "Bantotal" && logDetailsArray.backupIncomplete && !hasShownBackupIncompleteError) {
              const existingSubfolders = directoryPath.split('/').pop(); // Obtener solo el nombre de la carpeta

              const missingSubfolders = requiredSubfolders.filter(required =>
                !existingSubfolders.includes(required) // Comparación exacta
              );

              let warningMessage = `Backup Incompleto: Se esperaban 7 carpetas, pero se encontraron ${logDetailsArray.foundFolders}.`;
              if (missingSubfolders.length > 0) {
                warningMessage += ` Faltan las siguientes carpetas: ${missingSubfolders.join(", ")}.`;
              }
              console.log("Mostrando modal de error por backup incompleto");
              showErrorModal(
                warningMessage,
                ip
              );
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
