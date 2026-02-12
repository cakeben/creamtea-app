import { creamTeaSpots } from ./data.js;

const form = document.getElementById(search-form);
const postcodeInput = document.getElementById(postcode);
const statusEl = document.getElementById(status);
const rowsEl = document.getElementById(rows);
const radiusEl = document.getElementById(radius);
const radiusVal = document.getElementById(radius-val);
const sortEl = document.getElementById(sort);

const map = L.map(map, { zoomControl: true }).setView([54.2, -2.8], 6);
L.tileLayer(https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png, {
  maxZoom: 19,
  attribution: 
