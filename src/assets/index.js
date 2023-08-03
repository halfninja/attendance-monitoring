const renderAttendanceView = async () => {
    let filePath = await electron.genFilePath();
    const main = document.querySelector('#main');
    main.innerHTML = `
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
    // every 500ms check if the data has changed and update if it has
    setInterval(() => {
        if (document.getElementById('attendance-view_timestamp').childElementCount - 1 !== electron.formattedData().length) {
            const timestampElement = document.createElement('p');
            timestampElement.innerHTML = electron.formattedData()[electron.formattedData().length - 1].timestamp;
            document.getElementById('attendance-view_timestamp').appendChild(timestampElement);
            const universityIdElement = document.createElement('p');
            universityIdElement.innerHTML = electron.formattedData()[electron.formattedData().length - 1].universityNumber;
            document.getElementById('attendance-view_universityId').appendChild(universityIdElement);
            const issueNumberElement = document.createElement('p');
            issueNumberElement.innerHTML = electron.formattedData()[electron.formattedData().length - 1].issueNumber;
            document.getElementById('attendance-view_issueNumber').appendChild(issueNumberElement);
            const serialNumberElement = document.createElement('p');
            serialNumberElement.innerHTML = electron.formattedData()[electron.formattedData().length - 1].serialNumber;
            document.getElementById('attendance-view_serialNumber').appendChild(serialNumberElement);
        }
    }, 500);
}

window.onbeforeunload = () => {
    // prevent window from closing
    event.returnValue = false;
    // ask the renderer process to save the data
    electron.saveAndClose();
}

const locationSubmit = async () => {
    const locationElement = document.getElementById('locationInput');
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
}

const displayError = (message) => {
    console.log(message);
}

document.getElementById('locationInput').focus();