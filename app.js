import { creamTeaSpots } from './data.js';

const form = document.getElementById('search-form');
const postcodeInput = document.getElementById('postcode');
const resetBtn = document.getElementById('reset-btn');
const statusEl = document.getElementById('status');
const rowsEl = document.getElementById('rows');
const radiusEl = document.getElementById('radius');
const radiusVal = document.getElementById('radius-val');
const sortEl = document.getElementById('sort');

const defaultCenter = [54.2, -2.8];
const defaultZoom = 6;

const map = L.map('map', { zoomControl: true }).setView(defaultCenter, defaultZoom);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let userMarker;
let spotMarkers = [];
let userLoc = null;

const distanceMiles = (a, b) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return (2 * R * Math.asin(Math.sqrt(h))) * 0.621371;
};

function compositeScore(item) {
  const ratingWeight = item.rating * 16;
  const reviewWeight = Math.log10(item.reviews + 1) * 14;
  const distPenalty = item.distanceMiles != null ? Math.min(item.distanceMiles, 100) * 0.5 : 0;
  return Number((ratingWeight + reviewWeight - distPenalty).toFixed(2));
}

function directionsLink(s) {
  if (userLoc) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lon}&destination=${s.lat},${s.lon}&travelmode=driving`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lon}`;
}

function render(list) {
  rowsEl.innerHTML = '';
  spotMarkers.forEach((m) => m.remove());
  spotMarkers = [];

  list.forEach((s, idx) => {
    const websiteHtml = s.website
      ? `<a href="${s.website}" target="_blank" rel="noopener noreferrer">Website</a>`
      : '';
    const directionsHtml = `<a href="${directionsLink(s)}" target="_blank" rel="noopener noreferrer">Directions</a>`;
    const linksHtml = websiteHtml ? `${websiteHtml} · ${directionsHtml}` : directionsHtml;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${s.name}</td>
      <td>${s.town}</td>
      <td>${s.rating.toFixed(1)}</td>
      <td>${s.reviews.toLocaleString()}</td>
      <td>${s.distanceMiles == null ? '-' : `${s.distanceMiles.toFixed(1)} mi`}</td>
      <td><span class="badge">${s.score.toFixed(2)}</span></td>
      <td>${linksHtml}</td>
    `;
    rowsEl.appendChild(tr);

    const popupLinks = `${websiteHtml ? `${websiteHtml}<br/>` : ''}<a href="${directionsLink(s)}" target="_blank" rel="noopener noreferrer">Get directions</a>`;
    const marker = L.marker([s.lat, s.lon])
      .addTo(map)
      .bindPopup(`<strong>${s.name}</strong><br/>${s.town}<br/>⭐ ${s.rating} (${s.reviews.toLocaleString()} reviews)<br/>${popupLinks}`);
    spotMarkers.push(marker);
  });
}

async function geocodePostcode(postcode) {
  const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
  if (!res.ok) throw new Error('Postcode not found');
  const payload = await res.json();
  if (!payload?.result) throw new Error('Invalid postcode');
  return { lat: payload.result.latitude, lon: payload.result.longitude };
}

function computeView() {
  const radius = Number(radiusEl.value);
  radiusVal.textContent = String(radius);

  let ranked = creamTeaSpots.map((s) => {
    const dist = userLoc ? distanceMiles(userLoc, s) : null;
    return { ...s, distanceMiles: dist, score: 0 };
  });

  if (userLoc) ranked = ranked.filter((s) => s.distanceMiles <= radius);

  ranked = ranked.map((s) => ({ ...s, score: compositeScore(s) }));

  switch (sortEl.value) {
    case 'rating':
      ranked.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
      break;
    case 'distance':
      ranked.sort((a, b) => (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999));
      break;
    case 'reviews':
      ranked.sort((a, b) => b.reviews - a.reviews);
      break;
    default:
      ranked.sort((a, b) => b.score - a.score);
  }

  ranked = ranked.slice(0, 20);
  render(ranked);

  if (ranked.length > 0) {
    const group = L.featureGroup(spotMarkers.concat(userMarker ? [userMarker] : []));
    map.fitBounds(group.getBounds().pad(0.2));
  } else if (!userLoc) {
    map.setView(defaultCenter, defaultZoom);
  }
}

function resetToTop20() {
  userLoc = null;
  postcodeInput.value = '';
  if (userMarker) {
    userMarker.remove();
    userMarker = undefined;
  }
  statusEl.textContent = 'Showing UK top 20.';
  computeView();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const postcode = postcodeInput.value.trim();
  if (!postcode) return;

  statusEl.textContent = 'Resolving postcode...';

  try {
    userLoc = await geocodePostcode(postcode);
    if (userMarker) userMarker.remove();
    userMarker = L.marker([userLoc.lat, userLoc.lon]).addTo(map).bindPopup('Your postcode').openPopup();
    statusEl.textContent = `Showing top cream teas near ${postcode.toUpperCase()}.`;
    computeView();
  } catch {
    statusEl.textContent = `Could not find postcode: ${postcode.toUpperCase()}`;
  }
});

resetBtn.addEventListener('click', resetToTop20);
radiusEl.addEventListener('input', computeView);
sortEl.addEventListener('change', computeView);

resetToTop20();
