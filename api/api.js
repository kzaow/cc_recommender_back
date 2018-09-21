'use strict';

/**
 * Module dependencies.
 * @private
 */
const express = require('express');
const db = require('./db');


/**
 * Checks if user is qualified for card and card meets requirements.
 * @param {object} userSpecs - User's credit score and requirements.
 * @param {object} cardSpecs - Card's minimum score and rewards.
 * @return {boolean} True if user and card match, false otherwise.
 * @private
 */
function validateCard(userSpecs, cardSpecs) {
  return userSpecs.score >= cardSpecs.min_score
    && (!userSpecs.cashback || !!cardSpecs.cash_back)
    && (!userSpecs.travel || !!cardSpecs.travel)
    && (!userSpecs.lowinterest || !!cardSpecs.low_interest)
    && (!userSpecs.zeropercent || !!cardSpecs.zero_percent)
    && (!userSpecs.balancetransfer || !!cardSpecs.balance_transfer)
    && (!userSpecs.points || !!cardSpecs.points)
    && (!userSpecs.gas || !!cardSpecs.gas)
    && (!userSpecs.extendedwarranty || !!cardSpecs.extended_warranty)
    && (!userSpecs.priceguarantee || !!cardSpecs.price_guarantee)
    && (!userSpecs.customerservice
      || cardSpecs.customer_service*100 >= userSpecs.customerservice
    )
    && (!userSpecs.redemption
      || cardSpecs.redemption*100 >= userSpecs.redemption
    )
    && (!userSpecs.creditbuilding
      || cardSpecs.credit_building*100 >= userSpecs.creditbuilding
    )
    && (!userSpecs.security || cardSpecs.security*100 >= userSpecs.security)
    && (!userSpecs.technology
      || cardSpecs.technology*100 >= userSpecs.technology
    );
}

db.getCards(cards => {
  const port = 80;
  const api = express();

  api.get(/card\/.*/, (req, res) => {
    const params = req.path.split('/');
    const key = params[2];
    const id = parseInt(params[3]) || 0;

    db.validateKey(key, isValid => {
      if (!isValid) {
        res.json({});
        res.end();
      } else {
        const matchedCard = cards.find(c => c.id === id) || {};
        res.json(matchedCard);
        res.end();
      }
    });
  });

  api.get(/review\/.*/, (req, res) => {
    const params = req.path.split('/');
    const key = params[2];

    db.validateKey(key, isValid => {
      if (!isValid) {
        res.json({});
        res.end();
      } else {
        const review = params[3].split('&').reduce((acc, val) => {
          const keyValue = val.split('=');
          let parse = parseFloat;
          if (keyValue[0] === 'cardid') {
            parse = parseInt;
          }
          if (keyValue[0] === 'remoteaddress' || keyValue[0] === 'text') {
            parse = x => x;
          }
          acc[keyValue[0]] = parse(keyValue[1]);
          return acc;
        }, {});

        db.insertCardReview(review, status => {
          res.json({status: status});
          res.end();
        });
      }
    });
  });

  api.get(/.*/, (req, res) => {
    const params = req.path.split('/');
    const key = params[1];

    db.validateKey(key, isValid => {
      if (!isValid) {
        res.json({});
        res.end();
      } else {
        const userSpecs = params[2].split('&').reduce((acc, val) => {
          const keyValue = val.split('=');
          acc[keyValue[0]] = parseInt(keyValue[1]);
          return acc;
        }, {});
        
        const matchedCards = cards.filter(c => validateCard(userSpecs, c));

        res.json({
          data: matchedCards.map(c => {
            return {
              id: c.id,
              payment_network_name: c.payment_network_name,
              issuer_name: c.issuer_name,
              name: c.name,
              description: c.description,
              min_score: c.min_score,
              cash_back: c.cash_back,
              travel: c.travel,
              low_interest: c.low_interest,
              zero_percent: c.zero_percent,
              balance_transfer: c.balance_transfer,
              points: c.points,
              gas: c.gas,
              extended_warranty: c.extended_warranty,
              price_guarantee: c.price_guarantee,
              img: c.img,
              redemption: c.redemption,
              customer_service: c.customer_service,
              technology: c.technology,
              security: c.security,
              credit_building: c.credit_building,
            }
          }),
        });
        res.end();
      }
    });
  });

  api.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
});
