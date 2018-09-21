'use strict';

/**
 * Module dependencies.
 * @private
 */
const pg = require('pg');
const config = require('../db/config');


/**
 * Module exports.
 * @public
 */
module.exports = {
    getCards: getCards,
    validateKey: validateKey,
    insertCardReview: insertCardReview,
};


config.max = 30;
config.idleTimeoutMillis = 15000;
const pool = new pg.Pool(config);


/**
 * Gets cards from database.
 * @param {function} callback - Callback function.
 * @public
 */
function getCards(callback) {
  pool.connect((err, client, done) => {
    !!err && console.error(err) && callback({});

    const query = 'select c.id as id, c.issuer_id as issuer_id, i.name as issuer_name, c.payment_network_id as payment_network_id, p.name as payment_network_name, c.name as name, c.description as description, c.min_score as min_score, c.cash_back as cash_back, c.travel as travel, c.low_interest as low_interest, c.zero_percent as zero_percent, c.balance_transfer as balance_transfer, c.points as points, c.gas as gas, c.extended_warranty as extended_warranty, c.price_guarantee as price_guarantee, c.img as img, s.redemption as redemption, s.customer_service as customer_service, s.technology as technology, s.security as security, s.credit_building as credit_building from cards as c left join issuers as i on c.issuer_id=i.id left join payment_networks as p on c.payment_network_id=p.id left join sentiments as s on c.id=s.card_id;';

    client.query(query, (err, res) => {
      done(err);

      !!err && console.error(err) && callback({});

      callback(res.rows);
    });
  });
}

/**
 * Inserts card review into database.
 * If same IP address reviews same card ID, reject.
 * @param {review} object - Card review.
 * @param {function} callback - Callback function.
 */
function insertCardReview(review, callback) {
  pool.connect((err, client, done) => {
    !!err && console.error(err) && callback('Error');

    const check = 'select count(*) c from new_reviews where remote_address=$1 and card_id=$2';
    client.query(check, [review.remoteaddress, review.cardid], (err, res) => {
      if (!!parseInt(res.rows[0].c)) {
        done(err);
        callback('Already reviewed card');
      } else {
        const query = 'insert into new_reviews(remote_address, card_id, customer_service, redemption, building, security, technology, txt) values($1, $2, $3, $4, $5, $6, $7, $8)';
        const params = [
          review.remoteaddress,
          review.cardid,
          review.customerservice,
          review.redemption,
          review.building,
          review.security,
          review.technology,
          review.text,
        ];
        client.query(query, params, err => {
          done(err);
          callback('Success');
        });
      }
    });
  });
}

/**
 * Validates an API key.
 * @param {string} key - API key.
 * @param {function} callback - Callback function.
 * @public
 */
function validateKey(key, callback) {
  pool.connect((err, client, done) => {
    !!err && console.error(err) && callback(false);

    const query = 'select is_valid from api_keys where key=$1';

    client.query(query, [key], (err, res) => {
      done(err);

      !!err && console.error(err) && callback(false);

      callback(res.rows.length === 1 && res.rows[0].is_valid);
    });
  });
}
