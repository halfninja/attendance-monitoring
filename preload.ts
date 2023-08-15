import { PathLike } from "fs-extra";
import { CardData } from './types';
import { ipcRenderer, contextBridge, SerialPortRevokedDetails } from 'electron';
import { SerialPort } from 'serialport';
import { unparse } from 'papaparse';

let dataPair: Array<string> = [];
let formattedData: Array<CardData> = [];
// @ts-ignore
let cardReaders: Array<PortInfo> = [];

const genFilePath = () => {
    ipcRenderer.send('genFilePath');
    const promise: Promise<PathLike> = new Promise((resolve, reject) => {
        ipcRenderer.on('genFilePath-reply', (event, args) => {
            resolve(args)
        });
    });
    return promise;
};

const handleData = (data: CardData) => {
    // return on error
    if (data.error !== '') return alert(`The last card scanned failed with the following reason:\n${data.error} \n\nPlease try again.`);
    data.timestamp = new Date().toLocaleString();
    
    // write the csv header to the file if it doesn't exist
    if (formattedData.length == 0) {
        const csvHeader = '"serialNumber","universityNumber","issueNumber","startDate","error","timestamp"';
        ipcRenderer.send('writeCsv', csvHeader + '\n');
    }
    // compare the serial number and university number to the last entry in the array, if they are the same data (prevents rapid duplicate entries)
    if (data.serialNumber == formattedData[formattedData.length - 1]?.serialNumber && data.universityNumber == formattedData[formattedData.length - 1]?.universityNumber) return;

    // convert the json to csv and write to the file
    const asCSV: string = unparse([data], { quotes: true, header: false }) + '\n';  // example of data: "d477747c","4109496","04","26/05/22","","27/06/1987 12:00:00"
    ipcRenderer.send('writeCsv', asCSV);
    // push the data to the array for other functions to use
    formattedData.push(data);
};

const renderAttendanceView = async () => {
    const filePath: PathLike = await genFilePath();
    document.querySelector('#main').innerHTML = `
        <div class="attendance-view">
            <h1>Attendance Monitoring for ${sessionStorage.getItem('location')}</h1>
            <h1>Data stored in ${filePath}</h1>
            <div class="attendance-view_columns">
            <div id="attendance-view_timestamp"><p>Timestamp</p></div>
            <div id="attendance-view_universityId"><p>University ID</p></div>
            <div id="attendance-view_issueNumber"><p>Issue Number</p></div>
            <div id="attendance-view_serialNumber"><p>Serial Number</p></div>
        </div>
    `;

    // if mock data is enabled, add a form to inject mock data
    if (sessionStorage.getItem('mock') == 'true') {
        const element = document.createElement('form');
        element.innerHTML = `
            <input type="text" id="timestampInput" placeholder="Timestamp...">
            <input type="text" id="universityIdInput" placeholder="University ID...">
            <input type="text" id="issueNumberInput" placeholder="Issue Number...">
            <input type="text" id="serialNumberInput" placeholder="Serial Number...">
            <input type="text" id="errorInput" placeholder="Error...">
            <input type="submit" value="Inject Mock Data">
        `;
        document.querySelector('.attendance-view').appendChild(element);

        element.addEventListener('submit', (event) => {
            event.preventDefault();
            const timestampElement = document.getElementById('timestampInput') as HTMLInputElement;
            const universityIdElement = document.getElementById('universityIdInput') as HTMLInputElement;
            const issueNumberElement = document.getElementById('issueNumberInput') as HTMLInputElement;
            const serialNumberElement = document.getElementById('serialNumberInput') as HTMLInputElement;
            const errorElement = document.getElementById('errorInput') as HTMLInputElement;

            const data: CardData = {
                timestamp: timestampElement.value,
                universityNumber: universityIdElement.value,
                issueNumber: issueNumberElement.value,
                serialNumber: serialNumberElement.value,
                error: errorElement.value,
            };

            handleData(data);
        });
    }

    // every 500ms check if the data has changed and update if it has
    setInterval(() => {
        if (document.getElementById('attendance-view_timestamp').childElementCount - 1 !== formattedData.length) {
            const timestampElement = document.createElement('p');
            timestampElement.innerHTML = formattedData[formattedData.length - 1].timestamp;
            document.getElementById('attendance-view_timestamp').appendChild(timestampElement);
            const universityIdElement = document.createElement('p');
            universityIdElement.innerHTML = formattedData[formattedData.length - 1].universityNumber;
            document.getElementById('attendance-view_universityId').appendChild(universityIdElement);
            const issueNumberElement = document.createElement('p');
            issueNumberElement.innerHTML = formattedData[formattedData.length - 1].issueNumber;
            document.getElementById('attendance-view_issueNumber').appendChild(issueNumberElement);
            const serialNumberElement = document.createElement('p');
            serialNumberElement.innerHTML = formattedData[formattedData.length - 1].serialNumber;
            document.getElementById('attendance-view_serialNumber').appendChild(serialNumberElement);
        }
    }, 500);
};

