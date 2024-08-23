document.addEventListener("DOMContentLoaded", () => {
  const osSelect = document.getElementById("os");
  const ipSelect = document.getElementById("ip");
  const resultDiv = document.getElementById("result");
  const serverIpSpan = document.getElementById("server-ip");
  const logDateSpan = document.getElementById("log-date");
  const durationSpan = document.getElementById("duration");
  const successSpan = document.getElementById("success");
  const dumpPathSpan = document.getElementById("dump-path");
  const dumpSizeSpan = document.getElementById("dump-size");
  const logFileNameSpan = document.getElementById("log-file-name"); // Añadido

  const ipAddresses = {
    windows: ["10.0.212.172", "10.0.98.22"],
    linux: ["10.0.212.4"],
    solaris: ["10.0.212.211"],
  };
  function showAuthErrorModal(errorMessage) {
    const modal = document.getElementById("authErrorModal");
    const message = document.getElementById("errorMessage");
    message.textContent =
      errorMessage || "Error de autenticación. Por favor, inténtelo de nuevo.";
    modal.style.display = "block";

    document.getElementById("retryButton").onclick = function () {
      modal.style.display = "none";
      // Aquí puedes resetear el formulario de autenticación para intentar nuevamente
    };

    document.getElementById("closeModal").onclick = function () {
      modal.style.display = "none";
    };

    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  }

  function clearResultView() {
    resultDiv.style.display = "none";
    logDateSpan.textContent = "";
    durationSpan.textContent = "";
    successSpan.textContent = "";
    dumpPathSpan.textContent = "";
    dumpSizeSpan.textContent = "";
    serverIpSpan.textContent = "";
    logFileNameSpan.textContent = ""; // Limpiar nombre del archivo
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
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const os = osSelect.value;
    const ip = ipSelect.value;
    const port = form.port.value;
    const username = form.username.value;
    const password = form.password.value;

    window.localStorage.setItem(
      "connectionData",
      JSON.stringify({ os, ip, port, username, password })
    );

    clearResultView(); // Limpiar la vista antes de intentar la conexión
    serverIpSpan.textContent = ip; // Mostrar la IP seleccionada

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
            directoryPath = "/temporal1T/BK_SWITCH/BK_CAJERO_2024_08_16_0425/";
            break;
          case "windows":
            directoryPath = "F:\\bk_info7021_USRGCN\\2022_07_13";
            break;
          case "solaris":
            directoryPath = "/temporal2T/BK_BANTPROD_DIARIO/DTPUMP/";
            break;
          default:
            resultDiv.innerHTML = "<br>Unsupported Operating System.";
            resultDiv.style.display = "block";
            return;
        }

        try {
          console.log("Fetching log details...");
          const { logDetails, dumpFileInfo, logFileName } =
            await window.electron.getLogDetails(
              directoryPath,
              ip,
              port,
              username,
              password,
              os
            );

          if (logDetails) {
            logDateSpan.textContent = logDetails.dateTime || "N/A";
            durationSpan.textContent = logDetails.duration || "N/A";
            successSpan.textContent = logDetails.success ? "Yes" : "No";
          } else {
            logDateSpan.textContent = "N/A";
            durationSpan.textContent = "N/A";
            successSpan.textContent = "N/A";
          }
          dumpPathSpan.textContent = dumpFileInfo?.filePath || "N/A";
          dumpSizeSpan.textContent = dumpFileInfo
            ? `${dumpFileInfo.fileSize} MB`
            : "N/A";
          logFileNameSpan.textContent = logFileName || "N/A"; // Mostrar nombre del archivo

          console.log("Saving log details to database...");
          await window.electron.saveLogToDatabase(
            logDetails,
            dumpFileInfo,
            os,
            logFileName
          );

          // Forzar actualización de la vista después de obtener los resultados
          resultDiv.style.display = "block";
        } catch (error) {
          resultDiv.innerHTML = `<br>Error obtaining log details: ${error.message}`;
          resultDiv.style.display = "block";
        }
      } else {
        console.log("Connection failed");
        showAuthErrorModal(`Could not connect to ${ip}:${port}.`);
      }
    } catch (error) {
      console.log("Connection error", error);
      console.log("Connection error", error);
      showAuthErrorModal("Usuario o contraseña incorrectos.");
    }
  });
});
