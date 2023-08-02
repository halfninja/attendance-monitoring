const { ipcRenderer, contextBridge } = require('electron')
const { getDeviceList } = require('usb');
const { SerialPort } = require('serialport');
const Papa = require('papaparse');

localStorage.clear();

let dataPair = [];
let formattedData = [];

// Create the serial port
const port = new SerialPort({
    path: 'COM4',
    baudRate: 115200,
})
port.on('error', (err) => {
    console.error(err)
})

// give the main window access to the contextBridge
contextBridge.exposeInMainWorld('electron', {
    getDeviceList: getDeviceList,
    formattedData: () => {return formattedData;},
    genFilePath: () => {
        ipcRenderer.send('genFilePath');
        const promise = new Promise((resolve, reject) => {
            ipcRenderer.on('genFilePath-reply', (event, args) => {
                resolve(args)
            });
        });
        return promise;
    },
    saveAndClose: () => {
        // format the json data to csv data
        let csv = Papa.unparse(formattedData, { quotes: true });
        // send the csv data to the main process and request a window close
        ipcRenderer.send('save-and-close', csv);
    },
})

port.on('data', (data) => {
    if (localStorage.getItem('location') == null) return;
    // place the two json halves in the dataPair array
    if (data.toString().includes('{') || data.toString().includes('}')) {
        dataPair.push(data.toString());
    }
    // join the two json halves and push to formattedData array
    if (dataPair.length === 2) {
        let joinedData = dataPair[0] + dataPair[1];
        dataPair = [];
        joinedData = JSON.parse(joinedData);
        // !weird bug here
        // if (joinedData.error == '') throw alert('error');
        joinedData.timestamp = new Date().toLocaleString();
        formattedData.push(joinedData);
    }
    if (formattedData.length > 1) {
        // check if the current card scan is the same as the last card scanned (more efficient but may let duplicate cards scans through)
        if (formattedData[formattedData.length - 1].serialNumber == formattedData[formattedData.length - 2].serialNumber && formattedData[formattedData.length - 1].universityNumber == formattedData[formattedData.length - 2].universityNumber) {
            formattedData.pop();
        }
        // check current card against all previous cards (slower but wont let duplicate cards though)
        // for (let i = 0; i < formattedData.length; i++) {
        //     if (formattedData[i].serialNumber == formattedData[formattedData.length - 1].serialNumber && formattedData[i].universityNumber == formattedData[formattedData.length - 1].universityNumber) {
        //         formattedData.pop();
        //     }
        // }
    }
});