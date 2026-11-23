const test = require('node:test');
const assert = require('node:assert/strict');
const loan = require('../app/scripts/modules/creditDecisionLoan');

function status(over) {
    return Object.assign({
        eligible: true, required: true, canChangeFlag: true, reviewStageOpen: true, verificationStatus: 'PENDING_VERIFICATION',
        requestStatus: 'NOT_SENT', blockers: ['PENDING_VERIFICATION'], decision: null
    }, over || {});
}

test('the card shows for a loan that needs a decision, or a pending loan that could ask for one', function () {
    assert.equal(loan.visible(null), false);
    assert.equal(loan.visible(status()), true);
    assert.equal(loan.visible(status({required: false})), true);
    // not flagged and past approval: nothing to offer
    assert.equal(loan.visible(status({required: false, canChangeFlag: false})), false);
    // the product is in no profile
    assert.equal(loan.visible(status({required: false, eligible: false, canChangeFlag: false})), false);
    // a flagged loan stays visible after approval so the outcome can still be read
    assert.equal(loan.visible(status({canChangeFlag: false, requestStatus: 'DECIDED'})), true);
});

test('verifying is offered until verified, and re-opening once verified, only while the application is in the review stage', function () {
    assert.equal(loan.canVerify(status()), true);
    assert.equal(loan.canReopen(status()), false);

    const verified = status({verificationStatus: 'VERIFIED', blockers: []});
    assert.equal(loan.isVerified(verified), true);
    assert.equal(loan.canVerify(verified), false);
    assert.equal(loan.canReopen(verified), true);

    assert.equal(loan.canVerify(status({reviewStageOpen: false})), false);
    assert.equal(loan.canReopen(status({verificationStatus: 'VERIFIED', reviewStageOpen: false})), false);
    assert.equal(loan.canVerify(status({required: false})), false);
});

test('the request can be sent only when nothing stands in the way', function () {
    assert.equal(loan.canSend(status()), false);
    assert.equal(loan.canSend(status({blockers: []})), true);
    assert.equal(loan.canSend(status({required: false, blockers: []})), false);
    assert.equal(loan.canSend(null), false);
});

test('the reason it cannot be sent is a translation key for the first blocker', function () {
    assert.equal(loan.blockerKey(status({blockers: ['PROFILE_OFF', 'ENGINE_NOT_CONNECTED']})), 'label.creditdecision.loan.blocker.PROFILE_OFF');
    assert.equal(loan.blockerKey(status({blockers: []})), null);
    assert.equal(loan.blockerKey(null), null);
});

test('the decision gets the colour of its word, and anything unknown none', function () {
    assert.equal(loan.decisionClass('AUTO_APPROVE'), 'go');
    assert.equal(loan.decisionClass('IC_REVIEW_REQUIRED'), 'review');
    assert.equal(loan.decisionClass('INELIGIBLE'), 'nogo');
    assert.equal(loan.decisionClass('MAYBE'), '');
    assert.equal(loan.decisionClass(null), '');
});

test('the outcome is decided, failed or none', function () {
    assert.equal(loan.outcome(status({requestStatus: 'DECIDED'})), 'decided');
    assert.equal(loan.outcome(status({requestStatus: 'FAILED'})), 'failed');
    assert.equal(loan.outcome(status()), 'none');
    assert.equal(loan.outcome(null), 'none');
});

