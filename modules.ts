import { dialog } from "electron";
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { saveLocation } from './config.json';
import * as fs from 'fs-extra';
import { CardData } from "./types";
import { unparse } from "papaparse";


// Generate file path
export const generateFilePath = async () => {
    const date: Date = new Date();
    const day: number = date.getDate();
    const month: number = date.getMonth() + 1;
    const year: number = date.getFullYear();
    const hours: number = date.getHours();
    const minutes: number = date.getMinutes();
    let location: string = sessionStorage.getItem("location");

    const fileName: string = `${day}-${month}-${year}-${hours}-${minutes}-${location}-${uuidv4()}.csv`;
    const filePath: string = path.join(saveLocation, fileName);
    return filePath;
}

export const appendCSVFile = async (data: string, filePath: string) => {
    fs.appendFile(filePath, data).catch(err => {
        console.error(err);
        dialog.showErrorBox('Error: Can\'t write', `Something went wrong with writing to the file:\n${err}\n\nIf you have it open please close it and try again`);
        return location.reload();
    });

}

export const handleData = (data: CardData, formattedData: Array<CardData>, filePath: string) => {
    // return on error
    if (data.error !== '') return alert(`The last card scanned failed with the following reason:\n${data.error} \n\nPlease try again.`);
    data.timestamp = new Date().toLocaleString();
    
    // write the csv header to the file if it doesn't exist
    if (formattedData.length == 0) {
        const csvHeader = '"serialNumber","universityNumber","issueNumber","startDate","error","timestamp"';
        appendCSVFile(csvHeader + '\n', filePath);
    }
    // compare the serial number and university number to the last entry in the array, if they are the same data (prevents rapid duplicate entries)
    if (data.serialNumber == formattedData[formattedData.length - 1]?.serialNumber && data.universityNumber == formattedData[formattedData.length - 1]?.universityNumber) return;

    // convert the json to csv and write to the file
    const asCSV: string = unparse([data], { quotes: true, header: false });  // example of data: "d477747c","4109496","04","26/05/22","","27/06/1987 12:00:00"
    appendCSVFile(asCSV + '\n', filePath);
    // push the data to the array for other functions to use
    formattedData.push(data);
};


export const renderAttendanceView = async (filePath: string, formattedData: Array<CardData>) => {
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

            handleData(data, formattedData, filePath);
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
