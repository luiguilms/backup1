//main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { Client } = require("ssh2");
const oracledb = require("oracledb");
const crypto = require("crypto");
const ExcelJS = require("exceljs");

ipcMain.handle("export-to-excel", async (event, data) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Backup Report");
  worksheet.columns = data.columns.map((col) => ({
    header: col,
    key: col,
    width: 15,
  }));
  worksheet.addRows(data.rows);
  worksheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
});
// Función para normalizar rutas según el sistema operativo
function normalizePath(inputPath, targetOS) {
  let normalizedPath = inputPath.replace(/\\/g, "/");
  if (targetOS === "windows") {
    normalizedPath = normalizedPath.replace(/\//g, "\\");
  }
  return normalizedPath;
}
// Función para unir directorio y nombre de archivo
function joinPath(directoryPath, filename, targetOS) {
  const normalizedDirectoryPath = normalizePath(directoryPath, targetOS);
  const joinedPath = path.join(normalizedDirectoryPath, filename);
  const normalizedPath = normalizePath(joinedPath, targetOS);
  //console.log(`Original Directory Path: ${directoryPath}`);
  //console.log(`Filename: ${filename}`);
  //console.log(`Joined Path: ${joinedPath}`);
  //console.log(`Normalized Path: ${normalizedPath}`);
  return normalizedPath;
}
// Configuración de conexión a la base de datos
const dbConfig = {
  user: "USRMONBAK",
  password: "U$po_resp4ld",
  connectString: "INFO7499.cmac-arequipa.com.pe:1523/monbakpdb",
};
// Crea una ventana de aplicación
function createWindow() {
  const mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

  mainWindow.setIcon(`${__dirname}/respaldo.png`);
  mainWindow.maximize(); // Maximiza la ventana
  mainWindow.loadFile("index.html");
  // Verificar si la aplicación fue lanzada con el argumento --scheduled
  const isScheduled = process.argv.includes('--scheduled');  // Si el argumento --scheduled está presente
  console.log("La aplicación fue lanzada con el argumento --scheduled?", isScheduled);

  if (isScheduled) {
    mainWindow.webContents.once('did-finish-load', () => {
      console.log("Iniciando proceso automático...");
      setTimeout(() => {
        mainWindow.webContents.send('start-processing');
        console.log("Señal de inicio enviada");
      }, 3000);
    });
  }
}
app.whenReady().then(() => {
  createWindow();
  ipcMain.handle(
    "connect-to-server",
    async (event, { ip, port, username, password }) => {
      console.log(
        `Attempting to connect to ${ip}:${port} with username ${username}`
      );
      try {
        await checkConnection(ip, port, username, password); // Esperar el resultado de la conexión
        return { success: true, message: "Connected successfully." };
      } catch (error) {
        console.error("Connection error:", error);
        return { success: false, message: error.message }; // Devolver el error si la conexión falla
      }
    }
  );
  function executeSSHCommand(conn, command) {
    return new Promise((resolve, reject) => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        let output = "";
        stream
          .on("data", (data) => {
            output += data.toString();
          })
          .on("close", (code, signal) => {
            resolve(output); // Resolvemos la promesa con el resultado del comando
          })
          .on("error", (err) => {
            reject(err);
          });
      });
    });
  }
  ipcMain.handle(
    "get-log-details",
    async (
      event,
      { directoryPath, ip, port, username, password, targetOS }
    ) => {
      return await getLogDetailsLogic(
        directoryPath,
        ip,
        port,
        username,
        password,
        targetOS
      );
    }
  );
  function isFirstDayOfMonth() {
    const today = new Date();
    return today.getDate() === 1; // Verifica si es el primer día del mes
  }
  // Función que encapsula la lógica de get-log-details
  async function getLogDetailsLogic(
    directoryPath,
    ip,
    port,
    username,
    password,
    targetOS
  ) {
    let allLogDetails = [];
    const isMensualRoute = directoryPath.includes("MENSUAL");
    const firstDay = isFirstDayOfMonth();
    // Obtener el nombre del servidor
    const servers = await getServers(); // Usa la función que ya tienes
    const server = servers.find((s) => s.ip === ip);
    const serverName = server ? server.name : "N/A";
    if (serverName === "EBS" || serverName === "BI") {
      if (firstDay && !isMensualRoute) {
        console.log(
          `Ruta normal excluida el primer día del mes: ${directoryPath} (Servidor: ${serverName})`
        );
        return null; // Excluir rutas normales el primer día del mes
      }
      if (!firstDay && isMensualRoute) {
        console.log(
          `Ruta mensual excluida fuera del primer día del mes: ${directoryPath} (Servidor: ${serverName})`
        );
        return null; // Excluir rutas mensuales fuera del primer día
      }
    }
    console.log(`Procesando ruta: ${directoryPath} (Servidor: ${serverName})`);
    try {
      //console.log(`Fetching log details from directory: ${directoryPath}`);
      // Initialize SSH connection
      const conn = await createSSHClient(ip, port, username, password);
      // Initialize SFTP connection
      const sftp = await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) {
            console.error("SFTP error:", err);
            conn.end();
            return reject(new Error(`SFTP error: ${err.message}`));
          }
          resolve(sftp);
        });
      });
      const directoryExists = await new Promise((resolve) => {
        sftp.stat(directoryPath, (err) => {
          resolve(!err); // Devuelve `false` si hay un error (no existe), `true` si existe
        });
      });

      if (!directoryExists) {
        conn.end();
        return {
          error: `La ruta de backup "${directoryPath}" no existe en el servidor "${serverName}".`,
          ip,
          serverName,
          backupPath: directoryPath
        };
      }
      // Si es `WebContent`, aplicar lógica específica de RMAN
      if (serverName === 'WebContent' || (serverName === 'Contratacion digital' && directoryPath === '/disco3/BK_RMAN_CONTRADIGI')) {
        // Obtiene archivos de log en el directorio para WebContent
        const files = await new Promise((resolve, reject) => {
          sftp.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Readdir error:", err);
              sftp.end();
              conn.end();
              return reject(new Error(`Failed to read directory: ${err.message}`));
            }
            resolve(files);
          });
        });

        // Filtra los archivos de log para obtener solo el archivo de RMAN
        const rmanLogFiles = files.filter(file => file.filename.includes("bk_rman_full") && file.filename.endsWith(".log"));

        // Procesar cada archivo de log de RMAN
        for (const logFile of rmanLogFiles) {
          const logFilePath = joinPath(directoryPath, logFile.filename, targetOS);
          const logData = await new Promise((resolve, reject) => {
            sftp.readFile(logFilePath, "utf8", (err, data) => {
              if (err) {
                console.error("ReadFile error:", err);
                sftp.end();
                conn.end();
                return reject(new Error(`Failed to read log file: ${err.message}`));
              }
              resolve(data);
            });
          });

          // Extrae los detalles específicos del log de RMAN
          const rmanLogDetails = extractRmanLogDetails(logData);

          // Guarda los detalles en la base de datos
          await saveRmanLogToDatabase({
            ...rmanLogDetails,
            rutaBackup: directoryPath,
            logFileName: logFile.filename  // Aquí pasamos directoryPath como rutaBackup
          }, serverName, ip);

          // Agrega los detalles a la lista de todos los logs
          allLogDetails.push({
            logDetails: rmanLogDetails,
            logFileName: logFile.filename,
            backupPath: directoryPath,
            ip,
            os: targetOS,
            serverName: serverName,
          });
        }
        sftp.end();
        conn.end();
        return allLogDetails; // Retorna los detalles específicos de RMAN para `WebContent`
      }
      // Llamada a getFolderSize para Solaris, Linux, y Windows
      let folderSizes = await getFolderSize(
        conn,
        directoryPath,
        targetOS,
        sftp
      );
      //console.log("Tamaños de las subcarpetas:", folderSizes);
      if (targetOS === "solaris" || targetOS === "linux") {
        // Asegurarse de que folderSizes sea un arreglo solo para Solaris
        let folderSizeInfo;

        if (Array.isArray(folderSizes)) {
          // Si es un arreglo, busca el tamaño correspondiente a cada subcarpeta
          folderSizeInfo = folderSizes.find((folder) =>
            folder.folderPath.includes(file.filename)
          );
        } else if (typeof folderSizes === "number") {
          // Si es un número, simplemente asigna el tamaño directamente
          console.warn(
            "folderSizes es un número, asignando directamente:",
            folderSizes
          );
          folderSizeInfo = { sizeInMB: folderSizes }; // Tratar como un objeto con el tamaño
        } else {
          console.error(
            "folderSizes tiene un formato inesperado:",
            folderSizes
          );
          folderSizeInfo = { sizeInMB: "N/A" }; // Manejo de error si el tipo es inesperado
        }

        const files = await new Promise((resolve, reject) => {
          sftp.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Readdir error:", err);
              sftp.end();
              conn.end();
              return reject(new Error(`Failed to read directory: ${err.message}`));
            }
            resolve(files);
          });
        });
        // Filtrar los subdirectorios
        const directories = files.filter(
          (file) => file.attrs && (file.attrs.mode & 0o40000) === 0o40000
        );
        // Mostrar los subdirectorios en la consola
        console.log("Subdirectorios encontrados:", directories.map(dir => dir.filename));

        const isBackupComplete = directories.length >= 7; // Considerado completo si hay 7 o más carpetas
        if (targetOS === "solaris") {
          // Solo para Solaris, verificar el backup incompleto
          const isBackupComplete = directories.length >= 7; // Considerado completo si hay 7 o más carpetas
          if (!isBackupComplete) {
            // Solo activar si hay menos de 7 carpetas
            allLogDetails.backupIncomplete = true;
            allLogDetails.expectedFolders = 7;
            allLogDetails.foundFolders = directories.length;
          }

        }
        const isBackupVoid = directories.length === 0;
        if (isBackupVoid) {
          // Agregamos una propiedad para indicar backup incompleto
          conn.end();
          return {
            backupVoid: true,
            backupPath: directoryPath,
            ip,
            serverName
          };
        }
        for (const file of files) {
          if (file.attrs.isDirectory()) {
            const subDirPath = joinPath(directoryPath, file.filename, targetOS);
            console.log(`Processing subdirectory: ${subDirPath}`);
            try {
              const subDirFiles = await new Promise((resolve, reject) => {
                sftp.readdir(subDirPath, (err, files) => {
                  if (err) {
                    console.error("Readdir error:", err);
                    sftp.end();
                    conn.end();
                    return reject(
                      new Error(`Failed to read subdirectory: ${err.message}`)
                    );
                  }
                  resolve(files);
                });
              });
              // Verifica si el subdirectorio está vacío
              const isSubDirEmpty = subDirFiles.length === 0;

              // Si el subdirectorio está vacío, añade una entrada a `allLogDetails` con `backupVoid: true`
              if (isSubDirEmpty) {
                allLogDetails.push({
                  logDetails: null,
                  dumpFileInfo: [],
                  logFileName: null,
                  ip,
                  backupPath: subDirPath,
                  os: targetOS,
                  totalDmpSize: 0,
                  totalFolderSize: "0 MB",
                  serverName: serverName,
                  last10Lines: [],
                  hasWarning: false,
                  warningNumber: null,
                  lastLine: null,
                  backupIncomplete: !isBackupComplete,
                  expectedFolders: 7,
                  foundFolders: directories.length,
                  backupVoid: true, // Indica que este subdirectorio está vacío
                });
                continue; // Salta al siguiente subdirectorio
              }
              const folderSize = await getFolderSize(
                conn,
                subDirPath,
                targetOS,
                sftp
              );
              const totalFolderSize = `${folderSize} MB`;
              //console.log(
              //   "Tamaño total de la carpeta (totalFolderSize):",
              //  totalFolderSize
              //    );
              const logFiles = subDirFiles.filter(
                (file) => path.extname(file.filename) === ".log"
              );
              let dumpFileInfo = []; // Reinicia para cada subdirectorio
              let totalDmpSize = 0; // Reinicia para cada subdirectorio
              let logDetails = null;
              let logFileName = null;
              let logInfo = null; // Reemplaza last10Lines y has95Warning
              let logLines = null;
              let lastLine = null; // Añadimos la última línea aquí
              for (let i = 0; i < logFiles.length; i += 10) {
                await Promise.all(
                  logFiles.slice(i, i + 10).map(async (logFile) => {
                    logFileName = logFile.filename;
                    const logFilePath = joinPath(
                      subDirPath,
                      logFileName,
                      targetOS
                    );
                    await new Promise((resolve, reject) => {
                      sftp.stat(logFilePath, (err, stats) => {
                        if (err) {
                          console.error("Stat error:", err);
                          sftp.end();
                          conn.end();
                          return reject(
                            new Error(`Failed to stat log file: ${err.message}`)
                          );
                        }
                        resolve(stats);
                      });
                    });
                    const logData = await new Promise((resolve, reject) => {
                      sftp.readFile(logFilePath, "utf8", (err, data) => {
                        if (err) {
                          console.error("ReadFile error:", err);
                          sftp.end();
                          conn.end();
                          return reject(
                            new Error(`Failed to read log file: ${err.message}`)
                          );
                        }
                        resolve(data);
                      });
                    });

                    logLines = logData.trim().split("\n");
                    lastLine = logLines[logLines.length - 1].trim();
                    logInfo = getLast10LogLines(logData, globalThreshold);
                    logDetails = parseLogLine(logData);

                    if (logInfo.hasWarning) {
                      const warningMessage = `Se detectó una advertencia de espacio al ${logInfo.warningNumber
                        }% en el servidor ${serverName} (IP: ${ip}).\n\n${logInfo.relevantLines.join(
                          "\n"
                        )}`;
                      await sendEmailAlert(ip, serverName, subDirPath, warningMessage);
                    }
                    logDetails = parseLogLine(logData);
                    const validExtensions = [".dmp", ".DMP", ".dmp.gz", ".gz", ".err"];
                    const dumpFiles = subDirFiles.filter((file) => {
                      const filename = file.filename.toLowerCase();
                      // Verificar si el nombre del archivo termina con alguna de las extensiones válidas
                      const isValidFile = validExtensions.some(ext => filename.endsWith(ext));
                      if (!isValidFile) {
                        console.warn(`Archivo no válido encontrado: ${file.filename}`);
                        return false; // Excluye archivos que no son válidos
                      }
                      return true; // Incluye archivos válidos
                    });

                    for (let i = 0; i < dumpFiles.length; i += 10) {
                      await Promise.all(
                        dumpFiles.slice(i, i + 10).map(async (dumpFile) => {
                          const dumpFilePath = joinPath(
                            subDirPath,
                            dumpFile.filename,
                            targetOS
                          );
                          const dumpStats = await new Promise(
                            (resolve, reject) => {
                              sftp.stat(dumpFilePath, (err, stats) => {
                                if (err) {
                                  console.error("Stat error:", err);
                                  sftp.end();
                                  conn.end();
                                  return reject(
                                    new Error(
                                      `Failed to stat dump file: ${err.message}`
                                    )
                                  );
                                }
                                resolve(stats);
                              });
                            }
                          );
                          // Agrega esta línea para imprimir el tamaño de cada archivo .dmp
                          //console.log(
                          //  `Carpeta: ${subDirPath}, Tamaño del archivo ${dumpFile.filename
                          //   }: ${(dumpStats.size / (1024 * 1024)).toFixed(2)} MB`
                          // );

                          const dumpFileSizeInMB = dumpStats.size / (1024 * 1024);
                          totalDmpSize += dumpFileSizeInMB;
                          dumpFileInfo.push({
                            filePath: dumpFilePath,
                            fileSize:
                              dumpFileSizeInMB > 0
                                ? parseFloat(dumpFileSizeInMB.toFixed(2))
                                : 0,
                          });
                        })
                      );
                    }
                    allLogDetails.push({
                      logDetails,
                      dumpFileInfo,
                      logFileName,
                      ip,
                      backupPath: subDirPath,
                      os: targetOS,
                      totalDmpSize:
                        totalDmpSize > 0 ? totalDmpSize.toFixed(2) : 0,
                      totalFolderSize,
                      serverName: serverName,
                      last10Lines: logInfo ? logInfo.relevantLines : [],
                      hasWarning: logInfo ? logInfo.hasWarning : false,
                      warningNumber: logInfo ? logInfo.warningNumber : null,
                      lastLine: lastLine, // Añadimos la última línea aquí
                      backupIncomplete: targetOS === "solaris" && !isBackupComplete, // Solo para Solaris
                      expectedFolders: targetOS === "solaris" ? 7 : null, // Solo para Solaris
                      foundFolders: targetOS === "solaris" ? directories.length : null, // Solo para Solaris
                      backupVoid: false,
                    });
                  })
                );
              }
            } catch (error) {
              console.warn(`Error procesando subdirectorio ${subDirPath}:`, error);
              continue;
            }
          }
        }
        console.log("Detalles completos de log (incluyendo vacíos):", allLogDetails);
        console.log("lastLine en getLogDetailsLogic antes de retornar:", allLogDetails.map(detail => detail.lastLine));
        return allLogDetails;
      } else {
        if (typeof folderSizes !== "number") {
          throw new Error("folderSizes debe ser un número para /Windows.");
        }
        // Logic for other OS (Windows, )
        const files = await new Promise((resolve, reject) => {
          sftp.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Readdir error:", err);
              sftp.end();
              conn.end();
              return reject(
                new Error(`Failed to read directory: ${err.message}`)
              );
            }
            resolve(files);
          });
        });
        // Check if there are subdirectories
        const subdirectories = files.filter((file) => file.attrs.isDirectory());
        // Si no hay subdirectorios, marcar el backup como vacío
        const isBackupVoid = subdirectories.length === 0;

        if (isBackupVoid) {
          console.log(`La carpeta principal ${directoryPath} está vacía.`);
          sftp.end();
          conn.end();
          return {
            backupVoid: true,
            backupPath: directoryPath,
            ip,
            serverName,
          };
        }
        if (subdirectories.length > 0) {
          // Process each subdirectory
          let allSubdirResults = [];
          for (const subdir of subdirectories) {
            const subDirPath = joinPath(
              directoryPath,
              subdir.filename,
              targetOS
            );
            // Read subdirectory contents
            const subDirFiles = await new Promise((resolve, reject) => {
              sftp.readdir(subDirPath, (err, files) => {
                if (err) {
                  console.error("Readdir error:", err);
                  return reject(
                    new Error(`Failed to read subdirectory: ${err.message}`)
                  );
                }
                resolve(files);
              });
            });
            // Process log files in subdirectory
            const logFiles = subDirFiles.filter(
              (file) => path.extname(file.filename) === ".log"
            );
            if (logFiles.length > 0) {
              const latestLogFile = logFiles.reduce((latest, file) =>
                file.attrs.mtime > latest.attrs.mtime ? file : latest
              );
              let logFileName = latestLogFile.filename;
              const logFilePath = joinPath(subDirPath, logFileName, targetOS);
              //console.log("Attempting to read log file:", logFilePath);
              await new Promise((resolve, reject) => {
                sftp.stat(logFilePath, (err, stats) => {
                  if (err) {
                    console.error("Stat error:", err);
                    sftp.end();
                    conn.end();
                    return reject(
                      new Error(`Failed to stat log file: ${err.message}`)
                    );
                  }
                  resolve(stats);
                });
              });
              const logData = await new Promise((resolve, reject) => {
                sftp.readFile(logFilePath, "utf8", (err, data) => {
                  if (err) {
                    console.error("ReadFile error:", err);
                    sftp.end();
                    conn.end();
                    return reject(
                      new Error(`Failed to read log file: ${err.message}`)
                    );
                  }
                  resolve(data);
                });
              });
              const logLines = logData.trim().split("\n");
              const lastLine = logLines[logLines.length - 1].trim();
              const logInfo = getLast10LogLines(logData, globalThreshold);

              if (logInfo.hasWarning) {
                const warningMessage = `Se detectó una advertencia de espacio al ${logInfo.warningNumber
                  }% en el servidor ${serverName} (IP: ${ip}).\n\n${logInfo.relevantLines.join(
                    "\n"
                  )}`;
                await sendEmailAlert(ip, serverName, subDirPath, warningMessage);
              }
              const logDetails = parseLogLine(logData, "Pago Institucional");
              const validExtensions = [".dmp", ".DMP", ".dmp.gz", ".gz", ".err"];
              let dumpFileInfo = [];
              const dumpFiles = subDirFiles.filter((file) => {
                const filename = file.filename.toLowerCase();
                // Verificar si el nombre del archivo termina con alguna de las extensiones válidas
                const isValidFile = validExtensions.some(ext => filename.endsWith(ext));
                if (!isValidFile) {
                  console.warn(`Archivo no válido encontrado: ${file.filename}`);
                  return false; // Excluye archivos que no son válidos
                }
                return true; // Incluye archivos válidos
              });

              let totalDmpSize = 0;
              //console.log("Archivos DMP encontrados:", dumpFiles); // Verificación de archivos DMP

              for (const dumpFile of dumpFiles) {
                const dumpFilePath = joinPath(
                  subDirPath,
                  dumpFile.filename,
                  targetOS
                );

                try {
                  // Usar la promesa de sftp.stat para obtener las estadísticas del archivo
                  const dumpStats = await new Promise((resolve, reject) => {
                    sftp.stat(dumpFilePath, (err, stats) => {
                      if (err) {
                        console.error(`Error al obtener estadísticas del archivo: ${dumpFile.filename}`, err);
                        reject(err); // Si hay error, rechaza la promesa
                      } else {
                        resolve(stats); // Si no hay error, resuelve la promesa
                      }
                    });
                  });

                  // Verificar si dumpStats está definido antes de acceder a 'size'
                  if (dumpStats && dumpStats.size) {
                    const dumpFileSizeInMB = dumpStats.size / (1024 * 1024); // Convertir tamaño a MB
                    totalDmpSize += dumpFileSizeInMB; // Acumular el tamaño total
                    dumpFileInfo.push({
                      filePath: dumpFilePath,
                      fileSize: dumpFileSizeInMB > 0 ? parseFloat(dumpFileSizeInMB.toFixed(2)) : 0,
                    });
                  } else {
                    console.warn(`El archivo ${dumpFile.filename} no tiene tamaño o no es accesible.`);
                  }
                } catch (err) {
                  console.error(`Error al obtener las estadísticas del archivo: ${dumpFile.filename}`, err);
                }
              }

              console.log("Tamaño total de DMP acumulado:", totalDmpSize);
              allSubdirResults.push({
                logDetails,
                dumpFileInfo,
                logFileName,
                ip,
                backupPath: subDirPath,
                os: targetOS,
                totalDmpSize: totalDmpSize > 0 ? totalDmpSize.toFixed(2) : 0,
                totalFolderSize: `${folderSizes} MB`,
                serverName: serverName,
                last10Lines: logInfo.relevantLines,
                hasWarning: logInfo.hasWarning,
                warningNumber: logInfo.warningNumber,
                lastLine: lastLine, // Añadimos la última línea aquí
                backupVoid: false
              });
            }
          }
          return allSubdirResults;
        } else {
          // No subdirectories, process the main directory
          const logFiles = files.filter(
            (file) => path.extname(file.filename) === ".log"
          );
          if (logFiles.length > 0) {
            const latestLogFile = logFiles.reduce((latest, file) =>
              file.attrs.mtime > latest.attrs.mtime ? file : latest
            );
            let logFileName = latestLogFile.filename;
            const logFilePath = joinPath(directoryPath, logFileName, targetOS);
            console.log("Attempting to read log file:", logFilePath);
            await new Promise((resolve, reject) => {
              sftp.stat(logFilePath, (err, stats) => {
                if (err) {
                  console.error("Stat error:", err);
                  sftp.end();
                  conn.end();
                  return reject(
                    new Error(`Failed to stat log file: ${err.message}`)
                  );
                }
                resolve(stats);
              });
            });
            const logData = await new Promise((resolve, reject) => {
              sftp.readFile(logFilePath, "utf8", (err, data) => {
                if (err) {
                  console.error("ReadFile error:", err);
                  sftp.end();
                  conn.end();
                  return reject(
                    new Error(`Failed to read log file: ${err.message}`)
                  );
                }
                resolve(data);
              });
            });
            const logLines = logData.trim().split("\n");
            const lastLine = logLines[logLines.length - 1].trim();
            const logInfo = getLast10LogLines(logData, globalThreshold);

            if (logInfo.hasWarning) {
              const warningMessage = `Se detectó una advertencia de espacio al ${logInfo.warningNumber
                }% en el servidor ${serverName} (IP: ${ip}).\n\n${logInfo.relevantLines.join(
                  "\n"
                )}`;
              await sendEmailAlert(ip, serverName, subDirPath, warningMessage);
            }
            const logDetails = parseLogLine(logData, "Pago Institucional");
            const validExtensions = [".dmp", ".dmp.gz", ".gz", ".err"];
            let dumpFileInfo = [];
            const dumpFiles = subDirFiles.filter((file) => {
              const filename = file.filename.toLowerCase();
              // Verificar si el nombre del archivo termina con alguna de las extensiones válidas
              const isValidFile = validExtensions.some(ext => filename.endsWith(ext));
              if (!isValidFile) {
                console.warn(`Archivo no válido encontrado: ${file.filename}`);
                return false; // Excluye archivos que no son válidos
              }
              return true; // Incluye archivos válidos
            });

            let totalDmpSize = 0;
            //console.log("Archivos DMP encontrados:", dumpFiles); // Verificación de archivos DMP

            for (const dumpFile of dumpFiles) {
              const dumpFilePath = joinPath(
                subDirPath,
                dumpFile.filename,
                targetOS
              );

              try {
                const dumpStats = await sftp.stat(dumpFilePath);
                const dumpFileSizeInMB = dumpStats.size / (1024 * 1024);
                dumpFileInfo.push({
                  filePath: dumpFilePath,
                  fileSize: dumpFileSizeInMB > 0 ? parseFloat(dumpFileSizeInMB.toFixed(2)) : 0,
                });
              } catch (err) {
                console.error(`Error al obtener estadísticas del archivo: ${dumpFile.filename}`, err);
              }
            }

            console.log("Tamaño total de DMP acumulado:", totalDmpSize);
            return [
              {
                logDetails,
                dumpFileInfo,
                logFileName,
                ip,
                backupPath: directoryPath,
                os: targetOS,
                totalDmpSize: totalDmpSize > 0 ? totalDmpSize.toFixed(2) : 0,
                totalFolderSize: `${folderSizes} MB`,
                serverName: serverName,
                last10Lines: logInfo.relevantLines,
                hasWarning: logInfo.hasWarning,
                warningNumber: logInfo.warningNumber,
                lastLine: lastLine, // Añadimos la última línea aquí
              },
            ];
          }
        }
        sftp.end();
        conn.end();
      }
    } catch (error) {
      console.error("Error fetching log details:", error);
      return { logDetails: null, dumpFileInfo: null };
    }
  }
  // Clave de encriptación (debe ser segura y almacenada en un lugar seguro)
  const encryptionKey = Buffer.from(
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "hex"
  );
  const iv = Buffer.from("abcdef0123456789abcdef0123456789", "hex");
  // Función para encriptar
  function encrypt(text) {
    let cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(encryptionKey),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString("hex"), encryptedData: encrypted.toString("hex") };
  }
  // Conexión a la base de datos y función para insertar servidor
  async function insertServerInfo(
    ip,
    osType,
    port,
    encryptedUser,
    encryptedPassword,
    serverName
  ) {
    let connection;
    try {
      connection = await oracledb.getConnection({
        user: "USRMONBAK",
        password: "U$po_resp4ld",
        connectString: "10.0.202.63:1523/monbakpdb",
      });
      // Insertar datos en la base de datos, incluyendo un ID definido
      const result = await connection.execute(
        `INSERT INTO ServerInfo (IP, OS_Type, Port, EncryptedUser, EncryptedPassword, ServerName)
       VALUES (:ip, :osType, :port, :encryptedUser, :encryptedPassword, :serverName)`,
        {
          ip: ip,
          osType: osType,
          port: port,
          encryptedUser: Buffer.from(JSON.stringify(encryptedUser)),
          encryptedPassword: Buffer.from(JSON.stringify(encryptedPassword)),
          serverName: serverName,
        },
        { autoCommit: true }
      );
      console.log("Servidor insertado correctamente:", result);
    } catch (err) {
      console.error("Error al insertar servidor en la base de datos:", err);
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión a la base de datos:", err);
        }
      }
    }
  }
  // Modificación en el manejo del IPC para agregar un servidor con ID
  ipcMain.handle("add-server", async (event, serverData) => {
    const { serverName, ip, os, port, username, password } = serverData;
    try {
      console.log(`Agregando servidor: ${serverName}, IP: ${ip}, OS: ${os}`);
      const encryptedUser = encrypt(username);
      const encryptedPassword = encrypt(password);
      // Pasamos el ID manualmente al insertar el servidor
      await insertServerInfo(
        ip,
        os,
        port,
        encryptedUser,
        encryptedPassword,
        serverName
      );
      return { success: true };
    } catch (error) {
      console.error("Error al agregar el servidor:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle(
    "save-log-to-database",
    async (
      event,
      { logDetails, dumpFileInfo, targetOS, logFileName, ip, backupPath, totalFolderSize, backupStatus, groupControlInfo, lastLine }
    ) => { // Añadimos los nuevos campos aquí
      console.log('Objeto completo recibido:', { logDetails, lastLine }); // Debug adicional
      // Extraer lastLine del objeto principal si existe
      const lastLineToUse = lastLine || logDetails.lastLine;
      try {
        await saveLogToDatabase(
          logDetails,
          dumpFileInfo,
          targetOS,
          logFileName,
          ip,
          backupPath,
          totalFolderSize, // Pasamos totalFolderSize
          backupStatus,    // Pasamos backupStatus
          groupControlInfo, // Pasamos groupControlInfo
          lastLineToUse
        );
        return { success: true };
      } catch (error) {
        console.error("Error saving log details to database:", error);
        throw error;
      }
    }
  );
  async function getServers() {
    let connection;
    try {
      connection = await oracledb.getConnection({
        user: "USRMONBAK",
        password: "U$po_resp4ld",
        connectString: "10.0.202.63:1523/monbakpdb",
      });

      const result = await connection.execute(
        `SELECT ID, ServerName, IP, OS_Type, Port FROM ServerInfo`
      );
      return result.rows.map((row) => ({
        id: row[0],
        name: row[1],
        ip: row[2],
        os: row[3],
        port: row[4],
        display: `${row[2]} - ${row[1]}`, // Formato "IP - NombreDelServidor"
      }));
    } catch (err) {
      console.error("Error al recuperar datos de la base de datos:", err);
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión a la base de datos:", err);
        }
      }
    }
  }
  ipcMain.handle("get-servers", async () => {
    return await getServers();
  });
  async function readLob(lob) {
    return new Promise((resolve, reject) => {
      let data = [];
      lob.on("data", (chunk) => data.push(chunk));
      lob.on("end", () => resolve(Buffer.concat(data)));
      lob.on("error", (err) => reject(err));
    });
  }
  function decrypt(encryptedData) {
    try {
      // Si encryptedData es un string, intentamos parsearlo como JSON
      if (typeof encryptedData === "string") {
        encryptedData = JSON.parse(encryptedData);
      }
      // Si encryptedData es un objeto Buffer, lo convertimos a string
      if (Buffer.isBuffer(encryptedData)) {
        encryptedData = encryptedData.toString();
      }
      // Ahora parseamos el JSON
      const data = JSON.parse(encryptedData);
      // Verificamos que tenemos los datos necesarios
      if (!data.iv || !data.encryptedData) {
        throw new Error("Formato de datos encriptados inválido");
      }
      let iv = Buffer.from(data.iv, "hex");
      let encryptedText = Buffer.from(data.encryptedData, "hex");
      let decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      // Convertimos a string y eliminamos comillas adicionales
      let decryptedText = decrypted.toString().replace(/^"|"$/g, "");
      // Intentamos parsear el resultado como JSON
      try {
        return JSON.parse(decryptedText);
      } catch (e) {
        // Si no es JSON válido, devolvemos el string
        return decryptedText;
      }
    } catch (error) {
      console.error("Error al desencriptar:", error);
      return null;
    }
  }
  ipcMain.handle("get-server-details", async (event, serverId) => {
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute(
        `SELECT ID, ServerName, IP, OS_Type, Port, EncryptedUser, EncryptedPassword 
         FROM ServerInfo WHERE ID = :id`,
        { id: serverId }
      );
      if (result.rows.length > 0) {
        const row = result.rows[0];
        const encryptedUserLob = row[5]; // EncryptedUser LOB
        const encryptedPasswordLob = row[6]; // EncryptedPassword LOB
        // Leer los LOBs de usuario y contraseña
        const encryptedUser = await readLob(encryptedUserLob);
        const encryptedPassword = await readLob(encryptedPasswordLob);
        // Aquí verificamos si ya está en texto claro
        let decryptedUser = encryptedUser.toString();
        let decryptedPassword = encryptedPassword.toString();
        // Verificamos si los valores están en texto claro o si necesitan desencriptarse
        if (
          decryptedUser.startsWith("{") &&
          decryptedUser.includes("encryptedData")
        ) {
          decryptedUser = decrypt(encryptedUser); // Desencripta solo si es necesario
        }
        if (
          decryptedPassword.startsWith("{") &&
          decryptedPassword.includes("encryptedData")
        ) {
          decryptedPassword = decrypt(encryptedPassword); // Desencripta solo si es necesario
        }
        console.log("Decrypted User:", decryptedUser); // Agregar este log
        console.log("Decrypted Password:", decryptedPassword); // Agregar este log
        return {
          id: row[0],
          serverName: row[1],
          ip: row[2],
          os: row[3],
          port: row[4],
          username: decryptedUser, // Usuario desencriptado o en texto claro
          password: decryptedPassword, // Contraseña desencriptada o en texto claro
        };
      } else {
        return { error: "Servidor no encontrado" };
      }
    } catch (err) {
      console.error("Error al obtener los detalles del servidor:", err);
      return { error: err.message };
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión:", err);
        }
      }
    }
  });
  ipcMain.handle("delete-server", async (event, serverId) => {
    let connection;
    try {
      // Establecer conexión a la base de datos
      connection = await oracledb.getConnection({
        user: "USRMONBAK",
        password: "U$po_resp4ld",
        connectString: "10.0.202.63:1523/monbakpdb",
      });
      // Ejecutar la consulta de eliminación
      const result = await connection.execute(
        `DELETE FROM ServerInfo WHERE ID = :id`,
        { id: serverId },
        { autoCommit: true }
      );
      console.log(`Servidor con ID ${serverId} eliminado.`, result);
      // Verificar si se eliminó algún registro
      if (result.rowsAffected === 0) {
        return {
          success: false,
          error: `No se encontró el servidor con ID ${serverId}`,
        };
      }
      return { success: true };
    } catch (err) {
      console.error("Error al eliminar el servidor:", err);
      return { success: false, error: err.message };
    } finally {
      // Cerrar la conexión
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión:", err);
        }
      }
    }
  });
  ipcMain.handle(
    "verify-credentials", //ACA ESTA DESENCRIPTADO
    async (event, { ip, username, password }) => {
      let connection;
      try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
          `SELECT EncryptedUser, EncryptedPassword, OS_Type, Port FROM ServerInfo WHERE IP = :ip`,
          { ip: ip }
        );
        if (result.rows.length > 0) {
          const encryptedUserLob = result.rows[0][0];
          const encryptedPasswordLob = result.rows[0][1];
          const osType = result.rows[0][2];
          const port = result.rows[0][3];
          if (!encryptedUserLob || !encryptedPasswordLob) {
            throw new Error("Encrypted User or Password Lob is undefined");
          }
          // Leer los Lobs
          const encryptedUser = await readLob(encryptedUserLob);
          const encryptedPassword = await readLob(encryptedPasswordLob);
          //console.log("Encrypted User Buffer:", encryptedUser);
          //console.log("Encrypted Password Buffer:", encryptedPassword);
          if (!encryptedUser || !encryptedPassword) {
            throw new Error("Failed to read Lob data");
          }
          // Desencriptar los datos
          let storedUser, storedPassword;
          try {
            storedUser = decrypt(encryptedUser);
            storedPassword = decrypt(encryptedPassword);
          } catch (decryptionError) {
            console.error("Error al desencriptar los datos:", decryptionError);
            return {
              success: false,
              message: "Error al desencriptar los datos.",
            };
          }
          // Comparar las credenciales
          if (storedUser === username && storedPassword === password) {
            return { success: true, osType, port };
          } else {
            return {
              success: false,
              message: "Usuario o contraseña incorrectos.",
            };
          }
        } else {
          return { success: false, message: "Servidor no encontrado." };
        }
      } catch (err) {
        console.error("Error al verificar las credenciales:", err);
        return {
          success: false,
          message: "Error en la verificación de credenciales.",
        };
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (err) {
            console.error(
              "Error al cerrar la conexión a la base de datos:",
              err
            );
          }
        }
      }
    }
  );
  // Función para actualizar servidor en la base de datos
  async function updateServerInfo(id, name, ip, os, port, username, password) {
    let connection;
    try {
      connection = await oracledb.getConnection({
        user: "USRMONBAK",
        password: "U$po_resp4ld",
        connectString: "10.0.202.63:1523/monbakpdb",
      });
      // Actualizar datos del servidor
      const result = await connection.execute(
        `UPDATE ServerInfo 
       SET ServerName = :name, IP = :ip, OS_Type = :os, Port = :port, EncryptedUser = :username, EncryptedPassword = :password
       WHERE ID = :id`,
        {
          id: id,
          name: name,
          ip: ip,
          os: os,
          port: port,
          username: Buffer.from(JSON.stringify(username)), // Encripta el usuario
          password: Buffer.from(JSON.stringify(password)), // Encripta la contraseña
        },
        { autoCommit: true }
      );
      console.log("Servidor actualizado correctamente:", result);
      return result;
    } catch (err) {
      console.error("Error al actualizar servidor en la base de datos:", err);
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión a la base de datos:", err);
        }
      }
    }
  }
  // En el manejador para actualizar el servidor
  ipcMain.handle("update-server", async (event, serverData) => {
    const { id, serverName, ip, os, port, username, password } = serverData;
    try {
      console.log(`Actualizando servidor: ${serverName}, IP: ${ip}, OS: ${os}`);
      // Eliminar comillas innecesarias en el username y password antes de encriptarlos
      const cleanUsername = username.replace(/^"|"$/g, "");
      const cleanPassword = password.replace(/^"|"$/g, "");
      const encryptedUser = encrypt(cleanUsername); // Encripta el usuario limpio
      const encryptedPassword = encrypt(cleanPassword); // Encripta la contraseña limpia
      const result = await updateServerInfo(
        id,
        serverName,
        ip,
        os,
        port,
        encryptedUser,
        encryptedPassword
      );
      console.log("Servidor actualizado correctamente:", result);
      return { success: true };
    } catch (error) {
      console.error("Error al actualizar el servidor:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("getBackupRoutesByIP", async (event, ip) => {
    //console.log("IP recibida para obtener rutas:", ip);
    let connection;
    try {
      connection = await oracledb.getConnection(dbConfig);
      const result = await connection.execute(
        `SELECT br.BackupPath, si.OS_Type 
       FROM BackupRoutes br 
       JOIN ServerInfo si ON br.ServerID = si.ID 
       WHERE si.IP = :ip`,
        { ip: ip }
      );
      console.log("Rutas obtenidas de la base de datos para la IP:", ip, "->", result.rows);
      return result.rows.map((row) => ({
        backupPath: row[0],
        os: row[1],
      }));
    } catch (error) {
      console.error("Error al obtener las rutas de backup:", error);
      return [];
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión:", err);
        }
      }
    }
  });
  // Añade esta función para usar dentro de processAllServers
  async function getBackupRoutesByIPInternal(ip, connection) {
    try {
      const result = await connection.execute(
        `SELECT br.BackupPath, si.OS_Type
       FROM BackupRoutes br
       JOIN ServerInfo si ON br.ServerID = si.ID
       WHERE si.IP = :ip`,
        { ip: ip }
      );
      //console.log("Rutas obtenidas de la base de datos:", result.rows);
      return result.rows.map((row) => ({
        backupPath: row[0],
        os: row[1],
      }));
    } catch (error) {
      console.error("Error al obtener las rutas de backup:", error);
      return [];
    }
  }
  function formatFileSizeProcess(sizeWithUnit) {
    // Extrae el número y la unidad del string
    const sizePattern = /(\d+(?:\.\d+)?)\s*(MB|GB)?/i;
    const match = sizeWithUnit.match(sizePattern);

    if (!match) return sizeWithUnit; // Si el formato es incorrecto, regresa el valor tal cual

    let size = parseFloat(match[1]);
    const unit = match[2] ? match[2].toUpperCase() : "MB"; // Default a "MB" si no tiene unidad

    // Convertir a GB si está en MB y mayor o igual a 1000
    if (unit === "MB" && size >= 1000) {
      size = (size / 1000).toFixed(2);
      return `${size} GB`;
    }

    // Mantener el tamaño original con su unidad
    return `${size.toFixed(2)} ${unit}`;
  }
  async function processAllServers() {
    let connection;
    let results = [];
    try {
      connection = await oracledb.getConnection(dbConfig);
      const serversResult = await connection.execute(
        `SELECT ID, ServerName, IP, OS_Type, Port, EncryptedUser, EncryptedPassword FROM ServerInfo`
      );

      for (const row of serversResult.rows) {
        const serverName = row[1];
        const ip = row[2];
        const osType = row[3];
        const port = row[4];
        const encryptedUserLob = row[5];
        const encryptedPasswordLob = row[6];
        let connectionSuccess = false;

        try {
          console.log(`Procesando servidor: ${serverName} (${ip})`);

          // Desencriptar credenciales
          const decryptedUser = await decrypt(await readLob(encryptedUserLob));
          const decryptedPassword = await decrypt(
            await readLob(encryptedPasswordLob)
          );
          const connectionResult = await checkConnection(
            ip,
            port,
            decryptedUser,
            decryptedPassword
          );
          if (!connectionResult) {
            results.push({
              serverName,
              ip,
              error: `No se pudo conectar al servidor ${serverName}`,
              logDetails: null,
            });
            continue; // Continuar con el siguiente servidor
          }
          connectionSuccess = true;

          // Obtener rutas de backup
          const backupRoutes = await getBackupRoutesByIPInternal(
            ip,
            connection
          );
          if (backupRoutes.length === 0) {
            console.log(
              `No se encontraron rutas de backup para el servidor ${serverName}`
            );
            results.push({
              serverName,
              ip,
              error: `No se encontraron rutas de backup para el servidor ${serverName}`,
              logDetails: null, // Asegúrate de incluir esto
            });
            continue; // Si no hay rutas de backup, saltar este servidor
          }

          for (const route of backupRoutes) {
            const backupPath = route.backupPath;
            try {
              const logDetails = await getLogDetailsLogic(
                backupPath,
                ip,
                port,
                decryptedUser,
                decryptedPassword,
                osType
              );
              // Si logDetails es null, significa que la ruta fue excluida
              if (logDetails === null) {
                console.log(`Ruta ${backupPath} excluida para el servidor ${serverName}`);
                continue; // Saltar esta ruta y pasar a la siguiente
              }

              // Verificar si logDetails está vacío o contiene un error
              if (!logDetails || (Array.isArray(logDetails) && logDetails.length === 0)) {
                results.push({
                  serverName,
                  ip,
                  backupPath,
                  error: `Archivo log no válido o incompatible para la carpeta: ${backupPath}, en el servidor: ${serverName}, IP: ${ip}`,
                  logDetails: null,
                });
                continue; // Continuar con la siguiente ruta
              }

              if (logDetails.error) {
                results.push({
                  serverName,
                  ip,
                  backupPath,
                  error: logDetails.error,
                  logDetails: null
                });
                continue;
              }
              // Lógica específica para WebContent
              if (serverName === 'WebContent' || (serverName === 'Contratacion digital' && backupPath === '/disco3/BK_RMAN_CONTRADIGI')) {
                // Guardar detalles específicos de WebContent, por ejemplo:
                results.push({
                  serverName,
                  ip,
                  backupPath,
                  logDetails: logDetails, // Incluye los detalles específicos aquí
                  error: null,
                });
                continue; // Continuar sin procesar más detalles, ya que solo necesitas estos detalles específicos
              }
              const requiredSubfolders = [
                "ESQ_USRREPBI",
                "BK_ANTES2",
                "APP_ESQUEMAS",
                "BK_MD_ANTES",
                "BK_JAQL546_FPAE71",
                "BK_ANTES",
                "RENIEC"
              ];

              if (serverName === "Bantotal" && logDetails && logDetails.backupIncomplete) {
                // Encuentra las subcarpetas existentes en `directories`
                const existingSubfolders = directories.map(folder => folder.split('/').pop()); // Obtener solo el nombre de la carpeta

                // Filtrar las subcarpetas requeridas que no están presentes
                const missingSubfolders = requiredSubfolders.filter(required =>
                  !existingSubfolders.includes(required) // Comparación exacta
                );

                // Mensaje para el modal
                let warningMessage = `Backup Incompleto: Se esperaban 7 carpetas, pero se encontraron ${logDetails.foundFolders}.`;
                if (missingSubfolders.length > 0) {
                  warningMessage += ` Faltan las siguientes carpetas: ${missingSubfolders.join(", ")}.`;
                }
                results.push({
                  serverName,
                  ip,
                  backupPath,
                  warning: warningMessage,
                  logDetails: logDetails, // Mantenemos los detalles de las carpetas existentes
                });
              } else if (
                !logDetails ||
                (Array.isArray(logDetails) && logDetails.length === 0)
              ) {
                results.push({
                  serverName,
                  ip,
                  backupPath,
                  error: "No se encontraron detalles de log",
                  logDetails: null,
                });
                continue;
              }
              // Verificar si el backup o alguna subcarpeta está vacía
              if (logDetails && logDetails.backupVoid) {
                results.push({
                  serverName,
                  ip,
                  backupPath,
                  warning: `${ip} La carpeta principal ${backupPath} está vacía en el servidor ${serverName}.`,
                  logDetails: logDetails,
                });
                continue;
              }
              // Extraer mensaje de error ORA si existe


              // **Guardado en la base de datos** (solo si el log está completo y tiene datos)
              if (Array.isArray(logDetails)) {
                for (const detail of logDetails) {
                  if (detail.logDetails && detail.logDetails.startTime) {
                    const fullBackupPath = detail.backupPath;
                    // Extraer lastLine para el array
                    const lastLineToUse = detail.lastLine || "No hay información disponible";

                    // Construir groupControlInfo para el array
                    const groupControlInfo = {
                      hasWarning: detail.hasWarning || false,
                      last10Lines: detail.last10Lines || [],
                      lastLine: lastLineToUse
                    };
                    const groupControlInfoString = JSON.stringify(groupControlInfo);
                    await saveLogToDatabase(
                      detail.logDetails,
                      detail.dumpFileInfo,
                      osType,
                      detail.logFileName,
                      ip,
                      fullBackupPath,
                      formatFileSizeProcess(detail.totalFolderSize),     // Añadir totalFolderSize
                      lastLineToUse,
                      groupControlInfoString,

                    );
                  }
                }
              } else if (logDetails && logDetails.logDetails && logDetails.logDetails.startTime) {
                const fullBackupPath = logDetails.backupPath;
                // Extraer lastLine para el objeto simple
                const lastLineToUse = logDetails.lastLine || "No hay información disponible";

                // Construir groupControlInfo para el objeto simple
                const groupControlInfo = {
                  hasWarning: logDetails.hasWarning || false,
                  last10Lines: logDetails.last10Lines || [],
                  lastLine: lastLineToUse
                };
                const groupControlInfoString = JSON.stringify(groupControlInfo);
                await saveLogToDatabase(
                  logDetails.logDetails,
                  logDetails.dumpFileInfo,
                  osType,
                  logDetails.logFileName,
                  ip,
                  fullBackupPath,
                  formatFileSizeProcess(logDetails.totalFolderSize),     // Añadir totalFolderSize
                  lastLineToUse,
                  groupControlInfoString,
                );
              }

              // Solo agregar servidores exitosos al grid
              results.push({
                serverName,
                ip,
                backupPath,
                logDetails,
                error: null,
              });
            } catch (routeError) {
              console.error(
                `Error procesando la ruta ${backupPath} del servidor ${serverName}:`,
                routeError
              );
              results.push({
                serverName,
                ip,
                backupPath,
                error: routeError.message,
                logDetails: null, // Asegúrate de incluir esto
              });
              // No agregar al grid si hay error en el log
            }
          }
        } catch (serverError) {
          // Si hubo conexión exitosa, este error no es de conexión
          const errorType = connectionSuccess
            ? `Error específico al procesar logs en ${serverName}`
            : `Error al conectar con el servidor ${serverName}`;

          console.error(`${errorType}:`, serverError);
          results.push({
            serverName,
            ip,
            error: `${errorType}: ${serverError.message}`,
            logDetails: null,
          });
        }
      }
    } catch (err) {
      console.error("Error al procesar todos los servidores:", err);
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error al cerrar la conexión a la base de datos:", err);
        }
      }
    }
    return results;
  }
  ipcMain.handle("process-all-servers", async (event) => {
    try {
      const results = await processAllServers();
      return { success: true, results };
    } catch (error) {
      console.error("Error al procesar todos los servidores:", error);
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle('send-email-with-images', async (event, data) => {
    const transporter = nodemailer.createTransport({
        host: '10.0.200.68',
        port: 25,
        secure: false,
        tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
        from: 'igs_llupacca@cajaarequipa.pe',
        to: 'igs_llupacca@cajaarequipa.pe, ehidalgom@cajaarequipa.pe, kcabrerac@cajaarequipa.pe, mblas@cajaarequipa.pe',
        subject: `Reporte de Backups - ${data.date}`,
        html: data.html // Usar directamente el HTML generado
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado exitosamente');
        return { success: true };
    } catch (error) {
        console.error('Error al enviar correo:', error);
        return { success: false, error: error.message };
    }
});
  async function getFolderSize(conn, directoryPath, os, sftp) {
    if (os === "solaris" || os === "linux") {
      // Comando `du` para obtener el tamaño total en lugar de cada subcarpeta
      const command = `du -sk ${directoryPath} | awk '{print $1/1024}'`; // Directamente en MB
      const output = await executeSSHCommand(conn, command);

      // Verificar si hay salida del comando
      if (!output || output.trim() === "") {
        throw new Error("No se obtuvo salida del comando du");
      }

      // Convertir la salida en MB y retornarla
      const totalSizeInMB = parseFloat(output.trim()).toFixed(2);
      return parseFloat(totalSizeInMB); // Tamaño en MB
    } else {
      // Lógica para Windows o sistemas no Unix
      async function calculateSize(path) {
        let totalSize = 0;
        const files = await new Promise((resolve, reject) => {
          sftp.readdir(path, (err, fileList) => {
            if (err) return reject(err);
            resolve(fileList || []);
          });
        });
        for (const file of files) {
          const filePath =
            path + (os === "windows" ? "\\" : "/") + file.filename;
          const stats = await new Promise((resolve, reject) => {
            sftp.stat(filePath, (err, stats) => {
              if (err) return reject(err);
              resolve(stats);
            });
          });
          if (stats.isDirectory()) {
            totalSize += await calculateSize(filePath);
          } else {
            totalSize += stats.size;
          }
        }
        return totalSize;
      }
      const totalSize = await calculateSize(directoryPath);
      return parseFloat((totalSize / (1024 * 1024)).toFixed(2)); // Tamaño en MB
    }
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
function createSSHClient(ip, port, username, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        //console.log("SSH Connection established");
        resolve(conn);
      })
      .on("error", (err) => {
        reject(new Error(`SSH Connection failed: ${err.message}`));
      })
      .connect({
        host: ip,
        port: port,
        username: username,
        password: password,
        algorithms: {
          kex: [
            "curve25519-sha256",
            "diffie-hellman-group-exchange-sha256",
            "diffie-hellman-group16-sha512",
            "diffie-hellman-group18-sha512",
            "diffie-hellman-group-exchange-sha1",
            "diffie-hellman-group14-sha1",
            "diffie-hellman-group1-sha1"
          ],
          serverHostKey: [
            "ssh-ed25519",
            "rsa-sha2-512",
            "rsa-sha2-256",
            "ssh-rsa",
            "ssh-dss"
          ],
          cipher: [
            "aes128-ctr",
            "aes192-ctr",
            "aes256-ctr",
          ],
          hmac: [
            "hmac-sha2-256-etm@openssh.com",
            "hmac-sha2-512-etm@openssh.com",
            "hmac-md5",
            "hmac-sha1",
            "hmac-ripemd160",
            "hmac-sha1-96",
            "hmac-md5-96"
          ],
          compress: [
            "none",
            "zlib@openssh.com"
          ]
        },
        // Agregar opciones de compatibilidad
        compress: false,
        keepaliveInterval: 0,
        keepaliveCountMax: 3,
      });
  });
}
function checkConnection(ip, port, username, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn
      .on("ready", () => {
        console.log("Initial connection successful");
        conn.exec('echo "Connection test"', (err, stream) => {
          if (err) {
            console.error("Exec error:", err);
            conn.end();
            return reject(new Error(`Exec failed: ${err.message}`)); // Rechazar en caso de error
          }

          stream
            .on("close", (code, signal) => {
              conn.end();
              resolve({ success: true, message: "Conexión exitosa" }); // Resolver cuando el comando se cierra correctamente
            })
            .on("data", (data) => {
              console.log("Received:", data.toString());
            })
            .stderr.on("data", (data) => {
              console.error("STDERR:", data.toString());
            });
        });
      })
      .on("error", (err) => {
        console.error("Connection error:", err);
        // Diferencia entre errores de conexión y autenticación
        let errorMessage;
        if (err.level === "client-authentication") {
          errorMessage = "Usuario o contraseña incorrecta";
        } else if (err.code === "ECONNREFUSED") {
          errorMessage = "Conexión rechazada por el servidor";
        } else if (err.code === "ENOTFOUND") {
          errorMessage = "Servidor no encontrado. Verifique la IP";
        } else {
          errorMessage = "Error de conexión: " + err.message;
        }

        reject(new Error(errorMessage)); // Rechazar en caso de error de conexión
      })
      .connect({
        host: ip,
        port: port,
        username: username,
        password: password,
        readyTimeout: 30000,    // Timeout de conexión de 3 segundos
        timeout: 30000,         // Timeout general de 3 segundos
        algorithms: {
          kex: [
            "curve25519-sha256",
            "diffie-hellman-group-exchange-sha256",
            "diffie-hellman-group16-sha512",
            "diffie-hellman-group18-sha512",
            "diffie-hellman-group-exchange-sha1",
            "diffie-hellman-group14-sha1",
            "diffie-hellman-group1-sha1"
          ],
          serverHostKey: [
            "ssh-ed25519",
            "rsa-sha2-512",
            "rsa-sha2-256",
            "ssh-rsa",
            "ssh-dss"
          ],
          cipher: [
            "aes128-ctr",
            "aes192-ctr",
            "aes256-ctr",
          ],
          hmac: [
            "hmac-sha2-256-etm@openssh.com",
            "hmac-sha2-512-etm@openssh.com",
            "hmac-md5",
            "hmac-sha1",
            "hmac-ripemd160",
            "hmac-sha1-96",
            "hmac-md5-96"
          ],
          compress: [
            "none",
            "zlib@openssh.com"
          ]
        },
        // Agregar opciones de compatibilidad
        compress: false,
        keepaliveInterval: 0,
        keepaliveCountMax: 3
      });
  });
}

