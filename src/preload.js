const { ipcRenderer, contextBridge } = require('electron')
const { getDeviceList } = require('usb');
const { SerialPort } = require('serialport');
const Papa = require('papaparse');

localStorage.clear();

let dataPair = [];
let formattedData = [];
let previous;

// Create a port
const port = new SerialPort({
    path: 'COM4',
    baudRate: 115200,
})
port.on('error', (err) => {
    console.error(err)
})

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: ipcRenderer,
    getDeviceList: getDeviceList,
    formattedData: () => {return formattedData;},
})

port.on('data', (data) => {
    if (localStorage.getItem('location') == null) return;
    if (data.toString().includes('{') || data.toString().includes('}')) {
        dataPair.push(data.toString());
    }
    if (dataPair.length === 2) {
        let joinedData = dataPair[0] + dataPair[1];
        let timestamp = new Date().toLocaleString();
        joinedData = JSON.parse(joinedData);
        joinedData.timestamp = timestamp;
        dataPair = [];
        formattedData.push(joinedData);
    }
    if (formattedData.length > 1) {
        if (formattedData[formattedData.length - 1].serialNumber == formattedData[formattedData.length - 2].serialNumber && formattedData[formattedData.length - 1].universityNumber == formattedData[formattedData.length - 2].universityNumber) {
            formattedData.pop();
        }
    }
    if (formattedData.length > 0) {
        ipcRenderer.send('debug', formattedData);
        let csv = Papa.unparse(formattedData, { quotes: true });
        if (previous != csv) {
            previous = csv;
            ipcRenderer.send('data', csv);
        }
    }
})