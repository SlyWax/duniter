var async         = require('async');
var should        = require('should');
var assert        = require('assert');
var mongoose      = require('mongoose');
var parsers       = require('../../../app/lib/streams/parsers/doc');
var blocks        = require('../../data/blocks');
var validator     = require('../../../app/lib/globalValidator');
var parser        = parsers.parseBlock();
var Block         = mongoose.model('Block', require('../../../app/models/block'));
var Identity      = mongoose.model('Identity', require('../../../app/models/identity'));
var Configuration = mongoose.model('Configuration', require('../../../app/models/configuration'));

var conf = new Configuration({
  sigDelay: 365.25*24*3600, // 1 year
  sigQty: 1,
  powZeroMin: 1,
  powPeriod: 18,
  incDateMin: 10,
  dt: 100,
  ud0: 100,
  c: 0.1
});

describe("Block global coherence:", function(){

  it('a valid block should not have any error', validate(blocks.VALID_ROOT, function (err, done) {
    should.not.exist(err);
    done();
  }));

  it('a valid (next) block should not have any error', validate(blocks.VALID_NEXT, function (err, done) {
    should.not.exist(err);
    done();
  }));

  it('a block with wrong PreviousHash should fail', validate(blocks.WRONG_PREVIOUS_HASH, function (err, done) {
    should.exist(err);
    err.should.equal('PreviousHash not matching hash of current block');
    done();
  }));

  it('a block with wrong PreviousIssuer should fail', validate(blocks.WRONG_PREVIOUS_ISSUER, function (err, done) {
    should.exist(err);
    err.should.equal('PreviousIssuer not matching issuer of current block');
    done();
  }));

  it('a block with certification of unknown pubkey should fail', validate(blocks.WRONGLY_SIGNED_CERTIFICATION, function (err, done) {
    should.exist(err);
    err.should.equal('Wrong signature for certification');
    done();
  }));

  it('a block with certification from non-member pubkey should fail', validate(blocks.UNKNOWN_CERTIFIER, function (err, done) {
    should.exist(err);
    err.should.equal('Certification from non-member');
    done();
  }));

  it('a block with certification to non-member pubkey should fail', validate(blocks.UNKNOWN_CERTIFIED, function (err, done) {
    should.exist(err);
    err.should.equal('Certification to non-member');
    done();
  }));

  it('a block with already used UserID should fail', validate(blocks.EXISTING_UID, function (err, done) {
    should.exist(err);
    err.should.equal('Identity already used');
    done();
  }));

  it('a block with already used pubkey should fail', validate(blocks.EXISTING_PUBKEY, function (err, done) {
    should.exist(err);
    err.should.equal('Pubkey already used');
    done();
  }));

  it('a block with too early certification replay should fail', validate(blocks.TOO_EARLY_CERTIFICATION_REPLAY, function (err, done) {
    should.exist(err);
    err.should.equal('Too early for this certification');
    done();
  }));

  it('a block with at least one joiner without enough certifications should fail', validate(blocks.NOT_ENOUGH_CERTIFICATIONS_JOINER, function (err, done) {
    should.exist(err);
    err.should.equal('Joiner does not gathers enough certifications');
    done();
  }));

  it('a block with at least one joiner without enough certifications should succeed', validate(blocks.NOT_ENOUGH_CERTIFICATIONS_JOINER_BLOCK_0, function (err, done) {
    should.not.exist(err);
    done();
  }));

  it('a block with at least one joiner outdistanced from WoT should fail', validate(blocks.OUTDISTANCED_JOINER, function (err, done) {
    should.exist(err);
    err.should.equal('Joiner is outdistanced from WoT');
    done();
  }));

  it('a block with positive number while no root exists should fail', validate(blocks.ROOT_BLOCK_REQUIRED, function (err, done) {
    should.exist(err);
    err.should.equal('Root block required first');
    done();
  }));

  it('a block with same number as current should fail', validate(blocks.SAME_BLOCK_NUMBER, function (err, done) {
    should.exist(err);
    err.should.equal('Too late for this block');
    done();
  }));

  it('a block with older number than current should fail', validate(blocks.OLD_BLOCK_NUMBER, function (err, done) {
    should.exist(err);
    err.should.equal('Too late for this block');
    done();
  }));

  it('a block with too far future number than current should fail', validate(blocks.FAR_FUTURE_BLOCK_NUMBER, function (err, done) {
    should.exist(err);
    err.should.equal('Too early for this block');
    done();
  }));

  it('a block with kicked members not written under Excluded field should fail', validate(blocks.KICKED_NOT_EXCLUDED, function (err, done) {
    should.exist(err);
    err.should.equal('All kicked members must be present under Excluded members');
    done();
  }));

  it('a block with kicked members well written under Excluded field should succeed', validate(blocks.KICKED_EXCLUDED, function (err, done) {
    should.not.exist(err);
    done();
  }));

  it('a block with wrong members count should fail', validate(blocks.WRONG_MEMBERS_COUNT, function (err, done) {
    should.exist(err);
    err.should.equal('Wrong members count');
    done();
  }));

  it('a block not starting with a leading zero should fail', validateProofOfWork(blocks.NO_LEADING_ZERO, function (err, done) {
    should.exist(err);
    err.should.equal('Not a proof-of-work');
    done();
  }));

  it('a block requiring 4 leading zeros but providing less should fail', validateProofOfWork(blocks.REQUIRES_4_LEADING_ZEROS, function (err, done) {
    should.exist(err);
    err.should.equal('Wrong proof-of-work level: given 1 zeros, required was 4 zeros');
    done();
  }));

  it('a block requiring 7 leading zeros but providing less should fail', validateProofOfWork(blocks.REQUIRES_7_LEADING_ZEROS, function (err, done) {
    should.exist(err);
    err.should.equal('Wrong proof-of-work level: given 1 zeros, required was 7 zeros');
    done();
  }));

  it('a block requiring 6 leading zeros but providing less should fail', validateProofOfWork(blocks.REQUIRES_6_LEADING_ZEROS, function (err, done) {
    should.exist(err);
    err.should.equal('Wrong proof-of-work level: given 1 zeros, required was 6 zeros');
    done();
  }));

  it('a block requiring 5 leading zeros but providing less should fail', validateProofOfWork(blocks.REQUIRES_5_LEADING_ZEROS, function (err, done) {
    should.exist(err);
    err.should.equal('Wrong proof-of-work level: given 1 zeros, required was 5 zeros');
    done();
  }));

  it('a block requiring 7 leading zeros (again) but providing less should fail', validateProofOfWork(blocks.REQUIRES_7_LEADING_ZEROS_AGAIN, function (err, done) {
    should.exist(err);
    err.should.equal('Wrong proof-of-work level: given 1 zeros, required was 7 zeros');
    done();
  }));

  it('a root block with date field different from confirmed date should fail', validateDate(blocks.WRONG_ROOT_DATES, function (err, done) {
    should.exist(err);
    err.should.equal('Root block\'s Date and ConfirmedDate must be equal');
    done();
  }));

  it('a block with date field lower than confirmed date should fail', validateDate(blocks.WRONG_DATE_LOWER_THAN_CONFIRMED, function (err, done) {
    should.exist(err);
    err.should.equal('Date field cannot be lower than previous block\'s ConfirmedDate');
    done();
  }));

  it('a block with different confirmed dates AND not confirming a new date should fail', validateDate(blocks.WRONG_CONFIRMED_DATE_NOT_SAME, function (err, done) {
    should.exist(err);
    err.should.equal('ConfirmedDate must be equal to previous block\'s ConfirmedDate');
    done();
  }));

  it('a block with different confirmed dates AND not confirming a new date should fail', validateDate(blocks.WRONG_CONFIRMED_DATE_MUST_CONFIRM, function (err, done) {
    should.exist(err);
    err.should.equal('ConfirmedDate must be equal to Date for a confirming block');
    done();
  }));

  it('a block with good confirmation of a new date should pass', validateDate(blocks.GOOD_CONFIRMED_DATE, function (err, done) {
    should.not.exist(err);
    done();
  }));

  it('a root block with Universal Dividend should fail', validateUD(blocks.ROOT_BLOCK_WITH_UD, function (err, done) {
    should.exist(err);
    err.should.equal('Root block cannot have UniversalDividend field');
    done();
  }));

  it('a block without Universal Dividend whereas it have to have one should fail', validateUD(blocks.UD_BLOCK_WIHTOUT_UD, function (err, done) {
    should.exist(err);
    err.should.equal('Block must have a UniversalDividend field');
    done();
  }));

  it('a block with wrong Universal Dividend value should fail', validateUD(blocks.BLOCK_WITH_WRONG_UD, function (err, done) {
    should.exist(err);
    err.should.equal('UniversalDividend must be equal to 121');
    done();
  }));

  it('a root block with unlegitimated Universal Dividend presence should fail', validateUD(blocks.BLOCK_UNLEGITIMATE_UD, function (err, done) {
    should.exist(err);
    err.should.equal('This block cannot have UniversalDividend since ConfirmedDate has not changed');
    done();
  }));

  it('a root block with unlegitimated Universal Dividend presence should fail', validateUD(blocks.BLOCK_UNLEGITIMATE_UD_2, function (err, done) {
    should.exist(err);
    err.should.equal('This block cannot have UniversalDividend');
    done();
  }));

});

