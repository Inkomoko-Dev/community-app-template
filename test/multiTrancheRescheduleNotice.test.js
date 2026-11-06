const test = require('node:test');
const assert = require('node:assert/strict');
const notice = require('../app/scripts/modules/multiTrancheRescheduleNotice');

test('a single-disbursement loan has no tranche warning', function () {
    assert.equal(notice.assess({multiDisburseLoan: false}, '2026-07-01'), null);
});

test('a later disbursed tranche is called out when the reschedule date is on or before it', function () {
    const assessment = notice.assess({
        multiDisburseLoan: true,
        disbursementDetails: [
            {principal: 100000, actualDisbursementDate: [2026, 1, 15]},
            {principal: 40000, actualDisbursementDate: [2026, 8, 1]},
            {principal: 20000}
        ]
    }, [2026, 7, 1]);

    assert.equal(assessment.disbursedCount, 2);
    assert.equal(assessment.pendingCount, 1);
    assert.equal(assessment.pendingPrincipal, 20000);
    assert.equal(assessment.includesLaterDisbursement, true);
    const lines = notice.lines(assessment, function (key) {
        return key;
    });
    assert.equal(lines.length, 4);
    assert.equal(lines[1], 'label.warning.multitranche.reschedule.later.disbursed');
    assert.equal(lines[2], 'label.warning.multitranche.reschedule.later.folded');
    assert.equal(lines[3], 'label.warning.multitranche.reschedule.pending');
});

test('a later tranche is not described as folded when the selected date is after it', function () {
    const assessment = notice.assess({
        multiDisburseLoan: true,
        disbursementDetails: [
            {principal: 100000, actualDisbursementDate: [2026, 1, 15]},
            {principal: 40000, actualDisbursementDate: [2026, 8, 1]}
        ]
    }, [2026, 9, 1]);

    assert.equal(assessment.includesLaterDisbursement, false);
    const lines = notice.lines(assessment, function (key) {
        return key;
    });
    assert.equal(lines.indexOf('label.warning.multitranche.reschedule.later.folded'), -1);
    assert.notEqual(lines.indexOf('label.warning.multitranche.reschedule.later.disbursed'), -1);
});

test('a multi-tranche loan with nothing disbursed is blocked instead of confirmed', function () {
    const assessment = notice.assess({
        multiDisburseLoan: true,
        disbursementDetails: [{principal: 100000}]
    }, [2026, 7, 1]);

    assert.equal(assessment.nothingDisbursed, true);
    assert.deepEqual(notice.lines(assessment, function (key) {
        return key;
    }), []);
});
