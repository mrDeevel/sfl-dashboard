const express = require('express');
let fetch;

async function getFetch() {
  if (!fetch) {
    fetch = (await import('node-fetch')).default;
  }
  return fetch;
}
const app = express();
const PORT = 3001;

// Google Sheets info
const sheetId = '1t2dHCRVavwyX2Vl2ZwjHR8oyLmVMnNVmc8mDmAKVseU';
const apiKey = 'AIzaSyAq-IXRgQL7khW_s4UG_L8aEeNd3jooKuk';

// Cache objects
let picksCache = null, picksCacheTime = 0;
let playersCache = null, playersCacheTime = 0;
let newsCache = null, newsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

// Helper to fetch and cache
async function fetchAndCache(url, cacheObj, cacheTimeObj) {
  const now = Date.now();
  if (cacheObj.value && now - cacheTimeObj.value < CACHE_TTL) {
    return cacheObj.value;
  }
  const fetchFn = await getFetch();
  const res = await fetchFn(url);
  const data = await res.json();
  cacheObj.value = data;
  cacheTimeObj.value = now;
  return data;
}

// Endpoints
app.get('/api/picks', async (req, res) => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Picks!A:J?key=${apiKey}`;
    const data = await fetchAndCache(url, { value: picksCache }, { value: picksCacheTime });
    picksCache = data;
    picksCacheTime = Date.now();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch picks' });
  }
});

app.get('/api/players', async (req, res) => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Players!A:G?key=${apiKey}`;
    const data = await fetchAndCache(url, { value: playersCache }, { value: playersCacheTime });
    playersCache = data;
    playersCacheTime = Date.now();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/TickerNews!A:D?key=${apiKey}`;
    const data = await fetchAndCache(url, { value: newsCache }, { value: newsCacheTime });
    newsCache = data;
    newsCacheTime = Date.now();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

const cors = require('cors');
app.use(cors());

app.listen(PORT, () => {
  console.log(`SFL Proxy running on port ${PORT}`);
});