function validate (raw, callback) {
  var block;
  return function (done) {
    async.waterfall([
      function (next){
        parser.asyncWrite(raw, next);
      },
      function (obj, next){
        block = new Block(obj);
        validator(conf, new BlockCheckerDao(block)).validate(block, next);
      },
      function (next){
        validator(conf, new BlockCheckerDao(block)).checkSignatures(block, next);
      },
    ], function (err) {
      callback(err, done);
    });
  };
}

function validateProofOfWork (raw, callback) {
  var block;
  return function (done) {
    async.waterfall([
      function (next){
        parser.asyncWrite(raw, next);
      },
      function (obj, next){
        block = new Block(obj);
        validator(conf, new BlockCheckerDao(block)).checkProofOfWork(block, next);
      },
    ], function (err) {
      callback(err, done);
    });
  };
}

function validateDate (raw, callback) {
  var block;
  return function (done) {
    async.waterfall([
      function (next){
        parser.asyncWrite(raw, next);
      },
      function (obj, next){
        block = new Block(obj);
        validator(conf, new BlockCheckerDao(block)).checkDates(block, next);
      },
    ], function (err) {
      callback(err, done);
    });
  };
}

function validateUD (raw, callback) {
  var block;
  return function (done) {
    async.waterfall([
      function (next){
        parser.asyncWrite(raw, next);
      },
      function (obj, next){
        block = new Block(obj);
        validator(conf, new BlockCheckerDao(block)).checkUD(block, next);
      },
    ], function (err) {
      callback(err, done);
    });
  };
}

