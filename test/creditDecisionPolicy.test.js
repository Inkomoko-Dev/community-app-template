const test = require('node:test');
const assert = require('node:assert/strict');
const policy = require('../app/scripts/modules/creditDecisionPolicy');

const CATALOGUE = [
    {key: 'minLoanAmount', unit: 'AMOUNT'},
    {key: 'maxLoanAmount', unit: 'AMOUNT'},
    {key: 'minAge', unit: 'YEARS', starter: 18},
    {key: 'maxDaysPastDue', unit: 'DAYS', starter: 30},
    {key: 'arrearsTolerance', unit: 'AMOUNT', starter: 0},
    {key: 'lowRiskMinScore', unit: 'SCORE', starter: 750},
    {key: 'mediumRiskMinScore', unit: 'SCORE', starter: 650},
    {key: 'weightInternalHistory', unit: 'PERCENT', starter: 40},
    {key: 'weightBureauHistory', unit: 'PERCENT', starter: 30},
    {key: 'weightBusinessFinancials', unit: 'PERCENT', starter: 20},
    {key: 'weightDemographics', unit: 'PERCENT', starter: 10}
];

function starter() {
    return CATALOGUE.filter(function (d) {
        return d.starter !== undefined;
    }).map(function (d) {
        return {scope: 'GLOBAL', scopeKey: '*', key: d.key, value: d.starter};
    });
}

function stateWith(changes) {
    var s = policy.fromRules(starter());
    Object.keys(changes || {}).forEach(function (scopeId) {
        s[scopeId] = Object.assign(s[scopeId] || {}, changes[scopeId]);
    });
    return s;
}

test('the starting policy passes every check', function () {
    var r = policy.validate(stateWith(), CATALOGUE, [1], function () { return 'KES'; });
    assert.deepEqual(r.errors, {});
    assert.equal(r.ok, true);
    assert.equal(r.sums['GLOBAL|*'].sum, 100);
});

test('only what is set is sent, widest scope first', function () {
    var rules = policy.toRules(stateWith({'COUNTRY|KES': {maxLoanAmount: '500000', minLoanAmount: '  '}, 'PRODUCT|7': {maxLoanAmount: '1'}}), CATALOGUE);
    assert.equal(rules[0].scope, 'GLOBAL');
    assert.deepEqual(rules.filter(function (r) { return r.scope !== 'GLOBAL'; }).map(function (r) { return r.scope + ':' + r.scopeKey + ':' + r.key + ':' + r.value; }),
        ['COUNTRY:KES:maxLoanAmount:500000', 'PRODUCT:7:maxLoanAmount:1']);
});

test('weights must add up to 100 and a scope sets all four or none', function () {
    var over = policy.validate(stateWith({'GLOBAL|*': {weightInternalHistory: '41'}}), CATALOGUE, [1]);
    assert.equal(over.errors['weights|GLOBAL|*'], 'weights.sum');
    assert.equal(over.sums['GLOBAL|*'].sum, 101);
    assert.equal(over.ok, false);

    var partial = policy.validate(stateWith({'COUNTRY|RWF': {weightInternalHistory: '100'}}), CATALOGUE, [1]);
    assert.equal(partial.errors['weights|COUNTRY|RWF'], 'weights.all');

    var fine = policy.validate(stateWith({'COUNTRY|RWF': {weightInternalHistory: '25', weightBureauHistory: '25', weightBusinessFinancials: '25', weightDemographics: '25'}}), CATALOGUE, [1]);
    assert.equal(fine.ok, true);
});

test('amounts cannot be negative, counts are whole numbers, percentages and scores have a ceiling', function () {
    var r = policy.validate(stateWith({
        'COUNTRY|KES': {maxLoanAmount: '-1'},
        'GLOBAL|*': {maxDaysPastDue: '30.5', lowRiskMinScore: '1001', arrearsTolerance: 'abc'},
        'COUNTRY|ETB': {weightDemographics: '101'}
    }), CATALOGUE, [1]);
    assert.equal(r.errors['COUNTRY|KES|maxLoanAmount'], 'negative');
    assert.equal(r.errors['GLOBAL|*|maxDaysPastDue'], 'whole');
    assert.equal(r.errors['GLOBAL|*|lowRiskMinScore'], 'maxScore');
    assert.equal(r.errors['GLOBAL|*|arrearsTolerance'], 'number');
    assert.equal(r.errors['COUNTRY|ETB|weightDemographics'], 'max100');
    // an amount may have decimals and be zero
    assert.equal(policy.validate(stateWith({'COUNTRY|KES': {maxLoanAmount: '1500.5', minLoanAmount: '0'}}), CATALOGUE, [1]).ok, true);
});