const renderLocationView = () => {
    document.querySelector('#main').innerHTML = `
        <form id="locationForm">
            <input class="locationFormInput" type="text" id="locationInput" placeholder="Your Location...">
            <p id="inputError"></p>
            <input class="submitButton" type="submit" value="Continue">
        </form>
    `;
    document.getElementById('locationInput').focus();

    document.getElementById('locationForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const locationElement = document.getElementById('locationInput') as HTMLInputElement;
        if (locationElement.value == '') {
            locationElement.animate({
                translate: ['0px', '20px', '-20px', '0px'],
                easing: ['ease-in-out'],
            }, 500);
            document.getElementById('inputError').innerText = 'Location must be at least one character.';
            return;
        }
        sessionStorage.setItem('location', locationElement.value);
        renderAttendanceView();
    });
};

const startConnection = (path: string) => {
    // Create the serial port
    const port = new SerialPort({
        path: path,
        baudRate: 115200,
    })
    port.on('error', (err) => {
        console.error(err);
        alert(`Something went wrong with the reader:\n${err}\n\nPlease try again or select a different device`);
        return location.reload();
    })    
    
    port.on('data', (data: string) => {
        // example of data: {"serialNumber":"d477747c","universityNumber":"4109496","is. Looks like either the first or second half of a json object

        if (sessionStorage.getItem('location') == null) return;
        if (!data.includes('{') && !data.includes('}')) return;
        // prevents weird error that drove me insane :)
        if (data.includes('SW_CPU_RESET')) return dataPair = [];
        
        dataPair.push(data);
    
        // join the two json halves and push to formattedData array
        if (dataPair.length === 2) {
            // join the two halves 
            let JoinedData: string = dataPair[0] + dataPair[1]; // example of data: '{"serialNumber":"d477747c","universityNumber":"4109496","issueNumber":"04","startDate":""26/05/22"","error":""}'
            let parsedJoinedData: CardData;

            // reset the data pair
            dataPair = [];
            // attempt to parse the data, if it fails it means the halves weren't json and will return
            try {
                parsedJoinedData = JSON.parse(JoinedData);
            } catch (err) {
                console.error(err);
                return alert(`The last card scanned failed with the following reason:\n${err} \n\nPlease try again.`);
            }

            handleData(parsedJoinedData);
        }
    });
}

const setupConnection =  async () => {
    // Get a list of all the connected serial devices
    const serialPorts = await SerialPort.list();
    
    // Check which ones are card readers based on manufacturer
    serialPorts.forEach((port) => {
        if (port.manufacturer == 'wch.cn') {
            cardReaders.push(port);
        }
    })

    // If we found no card readers alert the user 
    if (cardReaders.length == 0) {
        alert('We couldn\'t find any card readers\nAre there any plugged in?');
    }

    // If there's only one reader, just start the connection
    if (cardReaders.length == 1) {
            startConnection(cardReaders[0].path)
            return renderLocationView();
    }

    // If we did find card readers, add them to the drop-down 
    cardReaders.forEach((cardReader) => {
        const element = document.createElement('option');
        element.value = cardReader.path;
        element.innerText = cardReader.friendlyName;
        document.getElementById('usbSelector').appendChild(element);
    })

    // If there's more than one reader, prompt the user to select one
    document.getElementById('usbSelectorButton').addEventListener(('click'), () => {
        const element = document.getElementById('usbSelector') as HTMLInputElement;
        const path: string = element.value;
        if (path == '') {
            document.getElementById('inputError').innerText = 'Location must be at least one character.';
            return setupConnection();
        }
        if (path == 'mock') {
            sessionStorage.setItem('mock', 'true');
            return renderLocationView();
        }
        startConnection(path);
        return renderLocationView();
    })
};


// give the main window access to the contextBridge
contextBridge.exposeInMainWorld('electron', {
    formattedData: () => {return formattedData;},
    cardReaders: () => {return cardReaders},
})

setupConnection();