// Función para parsear las fechas en el log y formatearlas para Oracle
function formatDateForOracle(date) {
  if (!date) return null;
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    console.error("Invalid date:", date);
    return null;
  }
  return dateObj
    .toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/(\d+)\/(\d+)\/(\d+),/, "$3-$1-$2");
}
let globalThreshold = 90;  // Umbral predeterminado
// Escuchar el canal IPC 'update-threshold'
ipcMain.on('update-threshold', (event, thresholdValue) => {
  console.log('Nuevo umbral recibido:', thresholdValue);
  globalThreshold = thresholdValue;
  // Aquí puedes usar el valor de thresholdValue según sea necesario.
  // Por ejemplo, almacenarlo o pasarlo a una función que procese los logs.
});
function getLast10LogLines(logContent, threshold = globalThreshold) {
  const lines = logContent.trim().split("\n");
  const warningPattern = /_(\d{2})/;
  let lastWarningNumber = -1;
  let relevantLines = [];

  // Iteramos sobre las últimas 20 líneas para asegurarnos de no perder información relevante
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
    const line = lines[i];
    const match = line.match(warningPattern);
    if (match) {
      const warningNumber = parseInt(match[1], 10);
      if (warningNumber >= threshold) {
        // Insertar la línea al inicio para mantener el orden ascendente
        relevantLines.unshift(line);
      }
    }
  }

  return {
    relevantLines: relevantLines.slice(-10), // Tomamos las últimas 10 líneas relevantes (en orden ascendente)
    hasWarning: relevantLines.length > 0,
    warningNumber: relevantLines.length > 0
      ? parseInt(relevantLines[relevantLines.length - 1].match(warningPattern)[1], 10)
      : -1, // Último número de advertencia (si existe)
  };
}
function parseLogLine(logContent, serverName) {
  const oraErrorPattern = /ORA-\d{5}/g;
  const oraSpecificErrorPattern = /ORA-39327/;
  const successPattern = /successfully completed/i;
  const logInfo = getLast10LogLines(logContent, globalThreshold);
  const lines = logContent.split("\n");
  let lastLine = lines[lines.length - 1].trim();
  // Si la última línea está vacía, busca la primera línea no vacía desde el final
  while (lastLine === "" && lines.length > 1) {
    lines.pop(); // Elimina la última línea vacía
    lastLine = lines[lines.length - 1].trim();
  }
  const hasOraSpecificError = oraSpecificErrorPattern.test(logContent);
  const hasSuccessMessage = successPattern.test(logContent);
  isSuccess = hasOraSpecificError || hasSuccessMessage;
  //console.log("Last line of log after handling empty lines:", lastLine); // Depuración
  let backupStatus = "EN PROGRESO";
  if (lastLine.toLowerCase().includes("completed")) {
    if (isSuccess) {
      backupStatus = "COMPLETADO";
    } else {
      backupStatus = "COMPLETADO CON ERRORES";
    }
  }
  const datePattern = /(\w{3} \w{3} \d{1,2} \d{2}:\d{2}:\d{2} \d{4})/g;
  const datesMatch = logContent.match(datePattern);
  let startDateTime = null;
  let endDateTime = null;
  if (datesMatch) {
    if (datesMatch.length > 0) {
      startDateTime = new Date(datesMatch[0]);
    }
    if (datesMatch.length > 1) {
      endDateTime = new Date(datesMatch[datesMatch.length - 1]);
    }
  }
  const durationPattern = /elapsed (\d{1,2} \d{2}:\d{2}:\d{2})/;
  const durationMatch = logContent.match(durationPattern);
  let duration = durationMatch ? durationMatch[1] : "N/A";
  // Elimina el "0 " si la duración comienza con "0 "
  if (duration.startsWith("0 ")) {
    duration = duration.substring(2); // Elimina los primeros dos caracteres "0 "
  }
  //console.log("Extracted Data:", { startDateTime, endDateTime, duration });
  // Capturar todos los errores ORA-
  let oraError = {
    previousLine: "", // Línea anterior al primer error ORA-
    errorLine: "", // Todos los errores ORA-
    nextLine: "", // Línea posterior al último error ORA-
  };

  let foundFirstError = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(oraErrorPattern) && !lines[i].match(oraSpecificErrorPattern)) {
      // Al encontrar el primer error ORA-, guarda la línea anterior
      if (!foundFirstError && i > 0) {
        oraError.previousLine = lines[i - 1].trim();
        foundFirstError = true;
      }
      // Añadir todos los errores ORA- a errorLine
      oraError.errorLine += lines[i].trim() + "\n";
    }
  }

  // Si se encontró algún error ORA-, guarda la línea posterior al último error
  if (foundFirstError) {
    const lastErrorIndex = lines.findIndex((line) => line === oraError.errorLine.trim().split("\n").pop().trim());
    if (lastErrorIndex < lines.length - 1) {
      oraError.nextLine = lines[lastErrorIndex + 1].trim();
    }
  }
  // Caso especial para el servidor "Pago Institucional"
  if (serverName === "Pago Institucional") {
    // Buscar el tiempo en la última línea si contiene "completed at"
    const completedAtPattern = /completed at (\d{2}:\d{2}:\d{2})/;
    const completedMatch = lastLine.match(completedAtPattern);

    if (completedMatch) {
      // Extraer el tiempo de fin desde la última línea
      const endTimeString = completedMatch[1];
      endDateTime = new Date(startDateTime);

      // Ajustar la hora, minutos y segundos del tiempo de fin basado en la línea
      const [hours, minutes, seconds] = endTimeString.split(":").map(Number);
      endDateTime.setHours(hours, minutes, seconds);

      // Calcular la duración entre tiempo de inicio y tiempo de fin
      const diffMilliseconds = endDateTime - startDateTime;
      const totalSeconds = Math.floor(diffMilliseconds / 1000);
      const hoursDiff = Math.floor(totalSeconds / 3600);
      const minutesDiff = Math.floor((totalSeconds % 3600) / 60);
      const secondsDiff = totalSeconds % 60;

      // Formatear la duración como "hh:mm:ss"
      duration = `${hoursDiff.toString().padStart(2, "0")}:${minutesDiff
        .toString()
        .padStart(2, "0")}:${secondsDiff.toString().padStart(2, "0")}`;
    }
  }
  //console.log("Last line of log:", lastLine);
  //console.log("Parsed backup status:", backupStatus);
  return {
    startTime: startDateTime ? formatDateForOracle(startDateTime) : null,
    endTime: endDateTime ? formatDateForOracle(endDateTime) : null,
    duration: duration !== "N/A" ? duration : null,
    success: isSuccess ? 1 : 0,
    oraError: oraError,
    backupStatus: backupStatus,
    last10Lines: logInfo.relevantLines, // Añadimos las últimas 11 líneas
    hasWarning: logInfo.hasWarning,
    warningNumber: logInfo.warningNumber,
    lastLine: lastLine  // Añade esta línea
  };
}
function formatFileSize(sizeInMB) {
  if (sizeInMB >= 1000) {
    let sizeInGB = (sizeInMB / 1000).toFixed(2);
    return `${sizeInGB} GB`;
  } else {
    return `${sizeInMB.toFixed(2)} MB`;
  }
}
async function getBackupStatistics() {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(`
      SELECT 
        COUNT(*) as total_backups,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_backups,
        AVG(CASE 
          WHEN horaFIN IS NOT NULL AND horaINI IS NOT NULL 
          THEN (CAST(horaFIN AS DATE) - CAST(horaINI AS DATE)) * 24 * 60 * 60 
          ELSE NULL 
        END) as avg_duration_seconds,
        COUNT(DISTINCT serverName) as unique_servers,
        COUNT(DISTINCT ip) as unique_ips,
        MAX(horaFIN) as last_backup_date
      FROM LogBackup
    `);
    return result.rows[0];
  } catch (err) {
    console.error("Error obteniendo estadísticas:", err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error al cerrar la conexión:", err);
      }
    }
  }
}
ipcMain.handle("get-backup-statistics", async (event) => {
  try {
    const stats = await getBackupStatistics();
    return stats;
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    throw error;
  }
});

