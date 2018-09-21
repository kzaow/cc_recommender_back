'use strict';

/**
 * Module dependencies.
 * @private
 */
const phantomjs = require('phantomjs-prebuilt');
const fs = require('fs');
const cheerio = require('cheerio');
const pg = require('pg');
const config = require('../db/config.json');


const program = phantomjs.exec('citi_phantom_scrape.js');
program.stdout.pipe(process.stdout);
program.stderr.pipe(process.stderr);
program.on('exit', code => {
  code === 0 && parseHtml('./html_dumps/citi.html');
});

/**
 * Extracts rewards from card description.
 * @param {string} description - Card description.
 * @return {object} Rewards.
 * @private
 */
function getProperties(description) {
  const cashback = /(\d+\.?\d*).*cash back/.exec(description);
  const travel = /(\d+\.?\d*)\s?(p|P)oints.*(t|T)ravel/.exec(description);
  const gas = /(\d+\.?\d*)\s?(p|P)oints.*(g|G)as/.exec(description);
  const points = /(\d+\.?\d*) points per \$1/.exec(description);

  return {
    cashback: !cashback ? 0 : Math.max(
      ...cashback.map(val => parseFloat(val) || 0)
    ),
    travel: !travel ? 0 : Math.max(
      ...travel.map(val => parseFloat(val) || 0)
    ),
    lowinterest: 0,
    zeropercent: 0 + !!description.match(/0% Intro APR/),
    balancetransfer: 0 + !!description.match(/(b|B)alance (t|T)ransfer/),
    points: !points ? 0 : Math.max(
      ...points.map(val => parseFloat(val) || 0)
    ),
    gas: !gas ? 0 : Math.max(
      ...gas.map(val => parseFloat(val) || 0)
    ),
    extendedwarranty: 0,
    priceguarantee: 1,
  };
}

/**
 * Parses HTML dump from phantom child process.
 * @param {string} filename - Path of HTML dump.
 * @private
 */
function parseHtml(filename) {
  fs.readFile(filename, (err, data) => {
    let html = data.toString();
    let $ = cheerio.load(html);

    new pg.Pool(config).connect((err, client, done) => {
      $('.cA-DD-cardTile').each((index, element) => {
        element = $(element);
        element.find('sup').remove();
        element.find('sub').remove();
        element.find('.cA-DD-detailLink').remove();

        let name = element.find('.cA-DD-cardTitle').text()
          .replace(/(\r\n|\n)/g,'');

        let summary = element.find('.cA-DD-cardDetailsDescription')
          .text().replace(/(\n)/g,'');
        let apr = element.find('.apr').text();
        let annualFee = element.find('.annual-fee').text().trim();
        let description = `${summary}|${apr}|${annualFee}`
          .replace(/(\r\n)/g, '');

        let props = getProperties(description);

        let query = `INSERT INTO cards(issuer_id, name, description, cash_back, travel, low_interest, zero_percent, balance_transfer, points, gas, extended_warranty, price_guarantee) VALUES(5, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`;
        let params = [
          name,
          description,
          props.cashback,
          props.travel,
          props.lowinterest,
          props.zeropercent,
          props.balancetransfer,
          props.points,
          props.gas,
          props.extendedwarranty,
          props.priceguarantee,
        ];
        client.query(query, params);
      });
      done(err);
    });
  });
}
