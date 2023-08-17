import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { saveLocation } from './config.json';
import { appendFile } from 'fs-extra';
import { CardData } from "./types";
import { unparse } from "papaparse";
import { SerialPort } from 'serialport';

let dataPair: Array<string> = [];
export let formattedData: Array<CardData> = [];
// @ts-ignore
export let cardReaders: Array<PortInfo> = [];

// Generate file path
export const generateFilePath = async () => {
    const date: Date = new Date();
    const day: number = date.getDate();
    const month: number = date.getMonth() + 1;
    const year: number = date.getFullYear();
    const hours: number = date.getHours();
    const minutes: number = date.getMinutes();
    let location: string | null = window.sessionStorage.getItem("location");

    const fileName: string = `${day}-${month}-${year}-${hours}-${minutes}-${location}-${uuidv4()}.csv`;
    const filePath: string = path.join(saveLocation, fileName);
    return filePath;
}

export const appendCSVFile = async (data: string, formattedDataLength: number) => {
    // write the csv header to the file if it doesn't exist
    if (formattedDataLength == 1) {
        const csvHeader = '"serialNumber","universityNumber","issueNumber","startDate","error","timestamp"';
        appendFile(window.sessionStorage.getItem('filePath'), csvHeader + '\n').catch(err => {
            console.error(err);
            window.alert(`Something went wrong with writing to the file:\n${err}\n\nIf you have it open please close it and try again`);
            return window.location.reload();
        });
    }
    // write the data to the file
    appendFile(window.sessionStorage.getItem('filePath'), data).catch(err => {
        console.error(err);
        window.alert(`Something went wrong with writing to the file:\n${err}\n\nIf you have it open please close it and try again`);
        return window.location.reload();
    });
    return true;
}

export const handleData = (data: CardData, formattedData: Array<CardData>) => {
    // return on error
    if (data.error !== '') return alert(`The last card scanned failed with the following reason:\n${data.error}\n\nPlease try again.`);
    data.timestamp = new Date().toLocaleString();
    
    // compare the serial number and university number to the last entry in the array, if they are the same data (prevents rapid duplicate entries)
    if (data.serialNumber == formattedData[formattedData.length - 1]?.serialNumber && data.universityNumber == formattedData[formattedData.length - 1]?.universityNumber) return;

    // convert the json to csv and write to the file
    const asCSV: string = unparse([data], { quotes: true, header: false });  // example of data: "d477747c","4109496","04","26/05/22","","27/06/1987 12:00:00"
    // push the data to the array for other functions to use
    formattedData.push(data);

    return appendCSVFile(asCSV + '\n', formattedData.length);
};


const renderAttendanceView = async (formattedData: Array<CardData>) => {
    document.querySelector('#main')!.innerHTML = `
        <div class="attendance-view">
            <h1>Attendance Monitoring for ${window.sessionStorage.getItem('location')}</h1>
            <h1>Data stored in ${window.sessionStorage.getItem('filePath')}</h1>
            <div class="attendance-view_columns">
            <div id="attendance-view_timestamp"><p>Timestamp</p></div>
            <div id="attendance-view_universityId"><p>University ID</p></div>
            <div id="attendance-view_issueNumber"><p>Issue Number</p></div>
            <div id="attendance-view_serialNumber"><p>Serial Number</p></div>
        </div>
    `;

    // if mock data is enabled, add a form to inject mock data
    if (window.sessionStorage.getItem('mock') == 'true') {
        const element = document.createElement('form');
        element.innerHTML = `
            <input type="text" id="timestampInput" placeholder="Timestamp...">
            <input type="text" id="universityIdInput" placeholder="University ID...">
            <input type="text" id="issueNumberInput" placeholder="Issue Number...">
            <input type="text" id="serialNumberInput" placeholder="Serial Number...">
            <input type="text" id="errorInput" placeholder="Error...">
            <input type="submit" value="Inject Mock Data">
        `;
        document.querySelector('.attendance-view')!.appendChild(element);

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

            handleData(data, formattedData);
        });
    }

    // every 500ms check if the data has changed and update if it has
    setInterval(() => {
        if (document.getElementById('attendance-view_timestamp')!.childElementCount - 1 !== formattedData.length) {
            const timestampElement = document.createElement('p');
            timestampElement.innerHTML = formattedData[formattedData.length - 1].timestamp;
            document.getElementById('attendance-view_timestamp')!.appendChild(timestampElement);
            const universityIdElement = document.createElement('p');
            universityIdElement.innerHTML = formattedData[formattedData.length - 1].universityNumber;
            document.getElementById('attendance-view_universityId')!.appendChild(universityIdElement);
            const issueNumberElement = document.createElement('p');
            issueNumberElement.innerHTML = formattedData[formattedData.length - 1].issueNumber;
            document.getElementById('attendance-view_issueNumber')!.appendChild(issueNumberElement);
            const serialNumberElement = document.createElement('p');
            serialNumberElement.innerHTML = formattedData[formattedData.length - 1].serialNumber;
            document.getElementById('attendance-view_serialNumber')!.appendChild(serialNumberElement);
        }
    }, 500);
};

const renderLocationView = (formattedData: Array<CardData>) => {
    document.querySelector('#main')!.innerHTML = `
        <form id="locationForm">
            <input class="locationFormInput" type="text" id="locationInput" placeholder="Your Location...">
            <p id="inputError"></p>
            <input class="submitButton" type="submit" value="Continue">
        </form>
    `;
    document.getElementById('locationInput')!.focus();

    document.getElementById('locationForm')!.addEventListener('submit', async (event) => {
        event.preventDefault();
        const locationElement = document.getElementById('locationInput') as HTMLInputElement;
        if (locationElement.value == '') {
            locationElement.animate({
                translate: ['0px', '20px', '-20px', '0px'],
                easing: ['ease-in-out'],
            }, 500);
            document.getElementById('inputError')!.innerText = 'Location must be at least one character.';
            return;
        }
        window.sessionStorage.setItem('location', locationElement.value);

        window.sessionStorage.setItem('filePath', await generateFilePath());
        renderAttendanceView(formattedData);
    });
};

export const startConnection = (path: string) => {
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

            handleData(parsedJoinedData, formattedData);
        }
    });
}

export const setupConnection =  async () => {
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
        window.alert('We couldn\'t find any card readers\nAre there any plugged in?');
    }

    // If there's only one reader, just start the connection
    if (cardReaders.length == 1) {
            startConnection(cardReaders[0].path)
            return renderLocationView(formattedData);
    }

    // If we did find card readers, add them to the drop-down 
    cardReaders.forEach((cardReader) => {
        const element = document.createElement('option');
        element.value = cardReader.path;
        element.innerText = cardReader.friendlyName;
        document.getElementById('usbSelector')!.appendChild(element);
    })

    // If there's more than one reader, prompt the user to select one
    document.getElementById('usbSelectorButton')!.addEventListener(('click'), () => {
        const element = document.getElementById('usbSelector') as HTMLInputElement;
        const path: string = element.value;
        if (path == '') {
            document.getElementById('inputError')!.innerText = 'Location must be at least one character.';
            return setupConnection();
        } else if (path == 'mock') {
            sessionStorage.setItem('mock', 'true');
        } else {
            startConnection(path);
        }
        return renderLocationView(formattedData);
    })
};