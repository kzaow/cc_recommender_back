'use strict';

/**
 * Module dependencies.
 * @private.
 */
const fs = require('fs');
const cheerio = require('cheerio');
const pg = require('pg');
const config = require('../db/config.json');


/**
 * Removes extraneous characters from `text`.
 * @param {string} text - Unclean text.
 * @return {string} Clean text.
 * @private
 */
function formatText(text) {
  return text.trim().replace(/(\r\n)/g, '').split(/\s+/).join(' ');
}

config.max = 1;
config.idleTimeoutMillis = 2000;

fs.readFile(process.argv[2], (err, data) => {
  let html = data.toString();
  let $ = cheerio.load(html);

  new pg.Pool(config).connect((err, client, done) => {
    $('.amex-card-m').each((index, element) => {
      element = $(element);

      let name = formatText(element.find('h2[itemprop=name]').text());

      let summary = formatText(element.find('.welcome-offer').text());
      let annualFee = formatText(element.find('.annual-fee').text());
      let rewards = formatText(element.find('.amex-card-m__highlight').text());
      let description = `${summary}|${annualFee}|${rewards}`;

      let query = `INSERT INTO cards(issuer_id, name, description) VALUES(6, $1, $2);`;
      let params = [name, description];
      client.query(query, params);
    });
    done(err);
  });
});
