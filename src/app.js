const socket = new WebSocket('ws://localhost:4001');
let satellites = [];

const SPEED_OF_LIGHT = 299792.458;

const calculateDistance = (sentAt, receivedAt) => {
    const timeOfFlight = (receivedAt - sentAt) / 1000;
    return SPEED_OF_LIGHT * timeOfFlight;
};

const trilateration = (satellites) => {
    if (satellites.length < 3) return null;

    const [sat1, sat2, sat3] = satellites.slice(0, 3);

    const A = 2 * (sat2.x - sat1.x);
    const B = 2 * (sat2.y - sat1.y);
    const C = Math.pow(sat1.r, 2) - Math.pow(sat2.r, 2) -
        Math.pow(sat1.x, 2) + Math.pow(sat2.x, 2) -
        Math.pow(sat1.y, 2) + Math.pow(sat2.y, 2);

    const D = 2 * (sat3.x - sat2.x);
    const E = 2 * (sat3.y - sat2.y);
    const F = Math.pow(sat2.r, 2) - Math.pow(sat3.r, 2) -
        Math.pow(sat2.x, 2) + Math.pow(sat3.x, 2) -
        Math.pow(sat2.y, 2) + Math.pow(sat3.y, 2);

    const x = (C * E - F * B) / (E * A - B * D);
    const y = (C * D - A * F) / (B * D - A * E);

    return { x, y };
};

socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    const { id, x, y, sentAt, receivedAt } = data;

    const distance = calculateDistance(sentAt, receivedAt);
    const existingSatellite = satellites.find(sat => sat.id === id);

    if (existingSatellite) {
        Object.assign(existingSatellite, { x, y, r: distance });
    } else {
        satellites.push({ id, x, y, r: distance });
    }

    if (satellites.length > 3) {
        satellites = satellites.slice(-3);
    }

    const objectPosition = trilateration(satellites);
    if (objectPosition) {
        graphUpdate(objectPosition);
    }
});

const graphUpdate = (objectPosition) => {
    Plotly.react('graph', [
        {
            x: satellites.map(sat => sat.x),
            y: satellites.map(sat => sat.y),
            mode: 'markers',
            type: 'scatter',
            name: 'Satellites',
            marker: { color: 'blue', size: 11 }
        },
        {
            x: [objectPosition.x],
            y: [objectPosition.y],
            mode: 'markers',
            type: 'scatter',
            name: 'Object',
            marker: { color: 'red', size: 16 }
        }
    ], {
        title: 'GPS Visualization',
        xaxis: { title: 'X дистанция (km)', autorange: false, range: [-300, 300] },
        yaxis: { title: 'Y дистанция (km)', autorange: false, range: [-300, 300] }
    });
};

document.getElementById('gps-settings').addEventListener('submit', async (event) => {
    event.preventDefault();
    const satelliteSpeed = parseFloat(document.getElementById('satelliteSpeed').value);
    const objectSpeed = parseFloat(document.getElementById('objectSpeed').value);

    try {
        const response = await fetch('http://localhost:4001/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ satelliteSpeed, objectSpeed })
        });

        const result = await response.json();
        console.log('GPS параметры обновлены:', result);
    } catch (error) {
        console.error('Ошибка обновления GPS параметров:', error);
    }
});
