const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { Client } = require("ssh2");
const oracledb = require("oracledb");
const { Console } = require("console");

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

  // Agregar logs para depuración
  console.log(`Original Directory Path: ${directoryPath}`);
  console.log(`Filename: ${filename}`);
  console.log(`Joined Path: ${joinedPath}`);
  console.log(`Normalized Path: ${normalizedPath}`);

  return normalizedPath;
}

// Configuración de conexión a la base de datos
const dbConfig = {
  user: "USRMONBK",
  password: "USRMONBK_2024",
  connectString: "10.0.211.58:1521/MONBKPDB.cmac-arequipa.com.pe",
};
let mainWindow;
// Crea una ventana de aplicación
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
    },
  });

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
      const isConnected = await checkConnection(ip, port, username, password);
      return isConnected;
    }
  );

  ipcMain.handle(
    "get-log-details",
    async (
      event,
      { directoryPath, ip, port, username, password, targetOS }
    ) => {
      let logDetails = null;
      let dumpFileInfo = null;

      try {
        console.log(`Fetching log details from directory: ${directoryPath}`);

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

        // Read directory and files
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
            console.log("Files in directory:", files); // Log of files in the directory
            resolve(files);
          });
        });

        // Filter and get the latest log file
        const logFiles = files.filter(
          (file) => path.extname(file.filename) === ".log"
        );
        console.log("Log files found:", logFiles); // Log of log files found

        if (logFiles.length === 0) {
          sftp.end();
          conn.end();
          return { logDetails: null, dumpFileInfo: null };
        }

        const latestLogFile = logFiles.reduce((latest, file) =>
          file.attrs.mtime > latest.attrs.mtime ? file : latest
        );
        const logFilePath = joinPath(
          directoryPath,
          latestLogFile.filename,
          targetOS
        );
        console.log("Attempting to read log file:", logFilePath); // Log of the log file path

        // Check if the log file exists
        await new Promise((resolve, reject) => {
          sftp.stat(logFilePath, (err, stats) => {
            if (err) {
              console.error("Stat error:", err);
              sftp.end();
              conn.end();
              return reject(
                new Error(
                  `Failed to stat log file at ${logFilePath}: ${err.message}`
                )
              );
            }
            resolve(stats);
          });
        });

        // Read the log file
        const logData = await new Promise((resolve, reject) => {
          sftp.readFile(logFilePath, "utf8", (err, data) => {
            if (err) {
              console.error("ReadFile error:", err);
              sftp.end();
              conn.end();
              return reject(
                new Error(
                  `Failed to read log file at ${logFilePath}: ${err.message}`
                )
              );
            }
            resolve(data);
          });
        });
        // Parse the log file
        logDetails = parseLogLine(logData);
        //console.log(logData)

        //const logLines = logData.trim().split("\n");
        //const lastLine = logLines[logLines.length - 1];
        //logDetails = parseLogLine(lastLine);

        // Get dump file info
        dumpFileInfo = await new Promise((resolve, reject) => {
          sftp.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Readdir error:", err);
              sftp.end();
              conn.end();
              return reject(
                new Error(
                  `Failed to read directory for dump file: ${err.message}`
                )
              );
            }

            const dumpFiles = files.filter((file) =>
              [".DMP", ".dmp"].includes(
                path.extname(file.filename).toUpperCase()
              )
            );

            if (dumpFiles.length === 0) {
              resolve(null);
            } else {
              const latestDumpFile = dumpFiles.reduce((latest, file) =>
                file.attrs.mtime > latest.attrs.mtime ? file : latest
              );
              const dumpFilePath = joinPath(
                directoryPath,
                latestDumpFile.filename,
                targetOS
              );

              sftp.stat(dumpFilePath, (err, stats) => {
                if (err) {
                  console.error("Stat error:", err);
                  sftp.end();
                  conn.end();
                  return reject(
                    new Error(
                      `Failed to stat dump file at ${dumpFilePath}: ${err.message}`
                    )
                  );
                }

                const dumpFileSizeInBytes = stats.size;
                const dumpFileSizeInMB = (
                  dumpFileSizeInBytes /
                  (1024 * 1024)
                ).toFixed(2);

                resolve({
                  filePath: dumpFilePath,
                  fileSize: parseFloat(dumpFileSizeInMB),
                });
              });
            }
          });
        });
        
        sftp.end();
        conn.end();
      } catch (error) {
        console.error("Error fetching log details:", error);
        return { logDetails: null, dumpFileInfo: null };
      }

      return {
        logDetails,
        dumpFileInfo,
      };
    }
  );

  async function saveLogToDatabase(logDetails, dumpFileInfo,targetOS) {
    let connection;

    try {
      connection = await oracledb.getConnection(dbConfig);

      if (!logDetails) {
        throw new Error("Log details are missing.");
      }

      const result = await connection.execute(
        `INSERT INTO LogBackup (dateTime, duration, success, dumpFileSize_MB,serverName) VALUES (:dateTime, :duration, :success, :dumpFileSize,:serverName)`,
        {
          dateTime: logDetails.dateTime,
          duration: logDetails.duration,
          success: logDetails.success ? 1 : 0, // Convert boolean to number
          dumpFileSize: dumpFileInfo ? dumpFileInfo.fileSize : null,
          serverName: targetOS // Guarda el nombre del servidor
        },
        { autoCommit: true }
      );

      console.log("Log details saved to database:", result);
    } catch (err) {
      console.error("Error saving log details to database:", err);
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error("Error closing database connection:", err);
        }
      }
    }
  }

  ipcMain.handle(
    "save-log-to-database",
    async (event, { logDetails, dumpFileInfo, targetOS  }) => {
      try {
        await saveLogToDatabase(logDetails, dumpFileInfo, targetOS );
        return { success: true };
      } catch (error) {
        console.error("Error saving log details to database:", error);
        throw error;
      }
    }
  );

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
        console.log("SSH Connection established");
        resolve(conn);
      })
      .on("error", (err) => {
        console.error("SSH Connection error:", err);
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
            reject(new Error(`Exec failed: ${err.message}`));
          }
          stream
            .on("close", (code, signal) => {
              conn.end();
              resolve(true);
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
        resolve(false);
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

// Función existente para obtener el tamaño del archivo DMP
function getDumpFileSize(directoryPath, ip, port, username, password) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.sftp((err, sftp) => {
          if (err) {
            console.error("SFTP error:", err);
            conn.end();
            return reject(err);
          }

          sftp.readdir(directoryPath, (err, files) => {
            if (err) {
              console.error("Readdir error:", err);
              conn.end();
              return reject(err);
            }

            const dumpFiles = files.filter(
              (file) => path.extname(file.filename).toUpperCase() === ".DMP"
            );
            if (dumpFiles.length === 0) {
              conn.end();
              return reject("No .DMP files found in the directory");
            }

            const latestDumpFile = dumpFiles.reduce((latest, file) =>
              file.attrs.mtime > latest.attrs.mtime ? file : latest
            );
            const dumpFilePath = path.join(
              directoryPath,
              latestDumpFile.filename
            );

            sftp.stat(dumpFilePath, (err, stats) => {
              if (err) {
                console.error("Stat error:", err);
                conn.end();
                return reject(err);
              }

              const dumpFileSizeInBytes = stats.size;
              const dumpFileSizeInMB = (
                dumpFileSizeInBytes /
                (1024 * 1024)
              ).toFixed(2);

              conn.end();
              resolve({
                filePath: dumpFilePath,
                fileSize: parseFloat(dumpFileSizeInMB),
              });
            });
          });
        });
      })
      .on("error", (err) => {
        conn.end();
        reject(err);
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

function parseLogLine(logContent) {
  // Define regex patterns
  const oraErrorPattern = /ORA-\d{5}/g; // Matches all ORA errors
  const oraSpecificErrorPattern = /ORA-39327/; // Matches specific ORA error
  const successPattern = /successfully completed/i; // Matches success message

  // Check for specific ORA error and success message
  const hasOraSpecificError = oraSpecificErrorPattern.test(logContent);
  const hasSuccessMessage = successPattern.test(logContent);

  // Determine if the backup is successful
  const isSuccess = hasOraSpecificError || hasSuccessMessage;

  // Extract date and duration
  const datePattern = /(\w{3} \w{3} \d{1,2} \d{2}:\d{2}:\d{2} \d{4})/;
  const dateMatch = logContent.match(datePattern);
  const dateTime = dateMatch ? dateMatch[0] : "N/A";

  const durationPattern = /elapsed (\d{1,2} \d{2}:\d{2}:\d{2})/;
  const durationMatch = logContent.match(durationPattern);
  const duration = durationMatch ? durationMatch[1] : "N/A";

  // Return the parsed log details
  return {
    dateTime,
    duration,
    success: isSuccess ? 1 : 0,
  };
}




async function saveLogToDatabase(logDetails, dumpFileInfo) {
  let connection;

  try {
    connection = await oracledb.getConnection(dbConfig);

    const result = await connection.execute(
      `INSERT INTO LogBackup (dateTime, duration, success, dumpFileSize_MB) VALUES (:dateTime, :duration, :success, :dumpFileSize)`,
      {
        dateTime: logDetails.dateTime,
        duration: logDetails.duration,
        success: logDetails.success ? 1 : 0, // Convert boolean to number
        dumpFileSize: dumpFileInfo ? dumpFileInfo.fileSize : null,
      },
      { autoCommit: true }
    );

    console.log("Log details saved to database:", result);
  } catch (err) {
    console.error("Error saving log details to database:", err);
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing database connection:", err);
      }
    }
  }
}
