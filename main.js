const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getDeviceList } = require('usb');
const fs = require('fs-extra');

require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
});

let isSingleInstance = app.requestSingleInstanceLock()
if (!isSingleInstance) {
    app.quit()
};

const loadMainWindow = () => {
    const mainWindow = new BrowserWindow({
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
    mainWindow.webContents.openDevTools();
    ipcMain.on('get-usb-devices', (event, arg) => {
        const devices = getDeviceList();
        event.reply('get-usb-devices-reply', devices);
    });
    ipcMain.on('data', (event, arg) => {
        fs.writeFileSync(path.join(__dirname, '/data.csv'), arg, (err) => {
            if (err) throw err;
        });
        console.log(arg);
    });
    ipcMain.on('debug', (event, arg) => {
        console.log('DEBUG: ', arg);
    });
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