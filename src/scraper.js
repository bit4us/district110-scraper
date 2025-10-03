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

  // Get all division rows and their index in the parent
  const allRows = [];
  $("table[width='90%'] tr, table[width='90%'] tbody").each((_, el) => {
    allRows.push(el);
  });

  // Map index to division name
  const divisionMap = {};
  allRows.forEach((el, idx) => {
    const $el = $(el);
    if ($el.is("tr.Grid_Top_Row.blue_row")) {
      $el.find("td.Grid_Title_top4_blue").each((_, td) => {
        const txt = $(td).text().replace(/\s+/g, ' ').trim();
        if (/^Division\s+[A-Z]$/.test(txt)) {
          divisionMap[idx] = txt;
        }
      });
    }
  });

  // Now, for each area, find its division by walking backwards in allRows
  allRows.forEach((el, idx) => {
    const $el = $(el);
    if ($el.hasClass("Expanded1")) {
      // Area name
      let areaName = '';
      $el.find("td.Grid_Title_top5").each((_, td) => {
        const txt = $(td).text().replace(/\s+/g, ' ').trim();
        if (/^Area\s+\d{2}$/.test(txt)) {
          areaName = txt;
        }
      });
      if (!areaName) return;

      // Find division by walking backwards
      let divisionName = '';
      for (let j = idx - 1; j >= 0; j--) {
        if (divisionMap[j]) {
          divisionName = divisionMap[j];
          break;
        }
      }
      if (!divisionName) return;

      // Scan forward for club rows after this area
      let clubs = [];
      for (let k = idx + 1; k < allRows.length; k++) {
        const $row = $(allRows[k]);
        if ($row.hasClass("Expanded1") || $row.is("tr.Grid_Top_Row.blue_row")) {
          // Stop when next area or division starts
          break;
        }
        // Club rows have class 'Grid_Top_Row title_gray'
        if ($row.is("tr.Grid_Top_Row.title_gray")) {
          // Club ID from span.redFont
          const clubId = $row.find("span.redFont").first().text().trim();
          // Club Name from the next span after clubId
          let clubName = '';
          const clubNameSpan = $row.find("span.redFont").next("span");
          if (clubNameSpan.length) {
            clubName = clubNameSpan.text().trim();
          } else {
            // fallback: get from title attribute if available
            const clubNameTd = $row.find("td.Grid_Title_top5");
            clubName = clubNameTd.attr('title') ? clubNameTd.attr('title').trim() : '';
          }
          // Members: from the 7th <td> (index 6)
          const tds = $row.find("td");
          const members = tds.length > 0 ? parseInt($(tds[tds.length - 1]).text().trim()) || 0 : 0;
          if (clubId && clubName) {
            clubs.push({ clubId, clubName, members });
          }
        }
      }
      console.log(`Area ${areaName} in ${divisionName} has ${clubs.length} clubs`);

      // Save to divisions object
      if (!divisions[divisionName]) divisions[divisionName] = {};
      divisions[divisionName][areaName] = clubs;
    }
  });

  fs.writeFileSync(
    path.join(__dirname, '../data/district110.json'),
    JSON.stringify(divisions, null, 2)
  );
  console.log('Scraping complete. JSON saved.');
  fs.writeFileSync('raw.html', data);
  console.log('Number of area tbodies:', $("tbody.Expanded1").length);
  console.log('Number of division rows:', $("tr.Grid_Top_Row.blue_row").length);
}

scrapeDistrict110();