async function saveLogToDatabase(
  logDetails,
  dumpFileInfo,
  targetOS,
  logFileName,
  ip,
  backupPath,
  totalFolderSize, // Nuevo campo
  lastLine
) {
  if (logDetails?.backupVoid) {
    console.log(`Skipping save for empty backup path: ${backupPath}`);
    return;
  }

  // Extraer oraErrorMessage directamente de logDetails
  const oraErrorMessage = logDetails.oraError
    ? (typeof logDetails.oraError === 'object'
      ? JSON.stringify(logDetails.oraError)
      : String(logDetails.oraError))
    : null;

  console.log("Contenido de logDetails:", logDetails);
  console.log("last10Lines:", logDetails.last10Lines);
  let finalGroupControlInfo;
  // Revisamos el objeto completo para debugging

  if (logDetails.hasWarning && Array.isArray(logDetails.last10Lines) && logDetails.last10Lines.length > 0) {
    finalGroupControlInfo = logDetails.last10Lines.join('\n');
  } else if (Array.isArray(lastLine) && lastLine.length > 0) {
    finalGroupControlInfo = lastLine[0];
  } else if (typeof lastLine === 'string' && lastLine.trim()) {
    finalGroupControlInfo = lastLine.trim();
  } else if (typeof logDetails.lastLine === 'string' && logDetails.lastLine.trim()) {
    // Intentar obtener lastLine desde logDetails si existe
    finalGroupControlInfo = logDetails.lastLine.trim();
  } else {
    finalGroupControlInfo = "No hay información disponible";
  }

  console.log("finalGroupControlInfo:", finalGroupControlInfo);
  const finalGroupControlInfoString = String(finalGroupControlInfo || "No hay información disponible");

  console.log("Valor de finalGroupControlInfo antes del INSERT:", finalGroupControlInfoString);
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const startTime = logDetails.startTime
      ? formatDateForOracle(logDetails.startTime)
      : null;
    const endTime = logDetails.endTime
      ? formatDateForOracle(logDetails.endTime)
      : null;
    // Convertir el tamaño de archivo
    let totalDmpSize = 0;

    // Función para verificar extensiones válidas
    const validExtensions = [".dmp", '.DMP', ".gz", ".err"];
    const isValidDmpFile = (filePath) =>
      validExtensions.some(ext => filePath.toLowerCase().endsWith(ext));

    // Verifica si dumpFileInfo es un array y suma los tamaños
    if (Array.isArray(dumpFileInfo)) {
      dumpFileInfo.forEach((file) => {
        if (file && file.fileSize) {
          const fileSize = parseFloat(file.fileSize);
          if (!isNaN(fileSize)) {
            totalDmpSize += fileSize;
          } else {
            console.warn(`Tamaño de archivo no válido para: ${file.filePath}`);
          }
        } else {
          console.warn(`Objeto no válido en dumpFileInfo:`, file);
        }
      });
    } else if (
      dumpFileInfo &&
      dumpFileInfo.filePath &&
      isValidDmpFile(dumpFileInfo.filePath)
    ) {
      console.log(`Found single DMP file: ${dumpFileInfo.filePath} with size ${dumpFileInfo.fileSize}`);
      const fileSize = parseFloat(dumpFileInfo.fileSize);
      if (!isNaN(fileSize)) {
        totalDmpSize += fileSize; // Suma el tamaño si es un único archivo válido
      }
    } else {
      console.warn("dumpFileInfo is not a valid object or array:", dumpFileInfo);
    }

    // Convertimos totalDmpSize a un número con dos decimales si es mayor que 0
    const formattedFileSize = formatFileSize(totalDmpSize);
    //console.log("Valores a insertar:", {
    //horaINI: startTime,
    //horaFIN: endTime,
    //duration: logDetails.duration,
    //success: logDetails.success ? 1 : 0,
    //dumpFileSize: formattedFileSize,
    //serverName: targetOS,
    //logFileName: logFileName,
    //ip: ip,
    //backupPath: backupPath,
    //});

    const result = await connection.execute(
      `INSERT INTO LogBackup (horaINI, duration, success, dumpFileSize, serverName, logFileName, horaFIN, ip, backupPath,totalFolderSize,backupStatus,groupControlInfo,oraErrorMessage) 
        VALUES (
          TO_DATE(:horaINI, 'YYYY-MM-DD HH24:MI:SS'),
          :duration,
          :success,
          :fileSize,
          :serverName,
          :logFileName,
          TO_DATE(:horaFIN, 'YYYY-MM-DD HH24:MI:SS'),
          :ip,
          :backupPath,
          :totalFolderSize,
          :backupStatus,
          :groupControlInfo,
          :oraErrorMessage
        )`,
      {
        horaINI: startTime,
        horaFIN: endTime,
        duration: logDetails.duration,
        success: logDetails.success ? 1 : 0,
        fileSize: formatFileSize(totalDmpSize), // Guardar el valor con la unidad (MB o GB)
        serverName: targetOS,
        logFileName: logFileName,
        ip: ip,
        backupPath: backupPath,
        totalFolderSize: totalFolderSize, // Nuevo campo
        backupStatus: logDetails.backupStatus, // Nuevo campo
        groupControlInfo: finalGroupControlInfoString, // Nuevo campo
        oraErrorMessage: oraErrorMessage
      },
      { autoCommit: true }
    );
    console.log("Detalles del log guardados en la base de datos:", result);
  } catch (err) {
    console.error(
      "Error al guardar los detalles del log en la base de datos:",
      err
    );
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error al cerrar la conexión con la base de datos:", err);
      }
    }
  }
}
const nodemailer = require('nodemailer');

