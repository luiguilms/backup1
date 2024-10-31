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
    // Obtener el nombre del servidor
    const servers = await getServers(); // Usa la función que ya tienes
    const server = servers.find((s) => s.ip === ip);
    const serverName = server ? server.name : "N/A";
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

        const isBackupComplete = directories.length === 7;
        if (!isBackupComplete) {
          // Agregamos una propiedad para indicar backup incompleto
          allLogDetails.backupIncomplete = true;
          allLogDetails.expectedFolders = 7;
          allLogDetails.foundFolders = directories.length;
        }
        const isBackupVoid = directories.length === 0;
        if (isBackupVoid) {
          // Agregamos una propiedad para indicar backup incompleto
          allLogDetails.backupVoid = true;
        }
        for (const file of files) {
          if (file.attrs.isDirectory()) {
            const subDirPath = joinPath(directoryPath, file.filename, targetOS);
            //console.log(`Processing subdirectory: ${subDirPath}`);
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
                  logInfo = getLast10LogLines(logData);
                  logDetails = parseLogLine(logData);

                  if (logInfo.hasWarning) {
                    const warningMessage = `Se detectó una advertencia de espacio al ${logInfo.warningNumber
                      }% en el servidor ${serverName} (IP: ${ip}).\n\n${logInfo.relevantLines.join(
                        "\n"
                      )}`;
                    await sendEmailAlert(ip, serverName, warningMessage);
                  }
                  logDetails = parseLogLine(logData);
                  const dumpFiles = subDirFiles.filter((file) =>
                    [".DMP", ".dmp", ".dmp.gz", ".dmp.err"].includes(
                      path.extname(file.filename).toUpperCase()
                    )
                  );
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
                        console.log(
                          `Carpeta: ${subDirPath}, Tamaño del archivo ${dumpFile.filename
                          }: ${(dumpStats.size / (1024 * 1024)).toFixed(2)} MB`
                        );

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
                    backupIncomplete: !isBackupComplete,
                    expectedFolders: 7,
                    foundFolders: directories.length,
                    backupVoid: false
                  });
                })
              );
            }
          }
        }
        console.log("Detalles completos de log (incluyendo vacíos):", allLogDetails);
        return allLogDetails;
      } else {
        if (typeof folderSizes !== "number") {
          throw new Error("folderSizes debe ser un número para Linux/Windows.");
        }
        // Logic for other OS (Windows, Linux)
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
              const logInfo = getLast10LogLines(logData);

              if (logInfo.hasWarning) {
                const warningMessage = `Se detectó una advertencia de espacio al ${logInfo.warningNumber
                  }% en el servidor ${serverName} (IP: ${ip}).\n\n${logInfo.relevantLines.join(
                    "\n"
                  )}`;
                await sendEmailAlert(ip, serverName, warningMessage);
              }
              const logDetails = parseLogLine(logData);
              let dumpFileInfo = [];
              const dumpFiles = subDirFiles.filter((file) =>
                [".DMP", ".dmp"].includes(
                  path.extname(file.filename).toUpperCase()
                )
              );
              let totalDmpSize = 0;
              for (const dumpFile of dumpFiles) {
                const dumpFilePath = joinPath(
                  subDirPath,
                  dumpFile.filename,
                  targetOS
                );
                const dumpStats = await new Promise((resolve, reject) => {
                  sftp.stat(dumpFilePath, (err, stats) => {
                    if (err) {
                      console.error("Stat error:", err);
                      sftp.end();
                      conn.end();
                      return reject(
                        new Error(`Failed to stat dump file: ${err.message}`)
                      );
                    }
                    resolve(stats);
                  });
                });
                const dumpFileSizeInMB = dumpStats.size / (1024 * 1024);
                totalDmpSize += dumpFileSizeInMB;
                dumpFileInfo.push({
                  filePath: dumpFilePath,
                  fileSize:
                    dumpFileSizeInMB > 0
                      ? parseFloat(dumpFileSizeInMB.toFixed(2))
                      : 0,
                });
              }
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
            const logInfo = getLast10LogLines(logData);

            if (logInfo.hasWarning) {
              const warningMessage = `Se detectó una advertencia de espacio al ${logInfo.warningNumber
                }% en el servidor ${serverName} (IP: ${ip}).\n\n${logInfo.relevantLines.join(
                  "\n"
                )}`;
              await sendEmailAlert(ip, serverName, warningMessage);
            }
            const logDetails = parseLogLine(logData);
            let dumpFileInfo = [];
            const dumpFiles = files.filter((file) =>
              [".DMP", ".dmp"].includes(
                path.extname(file.filename).toUpperCase()
              )
            );
            let totalDmpSize = 0;
            for (const dumpFile of dumpFiles) {
              const dumpFilePath = joinPath(
                directoryPath,
                dumpFile.filename,
                targetOS
              );
              const dumpStats = await new Promise((resolve, reject) => {
                sftp.stat(dumpFilePath, (err, stats) => {
                  if (err) {
                    console.error("Stat error:", err);
                    sftp.end();
                    conn.end();
                    return reject(
                      new Error(`Failed to stat dump file: ${err.message}`)
                    );
                  }
                  resolve(stats);
                });
              });
              const dumpFileSizeInMB = dumpStats.size / (1024 * 1024);
              totalDmpSize += dumpFileSizeInMB;
              dumpFileInfo.push({
                filePath: dumpFilePath,
                fileSize:
                  dumpFileSizeInMB > 0
                    ? parseFloat(dumpFileSizeInMB.toFixed(2))
                    : 0,
              });
            }
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
      { logDetails, dumpFileInfo, targetOS, logFileName, ip, backupPath }
    ) => {
      try {
        await saveLogToDatabase(
          logDetails,
          dumpFileInfo,
          targetOS,
          logFileName,
          ip,
          backupPath
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
      //console.log("Rutas obtenidas de la base de datos:", result.rows); // Añadir log
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

              if (logDetails && logDetails.backupIncomplete) {
                results.push({
                  serverName,
                  ip,
                  backupPath,
                  warning: `${ip} Backup incompleto en el servidor ${serverName}. Se esperaban 7 carpetas, pero se encontraron ${logDetails.foundFolders}.`,
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
                  warning: `${ip} Una o más carpetas en el servidor ${serverName} están vacías.`,
                  logDetails: logDetails,
                });
                continue;
              }

              // **Guardado en la base de datos** (solo si el log está completo y tiene datos)
              if (Array.isArray(logDetails)) {
                for (const detail of logDetails) {
                  if (detail.logDetails && detail.logDetails.startTime) {
                    const fullBackupPath = detail.backupPath;
                    await saveLogToDatabase(
                      detail.logDetails,
                      detail.dumpFileInfo,
                      osType,
                      detail.logFileName,
                      ip,
                      fullBackupPath
                    );
                  }
                }
              } else if (logDetails && logDetails.logDetails && logDetails.logDetails.startTime) {
                const fullBackupPath = logDetails.backupPath;
                await saveLogToDatabase(
                  logDetails.logDetails,
                  logDetails.dumpFileInfo,
                  osType,
                  logDetails.logFileName,
                  ip,
                  fullBackupPath
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
          console.error(
            `Error procesando el servidor ${serverName}:`,
            serverError
          );
          results.push({
            serverName,
            ip,
            error: serverError.message,
            logDetails: null, // Asegúrate de incluir esto
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
          kex: ["diffie-hellman-group14-sha1", "diffie-hellman-group14-sha256"],
          cipher: ["aes128-ctr", "aes192-ctr", "aes256-ctr"],
          hmac: ["hmac-sha1", "hmac-sha2-256", "hmac-sha2-512"],
        },
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
              resolve(true); // Resolver cuando el comando se cierra correctamente
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
        reject(new Error(`Connection failed: ${err.message}`)); // Rechazar en caso de error de conexión
      })
      .connect({
        host: ip,
        port: port,
        username: username,
        password: password,
        readyTimeout: 3000,    // Timeout de conexión de 3 segundos
        timeout: 3000,         // Timeout general de 3 segundos
        algorithms: {
          kex: ["diffie-hellman-group14-sha1", "diffie-hellman-group14-sha256"],
          cipher: ["aes128-ctr", "aes192-ctr", "aes256-ctr"],
          hmac: ["hmac-sha1", "hmac-sha2-256", "hmac-sha2-512"],
        },
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
function getLast10LogLines(logContent) {
  const lines = logContent.trim().split("\n");
  const warningPattern = /_9[0-9]/;
  let lastWarningNumber = -1;
  let relevantLines = [];

  // Iteramos sobre las últimas 20 líneas para asegurarnos de no perder información relevante
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
    const line = lines[i];
    const match = line.match(warningPattern);
    if (match) {
      const warningNumber = parseInt(match[0].substring(1));
      if (warningNumber > lastWarningNumber) {
        lastWarningNumber = warningNumber;
        relevantLines = [line];
      } else if (warningNumber === lastWarningNumber) {
        relevantLines.unshift(line);
      }
    }
  }

  return {
    relevantLines: relevantLines.slice(0, 10), // Limitamos a 10 líneas relevantes
    hasWarning: lastWarningNumber !== -1,
    warningNumber: lastWarningNumber,
  };
}
function parseLogLine(logContent) {
  const oraErrorPattern = /ORA-\d{5}/g;
  const oraSpecificErrorPattern = /ORA-39327/;
  const successPattern = /successfully completed/i;
  const logInfo = getLast10LogLines(logContent);
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
  let oraError = null;
  for (let i = 0; i < lines.length; i++) {
    if (
      lines[i].match(oraErrorPattern) &&
      !lines[i].match(oraSpecificErrorPattern)
    ) {
      oraError = {
        previousLine: i > 0 ? lines[i - 1].trim() : "",
        errorLine: lines[i].trim(),
        nextLine: i < lines.length - 1 ? lines[i + 1].trim() : "",
      };
      break;
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
  };
}
function formatFileSize(sizeInMB) {
  if (sizeInMB >= 1000) {
    let sizeInGB = (sizeInMB / 1000).toFixed(2);
    return `${sizeInGB} GB`;
  } else {
    return `${sizeInMB} MB`;
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
  backupPath
) {
  if (logDetails?.backupVoid) {
    console.log(`Skipping save for empty backup path: ${backupPath}`);
    return;
  }
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
    if (Array.isArray(dumpFileInfo)) {
      dumpFileInfo.forEach((file) => {
        totalDmpSize += parseFloat(file.fileSize) || 0;
      });
    }
    const formattedFileSize = formatFileSize(totalDmpSize); // Convierte a MB o GB
    // Verifica si dumpFileInfo es un array o un solo objeto y suma los tamaños
    if (Array.isArray(dumpFileInfo)) {
      dumpFileInfo.forEach((file) => {
        if (
          file &&
          file.filePath &&
          file.filePath.toLowerCase().endsWith(".dmp")
        ) {
          //console.log(`Found DMP file: ${file.filePath} with size ${file.fileSize}`);
          const fileSize = parseFloat(file.fileSize);
          if (!isNaN(fileSize)) {
            totalDmpSize += fileSize;
          }
        }
      });
    } else if (
      dumpFileInfo &&
      dumpFileInfo.filePath &&
      dumpFileInfo.filePath.toLowerCase().endsWith(".dmp")
    ) {
      console.log(
        `Found single DMP file: ${dumpFileInfo.filePath} with size ${dumpFileInfo.fileSize}`
      );
      const fileSize = parseFloat(dumpFileInfo.fileSize);
      if (!isNaN(fileSize)) {
        totalDmpSize += fileSize;
      }
    } else {
      console.warn(
        "dumpFileInfo is not a valid object or array:",
        dumpFileInfo
      );
    }
    // Convertimos totalDmpSize a un número con dos decimales si es mayor que 0
    const totalDmpSizeFormatted = totalDmpSize > 0 ? totalDmpSize : null;
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
      `INSERT INTO LogBackup (horaINI, duration, success, dumpFileSize, serverName, logFileName, horaFIN, ip, backupPath) 
        VALUES (
          TO_DATE(:horaINI, 'YYYY-MM-DD HH24:MI:SS'),
          :duration,
          :success,
          :fileSize,
          :serverName,
          :logFileName,
          TO_DATE(:horaFIN, 'YYYY-MM-DD HH24:MI:SS'),
          :ip,
          :backupPath
        )`,
      {
        horaINI: startTime,
        horaFIN: endTime,
        duration: logDetails.duration,
        success: logDetails.success ? 1 : 0,
        fileSize: formattedFileSize, // Guardar el valor con la unidad (MB o GB)
        serverName: targetOS,
        logFileName: logFileName,
        ip: ip,
        backupPath: backupPath,
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
const Mailjet = require("node-mailjet");

const mailjet = new Mailjet({
  apiKey: "e88d0e4474aae45518847e1e2c6b1008",
  apiSecret: "3578348b5eb98121adce82c7a757bc58",
});

async function sendEmailAlert(ip, serverName, message) {
  try {
    const response = await mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: "luiguilmsz3@gmail.com",
            Name: "Monitoreo de Backup",
          },
          To: [
            {
              Email: "igs_llupacca@cajaarequipa.pe",
              Name: "Receptor",
            },
          ],
          Subject: `Alerta de espacio en servidor ${serverName}`,
          TextPart: `Se ha detectado una advertencia de espacio en el servidor ${serverName} (IP: ${ip}).\n\n${message}`,
          HTMLPart: `
            <h3>Alerta de espacio en servidor ${serverName}</h3>
            <p>Se ha detectado una advertencia de espacio en el servidor ${serverName} (IP: ${ip}).</p>
            <h4>Detalles del log:</h4>
            <pre>${message.replace(/\n/g, "<br>")}</pre>
          `,
        },
      ],
    });

    // Verificar el estado de la respuesta
    if (
      response.body &&
      response.body.Messages &&
      response.body.Messages.length > 0
    ) {
      const messageStatus = response.body.Messages[0].Status;
      console.log("Estado del email:", messageStatus);
      console.log("ID del mensaje:", response.body.Messages[0].To[0].MessageID);
      console.log("Email enviado correctamente");
    } else {
      console.log("Respuesta inesperada de Mailjet:", response.body);
    }
  } catch (error) {
    console.error("Error al enviar email:", error.statusCode);
    if (error.response) {
      console.error("Detalles del error:", error.response.body);
    }
  }
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
        l.dumpFileSize
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
