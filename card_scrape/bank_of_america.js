'use strict';

/**
 * Module dependencies.
 * @private
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
    $('.card-info').each((index, element) => {
      element = $(element);
      element.find('sup').remove();

      let name = element.find('h3').text();

      element.find('p').remove();
      element.find('span').remove();

      let summary = element.find('h4').map((i, e) => {
        return i === 0 ? $(e).text() + '|' : '';
      }).get().join('');
      let benefits = element.find('.show-for-medium-up').find('li')
        .map((i, e) => {
          return $(e).text();
        }).get().join('|');
      let description = `${formatText(summary + benefits)}`;

      let query = `INSERT INTO cards(issuer_id, name, description) VALUES(1, $1, $2);`;
      let params = [name, description];
      client.query(query, params);
    });
    done(err);
  });
});
