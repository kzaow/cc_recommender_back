'use strict';

/**
 * Module dependencies.
 * @private
 */
const fs = require('fs');
const cheerio = require('cheerio');
const pg = require('pg');
const config = require('../db/config.json');


config.max = 1;
config.idleTimeoutMillis = 2000;

fs.readFile(process.argv[2], (err, data) => {
  let html = data.toString();
  let $ = cheerio.load(html);

  new pg.Pool(config).connect((err, client, done) => {
    $('.cA-DD-cardTile').each((index, element) => {
      element = $(element);
      element.find('sup').remove();
      element.find('sub').remove();
      element.find('.cA-DD-detailLink').remove();

      let name = element.find('.cA-DD-cardTitle').text().replace(/(\r\n)/g,'');

      let summary = element.find('.cA-DD-cardDetailsDescription').text();
      let apr = element.find('.apr').text();
      let annualFee = element.find('.annual-fee').text().trim();
      let description = `${summary}|${apr}|${annualFee}`.replace(/(\r\n)/g,'');

      let query = `INSERT INTO cards(issuer_id, name, description) VALUES(5, $1, $2);`;
      let params = [name, description];
      client.query(query, params);
    });
    done(err);
  });
});
