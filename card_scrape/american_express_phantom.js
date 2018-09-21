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


const program = phantomjs.exec('american_express_phantom_scrape.js');
program.stdout.pipe(process.stdout);
program.stderr.pipe(process.stderr);
program.on('exit', code => {
  code === 0 && parseHtml('./html_dumps/american_express.html');
});

/**
 * Removes extraneous characters from `text`.
 * @param {string} text - Unclean text.
 * @return {string} Clean text.
 * @private
 */
function formatText(text) {
  return text.trim().replace(/(\r\n)/g, '').split(/\s+/).join(' ');
}

/**
 * Extracts rewards from card description.
 * @param {string} description - Card description.
 * @return {object} Rewards.
 * @private
 */
function getProperties(description) {
  const cashback = /(\d+\.?\d*)% (c|C)ash (b|B)ack/.exec(description);
  const travel = /(\d+\.?\d*)(x|X)\s?(p|P)oints/.exec(description);
  const points = /(\d+\.?\d*).*(p|P)oints/.exec(description);

  return {
    cashback: !cashback ? 0 : Math.max(
      ...cashback.map(val => parseFloat(val) || 0)
    ),
    travel: !travel ? 0 : Math.max(
      ...travel.map(val => parseFloat(val) || 0)
    ),
    lowinterest: 0,
    zeropercent: 0,
    balancetransfer: 0,
    points: !points ? 0 : Math.max(
      ...points.map(val => parseFloat(val) || 0)
    ),
    gas: 0,
    extendedwarranty: 1,
    priceguarantee: 0,
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
      $('.amex-card-m').each((index, element) => {
        element = $(element);
        element.find('sup').remove();
        element.find('span[class=benefit_footnote_class]').remove();

        let name = formatText(element.find('h2[itemprop=name]').text());

        let summary = formatText(element.find('.welcome-offer').text());
        let annualFee = formatText(element.find('.annual-fee').text());
        let rewards = formatText(element.find('.amex-card-m__highlight')
          .text());
        let description = `${summary}|${annualFee}|${rewards}`;

        let props = getProperties(description);

        let query = `INSERT INTO cards(issuer_id, name, description, cash_back, travel, low_interest, zero_percent, balance_transfer, points, gas, extended_warranty, price_guarantee) VALUES(2, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`;
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
