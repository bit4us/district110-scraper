// src/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function scrapeDistrict110() {
  const url = 'https://dashboards.toastmasters.org/district.aspx?id=110';
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const divisions = {};
  $('h3:contains("Division")').each((_, el) => {
    const divisionName = $(el).text().trim();
    const divisionData = {};
    const areaTable = $(el).next('table');

    areaTable.find('tr').each((i, row) => {
      if (i === 0) return; // skip header
      const cells = $(row).find('td');
      const area = $(cells[0]).text().trim();
      const clubId = $(cells[1]).text().trim();
      const clubName = $(cells[2]).text().trim();
      const members = parseInt($(cells[3]).text().trim());
      const payments = parseInt($(cells[4]).text().trim());

      if (!divisionData[area]) divisionData[area] = [];
      divisionData[area].push({ clubId, clubName, members, payments });
    });

    divisions[divisionName] = divisionData;
  });

  fs.writeFileSync(
    path.join(__dirname, '../data/district110.json'),
    JSON.stringify(divisions, null, 2)
  );
}

scrapeDistrict110();