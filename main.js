const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { saveLocation } = require('./config.json')

let filePath;

// Allow only one instance of the app
let isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
    app.quit()
};

const generateFilePath = async () => {
    const date = new Date();
    let day = date.getDate();
    let month = date.getMonth() + 1;
    let year = date.getFullYear();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    let location;
    
    await mainWindow.webContents
    .executeJavaScript('sessionStorage.getItem("location");', true)
    .then(result => {location = result;});
    let fileName = `${day}-${month}-${year}-${hours}-${minutes}-${location}-${uuidv4()}.csv`;
    let filePath = path.join(saveLocation, fileName);
    return filePath;
}

let mainWindow;
const loadMainWindow = () => {
    // create the main window
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        resizable: true,
        width: 800,
        height: 600,
        minHeight: 500,
        minWidth: 700,
        maxWidth: 900,
        maxHeight: 700,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            devTools: !app.isPackaged,
            preload: path.join(__dirname, '/src/preload.js'),
        },
    });
    mainWindow.loadFile(path.join(__dirname, '/src/index.html'));

    ipcMain.on('writeCsv', async (event, arg) => {
        fs.appendFile(filePath, arg).catch(err => {
            console.error(err);
            dialog.showErrorBox(`Error: Can't write', 'Something went wrong with writing to the file:\n${err}\n\nIf you have it open please close it and try again`); 
            return location.reload();
        });
    })
    ipcMain.on('genFilePath', async (event) => {
        filePath = await generateFilePath()
        event.reply('genFilePath-reply', filePath);

    })
}


app.on('ready', async () => {
    loadMainWindow();
    app.setAsDefaultProtocolClient('attendance-monitoring');
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        loadMainWindow();
    }
});

app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
    }
});