// Array para almacenar las alertas
let pendingAlerts = [];
let timeoutId = null;

async function addAlert(ip, serverName, subfolderName, message) {
  // Agregar alerta al array
  pendingAlerts.push({ ip, serverName, subfolderName, message });

  // Limpiar el timeout anterior si existe
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  // Establecer un nuevo timeout de 1 minuto
  timeoutId = setTimeout(() => {
    if (pendingAlerts.length > 0) {
      sendCombinedAlerts();
    }
  }, 300000); // Espera 1 minuto antes de enviar
}

async function sendCombinedAlerts() {
  try {
    const transporter = nodemailer.createTransport({
      host: '10.0.200.68',
      port: 25,
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Crear el HTML para todas las alertas
    const alertsHtml = pendingAlerts.map(alert => `
      <div style="margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <h2 style="color: #d9534f;">Alerta de espacio en servidor ${alert.serverName}</h2>
        <p>Se ha detectado una advertencia de espacio en el servidor <b>${alert.serverName}</b> (IP: ${alert.ip}).</p>
        <p><b>Subcarpeta afectada:</b> ${alert.subfolderName}</p>
        <h4>Detalles del log:</h4>
        <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 3px;">${alert.message.replace(/\n/g, '<br>')}</pre>
      </div>
    `).join('');

    const mailOptions = {
      from: 'igs_llupacca@cajaarequipa.pe',
      to: 'igs_llupacca@cajaarequipa.pe, ehidalgom@cajaarequipa.pe, kcabrerac@cajaarequipa.pe, mblas@cajaarequipa.pe',
      subject: `Alertas de espacio en servidores (${pendingAlerts.length} alertas)`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Resumen de Alertas de Espacio</h1>
          ${alertsHtml}
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Este es un mensaje automático generado por el sistema de monitoreo de backups.
            Por favor, no responda a este correo.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo combinado enviado con éxito:', info.response);
    
    // Limpiar las alertas pendientes
    pendingAlerts = [];
  } catch (error) {
    console.error('Error al enviar el correo:', error.message);
  }
}

// Esta es la función que deberás llamar en lugar de sendEmailAlert
async function sendEmailAlert(ip, serverName, subfolderName, message) {
  await addAlert(ip, serverName, subfolderName, message);
}

// Añade estas funciones en algún lugar apropiado en tu main.js

function getConstantIdentifier(fullPath, serverIdentifier, characterCount = 12) {
  const parts = fullPath.split("/");
  const subdir = parts[parts.length - 1];
  // Incluye `serverIdentifier` en el identificador único
  return `${serverIdentifier}-${subdir.substring(0, characterCount)}`;
}

async function getDmpSizeData(days = 30) {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    // Obtener todos los servidores y rutas
    const allServersAndRoutesResult = await connection.execute(`
      SELECT DISTINCT serverName, ip, backupPath
      FROM LogBackup
    `);

    // Obtener los datos de backup
    const dataResult = await connection.execute(
      `
      SELECT 
        l.serverName,
        l.ip,
        l.backupPath,
        l.horaFIN as fecha,
        l.dumpFileSize,
        l.duration
      FROM LogBackup l
      WHERE l.horaFIN >= SYSDATE - :days
      ORDER BY l.serverName, l.ip, l.backupPath, l.horaFIN
    `,
      { days: days }
    );

    console.log(
      "Todos los servidores y rutas:",
      allServersAndRoutesResult.rows
    );
    console.log(
      "Datos obtenidos para el período seleccionado:",
      dataResult.rows
    );

    // Función para convertir el tamaño a GB
    const convertToGB = (size) => {
      const match = size.match(/^(\d+(\.\d+)?)\s*(MB|GB)$/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[3].toUpperCase();
        return unit === "GB" ? value : value / 1024;
      }
      return 0;
    };
    // Agrupar los datos por IP y los primeros 12 caracteres del backupPath
    const groupedData = dataResult.rows.reduce((acc, row) => {
      // Usar IP + primeros 12 caracteres de backupPath para agrupar solo dentro del mismo servidor
      const identifier = getConstantIdentifier(row[2], row[1], 12);
      if (!acc[identifier]) {
        acc[identifier] = {
          identifier,
          serverName: row[0],
          ip: row[1],
          data: [],
        };
      }
      acc[identifier].data.push({
        backupPath: row[2],
        fecha: row[3],
        tamanoDMP: convertToGB(row[4]),
        duracion: row[5]
      });
      return acc;
    }, {});

    const processedData = Object.values(groupedData);

    console.log("Datos procesados:", processedData);

    // Usar allServersAndRoutesResult para la lista de todos los servidores
    const allServers = allServersAndRoutesResult.rows.map((row) => ({
      serverName: row[0],
      ip: row[1],
    }));

    return {
      data: processedData,
      allServersAndRoutes: allServers,
    };
  } catch (err) {
    console.error("Error obteniendo datos de tamaño DMP:", err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error al cerrar la conexión:", err);
      }
    }
  }
}
ipcMain.handle("addBackupRoute", async (event, ip, backupPath) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `INSERT INTO BackupRoutes (BackupPath, ServerID)
       SELECT :backupPath, ID FROM ServerInfo WHERE IP = :ip`,
      { backupPath, ip },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } catch (error) {
    console.error("Error al agregar la ruta de backup:", error);
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error al cerrar la conexión:", error);
      }
    }
  }
});

