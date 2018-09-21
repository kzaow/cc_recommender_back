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


const program = phantomjs.exec('bank_of_america_phantom_scrape.js');
program.stdout.pipe(process.stdout);
program.stderr.pipe(process.stderr);
program.on('exit', code => {
  code === 0 && parseHtml('./html_dumps/bank_of_america.html');
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
  const cashback = /(\d+\.?\d*)% cash back/.exec(description);
  const travel = /(\d+\.?\d*) miles (per|for)/.exec(description);
  const points = /(\d+\.?\d*) points (per|for)/.exec(description);
  const gas = /(\d+\.?\d*)% on gas/.exec(description);

  return {
    cashback: !cashback ? 0 : Math.max(
      ...cashback.map(val => parseFloat(val) || 0)
    ),
    travel: !travel ? 0 : Math.max(
      ...travel.map(val => parseFloat(val) || 0)
    ),
    lowinterest: 0 + !!description.match(/Low Introductory APR/),
    zeropercent: 0,
    balancetransfer: 0,
    points: !points ? 0 : Math.max(
      ...points.map(val => parseFloat(val) || 0)
    ),
    gas: !gas ? 0 : Math.max(
      ...gas.map(val => parseFloat(val) || 0)
    ),
    extendedwarranty: 0,
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

        let props = getProperties(description);

        let img = `https://www.bankofamerica.com${element.find('img').attr('src')}`;

        let query = `INSERT INTO cards(issuer_id, name, description, cash_back, travel, low_interest, zero_percent, balance_transfer, points, gas, extended_warranty, price_guarantee) VALUES(1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;
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
          img
        ];
        client.query(query, params);
      });
      done(err);
    });
  });
}
