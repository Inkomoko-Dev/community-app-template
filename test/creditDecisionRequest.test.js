const test = require('node:test');
const assert = require('node:assert/strict');
const cd = require('../app/scripts/modules/creditDecisionRequest');

function param(key, enabled, fieldName, missingPolicy) {
    return {key: key, enabled: enabled, fieldName: fieldName || key, missingPolicy: missingPolicy || 'block'};
}

test('only switched-on parameters are sent, under the field name the profile chose', function () {
    const sample = cd.SAMPLES[0];
    const built = cd.build([param('amount', true, 'loanAmount'), param('term', false, 'termMonths')], sample, 'Business loans v7');

    assert.deepEqual(built.payload.parameters, {loanAmount: 40000});
    assert.equal(built.payload.profile, 'Business loans v7');
    assert.equal(built.payload.applicationId, sample.applicationId);
    assert.deepEqual(built.held, []);
});

test('missing data is held, sent as not available, or left out according to the profile', function () {
    const sample = cd.SAMPLES[1]; // no bureau score, no bureau list flag, no bureau active loans
    const built = cd.build([
        param('amount', true, 'amount'),
        param('bscore', true, 'bureauScore', 'block'),
        param('bactive', true, 'bureauActiveLoans', 'null'),
        param('bdate', true, 'bureauReportDate', 'omit')
    ], sample, 'p');

    assert.deepEqual(built.held, ['bscore']);
    assert.deepEqual(built.nulls, ['bactive']);
    assert.deepEqual(built.omitted, ['bdate']);
    assert.equal(built.payload.parameters.bureauActiveLoans, null);
    assert.equal('bureauReportDate' in built.payload.parameters, false);
    assert.equal(built.payload.parameters.amount, 85000);
});

test('zero is real data, not missing data', function () {
    const built = cd.build([param('arrears', true, 'currentArrears', 'block')], cd.SAMPLES[0], 'p');

    assert.deepEqual(built.held, []);
    assert.equal(built.payload.parameters.currentArrears, 0);
});

test('a version needs a parameter, a product and clean field names to be submitted', function () {
    assert.equal(cd.validate([param('amount', false)], [1]).noParams, true);
    assert.equal(cd.validate([param('amount', true)], []).noProducts, true);
    assert.equal(cd.validate([param('amount', true)], [1]).ok, true);

    const bad = cd.validate([param('amount', true, '9bad'), param('term', true, 'same'), param('currency', true, 'same'),
        param('purpose', false, 'not valid!')], [1]);
    assert.equal(bad.errors.amount, 'invalid');
    assert.equal(bad.errors.term, 'duplicate');
    assert.equal(bad.errors.currency, 'duplicate');
    assert.equal(bad.errors.purpose, undefined);
    assert.equal(bad.ok, false);
});

test('the diff names products and data added, removed and re-mapped', function () {
    const before = {productIds: [1, 2], params: [param('amount', true, 'amount', 'block'), param('term', true, 'term'),
        param('wo', false, 'writtenOff24m', 'null')]};
    const after = {productIds: [2, 3], params: [param('amount', true, 'requestedAmount', 'null'), param('term', false, 'term'),
        param('wo', true, 'writtenOff24m', 'null')]};

    const changes = cd.diff(before, after).map(function (c) {
        return [c.type, c.kind, c.key, c.from, c.to].join(':');
    });

    assert.deepEqual(changes.sort(), [
        'add:param:wo::',
        'add:product:3::',
        'chg:field:amount:amount:requestedAmount',
        'chg:policy:amount:block:null',
        'rem:param:term::',
        'rem:product:1::'
    ]);
});

test('products are grouped by currency in the order first seen', function () {
    const groups = cd.groupByCurrency([
        {id: 1, currencyCode: 'KES'}, {id: 2, currencyCode: 'RWF'}, {id: 3, currencyCode: 'KES'}
    ]);

    assert.deepEqual(groups.map(function (g) {
        return g.currencyCode + ':' + g.products.length;
    }), ['KES:2', 'RWF:1']);
});