ipcMain.handle("updateBackupRoute", async (event, ip, oldPath, newPath) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `UPDATE BackupRoutes
       SET BackupPath = :newPath
       WHERE BackupPath = :oldPath AND ServerID = (SELECT ID FROM ServerInfo WHERE IP = :ip)`,
      { newPath, oldPath, ip },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } catch (error) {
    console.error("Error al actualizar la ruta de backup:", error);
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error al cerrar la conexión:", error);
      }
    }
  }
});
ipcMain.handle("deleteBackupRoute", async (event, ip, backupPath) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `DELETE FROM BackupRoutes
       WHERE BackupPath = :backupPath AND ServerID = (SELECT ID FROM ServerInfo WHERE IP = :ip)`,
      { backupPath, ip },
      { autoCommit: true }
    );
    return { success: result.rowsAffected > 0 };
  } catch (error) {
    console.error("Error al eliminar la ruta de backup:", error);
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error al cerrar la conexión:", error);
      }
    }
  }
});
// Agregar un nuevo manejador IPC para esta función
ipcMain.handle("get-dmp-size-data", async (event, days) => {
  try {
    return await getDmpSizeData(days);
  } catch (error) {
    console.error("Error al obtener datos de tamaño DMP:", error);
    throw error;
  }
});
ipcMain.handle("get-verification-history", async (event, date) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(`
      SELECT 
        lb.id, 
        lb.executionDate, 
        lb.horaINI, 
        lb.horaFIN, 
        lb.duration, 
        lb.success, 
        lb.dumpFileSize, 
        si.ServerName, -- Nombre del servidor desde ServerInfo
        lb.serverName AS osType, -- SO desde LogBackup
        lb.logFileName, 
        lb.ip, 
        lb.backupPath, 
        lb.totalFolderSize, 
        lb.backupStatus, 
        DBMS_LOB.SUBSTR(lb.groupControlInfo, 4000, 1) AS groupControlInfo,
        DBMS_LOB.SUBSTR(lb.oraErrorMessage, 4000, 1) AS oraErrorMessage
      FROM 
        LogBackup lb
      JOIN 
        ServerInfo si ON lb.ip = si.IP
      WHERE 
        TRUNC(lb.executionDate) = TO_DATE(:selectedDate, 'YYYY-MM-DD')
      
      UNION ALL
      
      SELECT 
        rbl.rmanID AS id,
        rbl.executionDate,
        rbl.fecha_inicio AS horaINI,
        rbl.fecha_fin AS horaFIN,
        rbl.duracion AS duration,
        CASE WHEN rbl.estado_backup = 'Éxito' THEN 1 ELSE 0 END AS success,
        NULL AS dumpFileSize,
        rbl.servidor AS ServerName,
        NULL AS osType,
        rbl.logFileName AS logFileName,
        rbl.ip,
        rbl.ruta_backup AS backupPath,
        NULL AS totalFolderSize,
        rbl.estado_backup AS backupStatus,
        DBMS_LOB.SUBSTR(rbl.error_message, 4000, 1) AS groupControlInfo,
        DBMS_LOB.SUBSTR(rbl.error_message, 4000, 1) AS oraErrorMessage
      FROM 
        rman_backup_logs rbl
      WHERE 
        TRUNC(rbl.executionDate) = TO_DATE(:selectedDate, 'YYYY-MM-DD')
      
      ORDER BY 
        executionDate DESC
    `, { selectedDate: date 
      },
      {
        fetchInfo: {
          groupControlInfo: { type: oracledb.STRING },
          oraErrorMessage: { type: oracledb.STRING }
        }}
    );

    return result.rows.map((row) => ({
      id: row[0],
      executionDate: row[1],
      horaINI: row[2],
      horaFIN: row[3],
      duration: row[4],
      success: row[5],
      dumpFileSize: row[6],
      serverName: row[7],
      osType: row[8],
      logFileName: row[9],
      ip: row[10],
      backupPath: row[11],
      totalFolderSize: row[12],
      backupStatus: row[13],
      groupControlInfo: row[14],
      oraErrorMessage: String(row[15] || "Sin errores")
    }));
  } catch (error) {
    console.error("Error al obtener el historial de verificaciones:", error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error("Error al cerrar la conexión a la base de datos:", error);
      }
    }
  }
});
function formatOracleDate(date) {
  if (!date || isNaN(date.getTime())) {
    throw new Error("La fecha proporcionada no es válida");
  }
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  // Use template literals correctly
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
function extractRmanLogDetails(logContent) {
  const logDetails = {
    fechaInicio: null,
    fechaFin: null,
    duracion: "00:00:00",
    estadoBackup: 'Éxito',  // Suponemos éxito hasta que se encuentre un error
    rutaBackup: null,
    errorMessage: null,
  };

  const startDateRegex = /Recovery Manager: Release.*on (\w{3}) (\w{3}) (\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\d{4})/;
  const elapsedRegex = /elapsed time: ([\d:]+)/g;
  const pathRegex = /piece handle=([\S]+)/;
  const errorRegex = /(ORA-\d+|RMAN-\d+)/;

  const lines = logContent.split('\n').filter(line => line.trim() !== "");
  const cleanedLogContent = lines.join('\n');

  const startMatch = cleanedLogContent.match(startDateRegex);
  if (startMatch) {
    const [, , month, day, hours, minutes, seconds, year] = startMatch;

    // Mapping of month abbreviations
    const months = {
      Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
      Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };

    // Create a date string in a format that new Date() can parse
    const formattedDateString = `${year}-${months[month]}-${day.padStart(2, '0')}T${hours}:${minutes}:${seconds}`;

    const startDate = new Date(formattedDateString);

    // Verify the date is valid
    if (isNaN(startDate.getTime())) {
      console.error("Fecha de inicio no válida:", formattedDateString);
      throw new Error("La fecha proporcionada no es válida");
    }

    logDetails.fechaInicio = formatOracleDate(startDate);
  }

  // Calcular la duración total sumando todos los `elapsed time`
  let totalDuration = [0, 0, 0];  // [horas, minutos, segundos]
  let elapsedMatch;
  while ((elapsedMatch = elapsedRegex.exec(logContent)) !== null) {
    const [hours, minutes, seconds] = elapsedMatch[1].split(":").map(Number);
    totalDuration[0] += hours;
    totalDuration[1] += minutes;
    totalDuration[2] += seconds;
  }

  // Normalizar el tiempo total en formato hh:mm:ss
  totalDuration[1] += Math.floor(totalDuration[2] / 60);
  totalDuration[2] %= 60;
  totalDuration[0] += Math.floor(totalDuration[1] / 60);
  totalDuration[1] %= 60;
  logDetails.duracion = totalDuration.map(unit => String(unit).padStart(2, '0')).join(":");

  // Captura de la ruta del backup
  const pathMatch = logContent.match(pathRegex);
  if (pathMatch) logDetails.rutaBackup = pathMatch[1];
  // Calcular la fecha de fin sumando la duración al inicio
  if (logDetails.fechaInicio && logDetails.duracion !== "00:00:00") {
    const startDate = new Date(logDetails.fechaInicio);
    const durationParts = logDetails.duracion.split(":").map(Number);
    // Sumamos la duración a la fecha de inicio
    startDate.setHours(startDate.getHours() + durationParts[0]);
    startDate.setMinutes(startDate.getMinutes() + durationParts[1]);
    startDate.setSeconds(startDate.getSeconds() + durationParts[2]);

    // La fecha de fin es la fecha de inicio más la duración
    logDetails.fechaFin = formatOracleDate(startDate);
  }

  // Verificar si existen errores en el log
  const errorMatch = logContent.match(errorRegex);
  if (errorMatch) {
    logDetails.estadoBackup = 'Fallo';
    logDetails.errorMessage = errorMatch[0];
  }

  return logDetails;
}
async function saveRmanLogToDatabase(rmanLogDetails, servidor, ip) {
  const { fechaInicio, fechaFin, duracion, estadoBackup, rutaBackup, errorMessage, logFileName } = rmanLogDetails;

  // Crear la conexión a la base de datos Oracle
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig); // Usa la configuración de la base de datos
    // Verificar que las fechas estén en el formato correcto
    const formattedFechaInicio = formatOracleDate(new Date(fechaInicio));
    const formattedFechaFin = formatOracleDate(new Date(fechaFin));
    // Imprimir las fechas para verificar cómo se reciben
    console.log("Fecha de inicio:", formattedFechaInicio);
    console.log("Fecha de fin:", formattedFechaFin);
    // Ejecutar el INSERT en la base de datos
    const result = await connection.execute(
      `INSERT INTO rman_backup_logs 
      (fecha_inicio, fecha_fin, duracion, estado_backup, ruta_backup, error_message, servidor, ip, logFileName) 
      VALUES (TO_DATE(:fechaInicio, 'YYYY-MM-DD HH24:MI:SS'), TO_DATE(:fechaFin, 'YYYY-MM-DD HH24:MI:SS'), :duracion, :estadoBackup, :rutaBackup, :errorMessage, :servidor, :ip, :logFileName)`,
      {
        fechaInicio: formattedFechaInicio,
        fechaFin: formattedFechaFin,
        duracion,
        estadoBackup,
        rutaBackup,
        errorMessage,
        servidor,
        ip,
        logFileName,
      },
      { autoCommit: true } // Asegúrate de que los cambios se guarden automáticamente
    );

    console.log("Detalles del log guardados en la base de datos:", result);

  } catch (err) {
    console.error("Error al guardar los detalles del log en la base de datos:", err);
    throw err;  // Lanzar el error para manejarlo más arriba si es necesario
  } finally {
    if (connection) {
      try {
        await connection.close(); // Cerrar la conexión a la base de datos
      } catch (err) {
        console.error("Error al cerrar la conexión con la base de datos:", err);
      }
    }
  }
}