/**
* Mock dao for testing
*/
function BlockCheckerDao (block) {
  
  this.existsUserID = function (uid, done) {
    if (uid == 'EXISTING') {
      done(null, true);
    } else {
      done(null, false);
    }
  }
  
  this.existsPubkey = function (pubkey, done) {
    if (pubkey == 'HHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH') {
      done(null, true);
    } else {
      done(null, false);
    }
  }
  
  this.getIdentityByPubkey = function (pubkey, done) {
    // No existing identity
    done(null, null);
  }
  
  this.isMember = function (pubkey, done) {
    // No existing member
    if (block.number == 0)
      done(null, false);
    else {
      var members = [
        'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd',
        'G2CBgZBPLe6FSFUgpx2Jf1Aqsgta6iib3vmDRA1yLiqU',
      ];
      done(null, ~members.indexOf(pubkey));
    }
  }

  this.getPreviousLinkFor = function (from, to, done) {
    if (from == 'G2CBgZBPLe6FSFUgpx2Jf1Aqsgta6iib3vmDRA1yLiqU'
      && to == 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC') {
      done(null, {
        timestamp: '1380218401' // Exactly 1 second remaining
      });
    } else {
      done(null, null);
    }
  }

  this.getValidLinksTo = function (to, done) {
    done(null, []);
  }

  this.getMembers = function (done) {
    if (block.number == 0)
      done(null, []);
    else {
      done(null, [
        { pubkey: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd' },
        { pubkey: 'G2CBgZBPLe6FSFUgpx2Jf1Aqsgta6iib3vmDRA1yLiqU' },
      ]);
    }
  }

  this.getPreviousLinkFromTo = function (from, to, done) {
    done(null, []);
  }

  this.getValidLinksFrom = function (member, done) {
    done(null, []);
  }

  this.getCurrent = function (done) {
    if (block.number == 3)      
      done(null, { number: 2, hash: '15978746968DB6BE3CDAF243E372FEB35F7B0924', issuer: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd', membersCount: 3 });
    else if (block.number == 4) 
      done(null, { number: 3, hash: '4AE9FA0A8299A828A886C0EB30C930C7CF302A72', issuer: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd', membersCount: 3 });
    else if (block.number == 51)
      done(null, { number: 50, hash: 'E5B4669FF9B5576EE649BB3CD84AC530DED1F34B', issuer: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd', membersCount: 3 });
    else if (block.number == 50)
      done(null, { number: 50, hash: 'E5B4669FF9B5576EE649BB3CD84AC530DED1F34B', issuer: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd', membersCount: 3 });
    else if (block.number == 49)
      done(null, { number: 50, hash: 'E5B4669FF9B5576EE649BB3CD84AC530DED1F34B', issuer: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd', membersCount: 3 });
    else if (block.number == 52)
      done(null, { number: 50, hash: 'E5B4669FF9B5576EE649BB3CD84AC530DED1F34B', issuer: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd', membersCount: 3 });
    else if (block.number == 70)
      done(null, { number: 69, date: 1411777000, confirmedDate: 1411777000, newDateNth: 1 });
    else if (block.number == 71)
      done(null, { number: 70, date: 1411775000, confirmedDate: 1411775000, newDateNth: 1 });
    else if (block.number == 72)
      done(null, { number: 71, date: 1411777000, confirmedDate: 1411777000, newDateNth: 9 });
    else if (block.number == 73)
      done(null, { number: 72, date: 1411777000, confirmedDate: 1411776000, newDateNth: 9 });
    else if (block.number == 80)
      done(null, { date: 1411777000, confirmedDate: 1411777000, confirmedDateChanged: true });
    else if (block.number == 81)
      done(null, { date: 1411777000, confirmedDate: 1411777000, confirmedDateChanged: true });
    else if (block.number == 82)
      done(null, { date: 1411777000, confirmedDate: 1411777000, confirmedDateChanged: false });
    else if (block.number == 83)
      done(null, { date: 1411777000, confirmedDate: 1411777000, confirmedDateChanged: true });
    else
      done(null, null);
  }

  this.getToBeKicked = function (blockNumber, done) {
    if (block.number != 4)
      done(null, []);
    else {
      done(null, [
        { pubkey: 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd' },
        { pubkey: 'G2CBgZBPLe6FSFUgpx2Jf1Aqsgta6iib3vmDRA1yLiqU' },
      ]);
    }
  },

  this.lastBlockOfIssuer = function (issuer, done) {
    if (block.number == 60 && issuer == 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd') {
      done(null, {
        number: 5, // 60 - 5 = 55 waited, % 18 = 3,0555555
        hash: '0000008A955B2196FB8560DCDA7A70B19DDB3433' // 6 + 1 - 3 = 4 required zeros
      });
    } else if (block.number == 61 && issuer == 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd') {
      done(null, {
        number: 60, // 61 - 60 = 0 waited, % 18 = 0
        hash: '0000008A955B2196FB8560DCDA7A70B19DDB3433' // 6 + 1 - 0 = 7 required zeros
      });
    } else if (block.number == 62 && issuer == 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd') {
      done(null, {
        number: 44, // 62 - 44 = 18 waited, % 18 = 0
        hash: '0000008A955B2196FB8560DCDA7A70B19DDB3433' // 6 + 1 - 1 = 6 required zeros
      });
    } else if (block.number == 64 && issuer == 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd') {
      done(null, {
        number: 47, // 64 - 47 = 17 waited, % 18 = 17
        hash: '0000008A955B2196FB8560DCDA7A70B19DDB3433' // 6 + 1 - 0 = 7 required zeros
      });
    } else if (block.number == 63 && issuer == 'HgTTJLAQ5sqfknMq7yLPZbehtuLSsKj9CxWN7k8QvYJd') {
      done(null, {
        number: 26, // 62 - 26 = 36 waited, % 18 = 0
        hash: '0000008A955B2196FB8560DCDA7A70B19DDB3433' // 6 + 1 - 2 = 5 required zeros
      });
    } else {
      done(null, null);
    }
  }

  this.getLastUDBlock = function (done) {
    if (block.number == 0) {
      done(null, null);
    } else if (block.number == 80) {
      done(null, { confirmedDate: 1411776900, monetaryMass: 300, dividend: 100 });
    } else if (block.number == 81) {
      done(null, { confirmedDate: 1411776900, monetaryMass: 3620, dividend: 110 });
    } else if (block.number == 82) {
      done(null, { confirmedDate: 1411777000, monetaryMass: 3620, dividend: 110 });
    } else if (block.number == 83) {
      done(null, { confirmedDate: 1411777000, monetaryMass: 3620, dividend: 110 });
    } else {
      done(null, null);
    }
  }

}