test('the global knockout rules, cutoffs and weights must be set', function () {
    var s = stateWith();
    s['GLOBAL|*'].maxDaysPastDue = '';
    var r = policy.validate(s, CATALOGUE, [1]);
    assert.equal(r.errors['required|maxDaysPastDue'], 'required');
});

test('the smallest loan stays below the largest, also once a product gets its country cap', function () {
    assert.equal(policy.validate(stateWith({'GLOBAL|*': {minLoanAmount: '500', maxLoanAmount: '400'}}), CATALOGUE, [1]).errors['order|GLOBAL|*'], 'order.amount');
    assert.equal(policy.validate(stateWith({'GLOBAL|*': {mediumRiskMinScore: '750'}}), CATALOGUE, [1]).errors['order|GLOBAL|*'], 'order.tier');
    var r = policy.validate(stateWith({'GLOBAL|*': {minLoanAmount: '500'}, 'COUNTRY|KES': {maxLoanAmount: '400'}}), CATALOGUE, [1], function () { return 'KES'; });
    assert.equal(r.errors['effective|1'], 'order.amount');
});

test('a product setting needs the product to be in the version', function () {
    var r = policy.validate(stateWith({'PRODUCT|99': {maxLoanAmount: '10'}}), CATALOGUE, [1]);
    assert.equal(r.errors['product|PRODUCT|99'], 'product.notcovered');
    assert.equal(policy.validate(stateWith({'PRODUCT|99': {}}), CATALOGUE, [1]).ok, true, 'an empty product card is nothing');
});

test('a product or country shows what it would get without its own setting', function () {
    var s = stateWith({'COUNTRY|KES': {maxDaysPastDue: '45'}});
    assert.deepEqual(policy.inherited(s, 'PRODUCT', '7', 'maxDaysPastDue', 'kes'), {value: 45, from: 'COUNTRY', scopeKey: 'KES'});
    assert.deepEqual(policy.inherited(s, 'PRODUCT', '7', 'maxDaysPastDue', 'RWF'), {value: 30, from: 'GLOBAL', scopeKey: '*'});
    assert.deepEqual(policy.inherited(s, 'COUNTRY', 'KES', 'minAge', null), {value: 18, from: 'GLOBAL', scopeKey: '*'});
    assert.equal(policy.inherited(s, 'GLOBAL', '*', 'minAge', null), null);
    assert.equal(policy.inherited(s, 'COUNTRY', 'KES', 'maxLoanAmount', null), null);
});

test('overrides are counted per scope', function () {
    var s = stateWith({'COUNTRY|KES': {maxLoanAmount: '5', minLoanAmount: ''}});
    assert.equal(policy.overrideCount(s, 'COUNTRY', 'KES'), 1);
    assert.equal(policy.overrideCount(s, 'COUNTRY', 'RWF'), 0);
});

test('the change list names each added, removed and changed setting', function () {
    var before = starter();
    var after = starter().map(function (r) { return r.key === 'maxDaysPastDue' ? Object.assign({}, r, {value: 45}) : r; })
        .filter(function (r) { return r.key !== 'minAge'; })
        .concat([{scope: 'COUNTRY', scopeKey: 'KES', key: 'maxLoanAmount', value: 500000}]);
    var lines = policy.diff(before, after);
    assert.deepEqual(lines.map(function (l) { return l.type + ':' + l.scope + ':' + l.key + ':' + l.from + '>' + l.to; }).sort(), [
        'add:COUNTRY:maxLoanAmount:null>500000',
        'chg:GLOBAL:maxDaysPastDue:30>45',
        'rem:GLOBAL:minAge:18>null'
    ]);
    assert.deepEqual(policy.diff(before, starter()), []);
});
