'use strict';

/**
 * Module dependencies.
 * @private
 */
const https = require('https');
const cheerio = require('cheerio');
const pg = require('pg');
const config = require('../db/config.json');


const base = 'https://www.discover.com/credit-cards';
const paths = [
  '/cash-back/',
  '/travel/',
  '/student/',
];
config.max = 1;
config.idleTimeoutMillis = 2000;

new pg.Pool(config).connect((err, client, done) => {
  paths.forEach(value => {
    https.get(`${base}${value}`, res => {

      let html = '';

      res.on('data', data => {
        html += data.toString();
      });

      res.on('end', () => {
        
        const $ = cheerio.load(html);

        $('.card-group-content').find('.column').each((index, element) => {
          element = $(element);
          element.find('sup').remove();
          element.find('.rates-link').remove();

          let name = element.find('h2').text();

          element.find('a').remove();

          let description = element.find('p').map((i, e) => {
            return $(e).text();
          }).get().join('|');

          let img = `https://www.discover.com/credit-cards${element.find('img').attr('src').replace(/\.\./g, '')}`;

          let query = `INSERT INTO cards(issuer_id, name, description) VALUES(7, $1, $2, $3);`;
          let params = [name, description, img];
          client.query(query, params);
        });
      });
    });
  });
  done(err);
});
