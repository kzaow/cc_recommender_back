'use strict';

/**
 * Module dependencies.
 * @private
 */
const https = require('https');
const cheerio = require('cheerio');
const pg = require('pg');
const config = require('../db/config.json');


const href = 'https://home.barclaycardus.com/cards.list.html';
config.max = 1;
config.idleTimeoutMillis = 2000;

/**
 * Removes extraneous characters from `text`.
 * @param {string} text - Unclean text.
 * @return {string} Clean text.
 * @private
 */
function formatText(text) {
  return text.trim().split(/\s+/).join(' ');
}

/**
 * Extracts rewards from card description.
 * @param {string} description - Card description.
 * @return {object} Rewards.
 * @private
 */
function getProperties(name, description) {
  const cashback = /(\d+\.?\d*)%.*cash/.exec(description);
  const travel = /(\d+\.?\d*)X.*mile/.exec(description);
  const points = /(\d+\.?\d*).*point/.exec(description);

  return {
    cashback: !cashback ? 0 : Math.max(
      ...cashback.map(val => parseFloat(val) || 0)
    ),
    travel: !travel ? 0 : Math.max(
      ...travel.map(val => parseFloat(val) || 0)
    ),
    lowinterest: 0,
    zeropercent: 0,
    balancetransfer: 0 + !!description.match(/balance transfer/),
    points: !points ? 0 : Math.min(
      ...points.map(val => parseFloat(val) || 0)
    ),
    gas: 0,
    extendedwarranty: 0,
    priceguarantee: 0,
  };
}

new Promise((resolve, reject) => {
  https.get(href, res => {
    let html = '';
    res.on('data', data => {
      html += data.toString();
    });
    res.on('end', () => {
      resolve(html);
    });
  });
}).then(html => {
  return new Promise((resolve, reject) => {
    new pg.Pool(config).connect((err, client, done) => {
      resolve({html: html, err: err, client: client, done: done});
    });
  });
}).then(result => {
  const $ = cheerio.load(result.html);

  $('.bcus-card-results__item').each((index, element) => {
    element = $(element);
    element.find('sup').remove();

    let name = formatText(
      element.find('.bcus-card-results__list-card-name').text()
    );

    let description = element.find('.bcus-card-results__list-highlight-item')
      .map((i, e) => {
        return formatText($(e).text());
      }).get().join('|');

    let img = `https://home.barclaycardus.com${element.find('img').attr('src')}`;

    let props = getProperties(name, description);

    let query = `INSERT INTO cards(issuer_id, name, description, cash_back, travel, low_interest, zero_percent, balance_transfer, points, gas, extended_warranty, price_guarantee) VALUES(8, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;
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
    result.client.query(query, params);
  });
  result.done(result.err);
});