test('the card is coloured by where the application is', function () {
    assert.equal(loan.stateName(null), 'idle');
    assert.equal(loan.stateName(status({required: false})), 'idle');
    assert.equal(loan.stateName(status({required: true, verificationStatus: 'PENDING_VERIFICATION'})), 'pending');
    assert.equal(loan.stateName(status({required: true, verificationStatus: 'VERIFIED'})), 'ready');
    assert.equal(loan.stateName(status({required: true, verificationStatus: 'VERIFIED', requestStatus: 'DECIDED', decision: 'AUTO_APPROVE'})), 'go');
    assert.equal(loan.stateName(status({required: true, verificationStatus: 'VERIFIED', requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED'})), 'review');
    assert.equal(loan.stateName(status({required: true, verificationStatus: 'VERIFIED', requestStatus: 'DECIDED', decision: 'INELIGIBLE'})), 'nogo');
    assert.equal(loan.stateName(status({required: true, verificationStatus: 'VERIFIED', requestStatus: 'FAILED'})), 'failed');
    assert.equal(loan.stateName(status({required: true, verificationStatus: 'VERIFIED', requestStatus: 'DECIDED', decision: 'MAYBE'})), 'ready');
});

test('reason codes are split so each can be shown on its own', function () {
    assert.deepEqual(loan.reasonList('BUREAU_LISTED, CURRENT_ARREARS'), ['BUREAU_LISTED', 'CURRENT_ARREARS']);
    assert.deepEqual(loan.reasonList(' A ,, B '), ['A', 'B']);
    assert.deepEqual(loan.reasonList(''), []);
    assert.deepEqual(loan.reasonList(null), []);
});

const names = function (buttons) {
    return buttons.map(function (b) { return b.name; });
};
const base = function () {
    return [{name: 'button.addloancharge'}, {name: 'button.duediligence'}, {name: 'button.rejectreviewapplication'}, {name: 'button.modifyapplication'}];
};

test('a record is there once the engine has replied, and not for a failed or unsent request', function () {
    assert.equal(loan.hasRecord(status({requestStatus: 'DECIDED'})), true);
    assert.equal(loan.hasRecord(status({requestStatus: 'FAILED'})), false);
    assert.equal(loan.hasRecord(status()), false);
    assert.equal(loan.hasRecord(status({required: false, requestStatus: 'DECIDED'})), false);
    assert.equal(loan.hasRecord(null), false);
});

test('request and reply are shown indented, or as they came when they are not JSON', function () {
    assert.equal(loan.pretty('{"a":1}'), '{\n  "a": 1\n}');
    assert.equal(loan.pretty('not json'), 'not json');
    assert.equal(loan.pretty(null), '');
});

test('buttons are left alone for a loan that does not need a decision', function () {
    const buttons = base();
    assert.equal(loan.adjustButtons(buttons, status({required: false}), 'REVIEW_APPLICATION', true), buttons);
    assert.equal(loan.adjustButtons(buttons, null, 'REVIEW_APPLICATION', true), buttons);
});

test('in review the decision button opens the page and due diligence waits for the outcome', function () {
    const waiting = status({blocksApproval: true});
    assert.deepEqual(names(loan.adjustButtons(base(), waiting, 'REVIEW_APPLICATION', true)),
        ['button.addloancharge', 'button.creditdecision', 'button.rejectreviewapplication', 'button.modifyapplication']);

    const decided = status({blocksApproval: false, requestStatus: 'DECIDED'});
    // due diligence is back, and the review cannot be returned any more
    assert.deepEqual(names(loan.adjustButtons(base(), decided, 'REVIEW_APPLICATION', true)),
        ['button.addloancharge', 'button.creditdecision', 'button.duediligence', 'button.modifyapplication']);

    // running it twice does not add the button twice
    const once = loan.adjustButtons(base(), decided, 'REVIEW_APPLICATION', true);
    assert.equal(names(loan.adjustButtons(once, decided, 'REVIEW_APPLICATION', true)).filter(function (n) { return n === 'button.creditdecision'; }).length, 1);
});

test('the contract button that replaces IC review keeps its own permission', function () {
    const buttons = [{name: 'button.icreviewlevelone'}, {name: 'button.rejectduediligence'}];
    const result = loan.adjustButtons(buttons, status({requestStatus: 'DECIDED', decision: 'AUTO_APPROVE', blocksIcReview: true, blocksContract: false}), 'DUE_DILIGENCE', true);
    assert.deepEqual(names(result), ['button.prepareandsigncontract', 'button.rejectduediligence']);
    assert.equal(result[0].taskPermissionName, 'ACCEPT_LOANPREPAREANDSIGNCONTRACT');
});

test('without the longer lifecycle the decision button is offered while the application waits for approval', function () {
    assert.deepEqual(names(loan.adjustButtons([{name: 'button.approve'}], status(), undefined, false)), ['button.creditdecision', 'button.approve']);
    assert.deepEqual(names(loan.adjustButtons([{name: 'button.approve'}], status({reviewStageOpen: false}), undefined, false)), ['button.approve']);
});

test('a decision and the line on the loan page take their colours from Bootstrap', function () {
    assert.equal(loan.labelClass('AUTO_APPROVE'), 'label-success');
    assert.equal(loan.labelClass('IC_REVIEW_REQUIRED'), 'label-warning');
    assert.equal(loan.labelClass('INELIGIBLE'), 'label-danger');
    assert.equal(loan.labelClass('SOMETHING-NEW'), 'label-default');

    assert.equal(loan.alertClass(status({requestStatus: 'DECIDED', decision: 'AUTO_APPROVE'})), 'alert-success');
    assert.equal(loan.alertClass(status({requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED'})), 'alert-warning');
    assert.equal(loan.alertClass(status({requestStatus: 'DECIDED', decision: 'INELIGIBLE'})), 'alert-danger');
    assert.equal(loan.alertClass(status({requestStatus: 'FAILED'})), 'alert-danger');
    assert.equal(loan.alertClass(status()), 'alert-info');
    assert.equal(loan.alertClass(null), 'alert-info');
});

test('only an IC_REVIEW_REQUIRED outcome can be asked for again, and only until the stage is over', function () {
    const review = status({requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED', sendStageOpen: true, blockers: []});
    assert.equal(loan.isFinal(review), false);
    assert.equal(loan.showSend(review), true);
    assert.equal(loan.reviewAdvice(review), true);

    const go = status({requestStatus: 'DECIDED', decision: 'AUTO_APPROVE', sendStageOpen: true, blockers: ['OUTCOME_FINAL']});
    assert.equal(loan.isFinal(go), true);
    assert.equal(loan.showSend(go), false);
    assert.equal(loan.reviewAdvice(go), false);
    assert.equal(loan.isFinal(status({requestStatus: 'DECIDED', decision: 'INELIGIBLE'})), true);

    // past the stage nothing can be sent, whatever the outcome was
    assert.equal(loan.showSend(status({requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED', sendStageOpen: false})), false);
    assert.equal(loan.reviewAdvice(status({requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED', sendStageOpen: false})), false);

    // nothing sent yet, or a failed request, can be sent
    assert.equal(loan.showSend(status({sendStageOpen: true})), true);
    assert.equal(loan.showSend(status({sendStageOpen: true, requestStatus: 'FAILED'})), true);
    assert.equal(loan.showSend(status({required: false, sendStageOpen: true})), false);
    assert.equal(loan.isFinal(null), false);
});

test('after due diligence the outcome decides the next step: contract, IC review, or only a rejection', function () {
    const buttons = [{name: 'button.icreviewlevelone'}, {name: 'button.rejectduediligence'}];

    // AUTO_APPROVE skips IC review and goes to the contract
    const approved = status({requestStatus: 'DECIDED', decision: 'AUTO_APPROVE', profileMode: 'LIVE', blocksIcReview: true, blocksContract: false});
    assert.deepEqual(names(loan.adjustButtons(buttons, approved, 'DUE_DILIGENCE', true)), ['button.prepareandsigncontract', 'button.rejectduediligence']);
    assert.equal(loan.holdsContract(approved), false);
    assert.equal(loan.heldKey(approved), null);

    // IC_REVIEW_REQUIRED goes to IC review as usual and the contract waits for it
    const ic = status({requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED', profileMode: 'LIVE', blocksIcReview: false, blocksContract: true});
    assert.deepEqual(names(loan.adjustButtons(buttons, ic, 'DUE_DILIGENCE', true)), ['button.icreviewlevelone', 'button.rejectduediligence']);
    assert.equal(loan.heldKey(ic), 'label.creditdecision.page.held.IC_REVIEW_REQUIRED');

    // INELIGIBLE can only be rejected
    const ineligible = status({requestStatus: 'DECIDED', decision: 'INELIGIBLE', profileMode: 'LIVE', blocksIcReview: true, blocksContract: true});
    assert.deepEqual(names(loan.adjustButtons(buttons, ineligible, 'DUE_DILIGENCE', true)), ['button.rejectduediligence']);
    assert.equal(loan.heldKey(ineligible), 'label.creditdecision.page.held.INELIGIBLE');
    assert.equal(loan.isIneligible(ineligible), true);

    // Shadow never holds anything back
    const shadow = status({requestStatus: 'DECIDED', decision: 'INELIGIBLE', profileMode: 'SHADOW', blocksIcReview: false, blocksContract: false});
    assert.deepEqual(names(loan.adjustButtons(buttons, shadow, 'DUE_DILIGENCE', true)), ['button.icreviewlevelone', 'button.rejectduediligence']);
    assert.equal(loan.heldKey(shadow), null);
    assert.equal(loan.isIneligible(shadow), false);
});

test('in the review stage an ineligible application cannot go on to Due Diligence', function () {
    const buttons = [{name: 'button.duediligence'}, {name: 'button.rejectreviewapplication'}];
    const ineligible = status({requestStatus: 'DECIDED', decision: 'INELIGIBLE', profileMode: 'LIVE', blocksApproval: false});
    assert.deepEqual(names(loan.adjustButtons(buttons, ineligible, 'REVIEW_APPLICATION', true)), ['button.creditdecision']);
    const ic = status({requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED', profileMode: 'LIVE', blocksApproval: false});
    assert.deepEqual(names(loan.adjustButtons(buttons, ic, 'REVIEW_APPLICATION', true)), ['button.creditdecision', 'button.duediligence']);
});

test('the risk tier, maximum exposure and model version show once there is an outcome', function () {
    assert.equal(loan.hasFacts(status({requestStatus: 'DECIDED', riskTier: 'LOW'})), true);
    assert.equal(loan.hasFacts(status({requestStatus: 'DECIDED', maxExposure: 0})), true);
    assert.equal(loan.hasFacts(status({requestStatus: 'DECIDED', modelVersion: 'scorecard-v3'})), true);
    assert.equal(loan.hasFacts(status({requestStatus: 'DECIDED', riskTier: null, maxExposure: null, modelVersion: null})), false);
    assert.equal(loan.hasFacts(status({riskTier: 'LOW'})), false);
    assert.equal(loan.hasFacts(null), false);
});

test('a decision is named by a translation key, with a fallback for one the page does not know', function () {
    assert.equal(loan.decisionKey('AUTO_APPROVE'), 'label.creditdecision.decision.AUTO_APPROVE');
    assert.equal(loan.decisionKey('INELIGIBLE'), 'label.creditdecision.decision.INELIGIBLE');
    assert.equal(loan.decisionKey('MAYBE'), 'label.creditdecision.decision.OTHER');
    assert.equal(loan.decisionKey(null), 'label.creditdecision.decision.OTHER');
});

test('a reason code reads as a sentence, or as plain words when no sentence was written', function () {
    assert.equal(loan.humanize('BUREAU_SCORE_LOW'), 'Bureau score low');
    assert.equal(loan.humanize('WRITTEN_OFF_24M'), 'Written off 24M');
    assert.equal(loan.humanize('R12'), 'R12');
    assert.equal(loan.humanize('Already a sentence'), 'Already a sentence');
    assert.equal(loan.humanize(null), '');
    const translate = function (key) {
        return key === 'label.creditdecision.reason.CURRENT_ARREARS' ? 'Currently in arrears' : key;
    };
    assert.equal(loan.reasonText('CURRENT_ARREARS', translate), 'Currently in arrears');
    assert.equal(loan.reasonText('BUREAU_LISTED', translate), 'Bureau listed');
});

test('one sentence says what the outcome means for the application', function () {
    assert.equal(loan.meaningKey(status({requestStatus: 'DECIDED', decision: 'AUTO_APPROVE', sendStageOpen: false})), 'label.creditdecision.page.meaning.AUTO_APPROVE');
    assert.equal(loan.meaningKey(status({requestStatus: 'DECIDED', decision: 'INELIGIBLE', sendStageOpen: true})), 'label.creditdecision.page.meaning.INELIGIBLE');
    assert.equal(loan.meaningKey(status({requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED', sendStageOpen: false})), 'label.creditdecision.page.meaning.IC_REVIEW_REQUIRED');
    assert.equal(loan.meaningKey(status({requestStatus: 'DECIDED', decision: 'IC_REVIEW_REQUIRED', sendStageOpen: true})), 'label.creditdecision.page.advice');
    assert.equal(loan.meaningKey(status({requestStatus: 'DECIDED', decision: 'MAYBE'})), 'label.creditdecision.page.meaning.OTHER');
    assert.equal(loan.meaningKey(status({requestStatus: 'FAILED'})), 'label.creditdecision.page.meaning.FAILED');
    assert.equal(loan.meaningKey(status()), 'label.creditdecision.page.verifyfirst');
    assert.equal(loan.meaningKey(status({verificationStatus: 'VERIFIED'})), 'label.creditdecision.page.ready');
});

test('a failed send says whether it will be retried, whether the team was told, or that it waits for a person', function () {
    assert.equal(loan.retry(status({requestStatus: 'DECIDED'})), null);
    assert.equal(loan.retry(null), null);
    assert.deepEqual(loan.retry(status({requestStatus: 'FAILED', failureCount: 2, nextRetryOn: '2026-11-09T10:20:00'})),
        {key: 'label.creditdecision.loan.retry.scheduled', n: 2, at: '2026-11-09T10:20:00'});
    assert.deepEqual(loan.retry(status({requestStatus: 'FAILED', failureCount: 5, alertedOn: '2026-11-09T14:00:00'})),
        {key: 'label.creditdecision.loan.retry.alerted', n: 5, at: '2026-11-09T14:00:00'});
    assert.deepEqual(loan.retry(status({requestStatus: 'FAILED'})), {key: 'label.creditdecision.loan.retry.manual', n: 1, at: null});
});
