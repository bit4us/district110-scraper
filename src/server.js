// src/server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.get('/api/divisions', (req, res) => {
  const data = fs.readFileSync(path.join(__dirname, '../data/district110.json'));
  res.json(JSON.parse(data));
});

app.get('/api/clubs/:id', async (req, res) => {
  const clubId = req.params.id;
  const url = `https://dashboards.toastmasters.org/Club.aspx?id=${clubId}`;
  const axios = require('axios');
  const cheerio = require('cheerio');

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const name = $('h1').text().trim();
    const goalsMet = $('td:contains("Goals Met")').next().text().trim();

    res.json({ clubId, name, goalsMet });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch club data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));