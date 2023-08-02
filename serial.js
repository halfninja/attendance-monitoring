const { SerialPort } = require('serialport');
const  fs = require('fs-extra');

let dataPair = [];
let formattedData = [];

// Create a port
const port = new SerialPort({
    path: 'COM4',
    baudRate: 115200,
})
port.on('error', (err) => {
    console.error(err)
})

port.on('data', (data) => {
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
})