const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDeviceList } = require('usb');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { saveLocation } = require('./config.json')

// for development
require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

// Allow only one instance of the app
let isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
    app.quit()
};

let mainWindow;

const loadMainWindow = () => {
    // create the main window
    mainWindow = new BrowserWindow({
        autoHideMenuBar: true,
        resizable: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            devTools: !app.isPackaged,
            preload: path.join(__dirname, '/src/preload.js'),
        },
    });
    mainWindow.loadFile(path.join(__dirname, '/src/index.html'));
    // for development
    mainWindow.webContents.openDevTools(); 

    ipcMain.on('save-and-close', async (event, arg) => {
        const date = new Date();
        let day = date.getDate();
        let month = date.getMonth() + 1;
        let year = date.getFullYear();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let location;
        
        await mainWindow.webContents
        .executeJavaScript('localStorage.getItem("location");', true)
        .then(result => {location = result;});

        const generateFilePath = () => {
            let fileName = `${day}-${month}-${year}-${hours}-${minutes}-${location}-${uuidv4()}.csv`;
            let filePath = path.join(saveLocation, fileName);
            if (fs.existsSync(filePath)) {
                filePath = generateFilePath()
            }
            return filePath;
        }
        
        let filePath = generateFilePath();
        
        console.log(filePath);
        await fs.writeFile(filePath, arg);
        // force destroy the window to prevent the "onbeforeunload" event from being emitted
        mainWindow.destroy();
    });
}


app.on('ready', async () => {
    loadMainWindow();
    app.setAsDefaultProtocolClient('attendance-monitoring');
});
app.on('window-all-closed', (e) => {
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