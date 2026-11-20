const test = require('node:test');
const assert = require('node:assert/strict');
const buttons = require('../app/scripts/modules/loanLifecycleButtons');

function loan(over) {
    return Object.assign({
        isExtendLoanLifeCycleConfig: true,
        loanDecisionState: null,
        nextLoanIcReviewDecisionState: null
    }, over || {});
}

function state(value) {
    return { value: value, id: 1, code: 'code.' + value };
}

test('config off returns classic Approve', function () {
    var result = buttons.getLoanStage(loan({ isExtendLoanLifeCycleConfig: false }));
    assert.equal(result.name, 'button.approve');
    assert.equal(result.taskPermissionName, 'APPROVE_LOAN');
    assert.equal(buttons.getUndoLoanStage(loan({ isExtendLoanLifeCycleConfig: false })), null);
});

test('config on with no decision state starts Review Application', function () {
    var result = buttons.getLoanStage(loan());
    assert.equal(result.name, 'button.reviewapplication');
    assert.equal(result.taskPermissionName, 'ACCEPT_LOANAPPLICATIONREVIEW');
    assert.equal(buttons.getUndoLoanStage(loan()), null);
});

test('REVIEW_APPLICATION maps to Due Diligence and reject review', function () {
    var data = loan({ loanDecisionState: state('REVIEW_APPLICATION') });
    assert.equal(buttons.getLoanStage(data).name, 'button.duediligence');
    assert.equal(buttons.getUndoLoanStage(data).name, 'button.rejectreviewapplication');
});

test('DUE_DILIGENCE maps to IC Level One and reject due diligence', function () {
    var data = loan({
        loanDecisionState: state('DUE_DILIGENCE'),
        nextLoanIcReviewDecisionState: state('IC_REVIEW_LEVEL_ONE')
    });
    assert.equal(buttons.getLoanStage(data).name, 'button.icreviewlevelone');
    assert.equal(buttons.getUndoLoanStage(data).name, 'button.rejectduediligence');
});

test('DUE_DILIGENCE with next COLLATERAL_REVIEW shows collateral accept and reject', function () {
    var data = loan({
        loanDecisionState: state('DUE_DILIGENCE'),
        nextLoanIcReviewDecisionState: state('COLLATERAL_REVIEW')
    });
    assert.equal(buttons.getLoanStage(data).name, 'button.collateralreview');
    assert.equal(buttons.getLoanStage(data).taskPermissionName, 'ACCEPT_LOANCOLLATERALREVIEW');
    assert.equal(buttons.getUndoLoanStage(data).name, 'button.rejectcollateralreview');
    assert.equal(buttons.getUndoLoanStage(data).taskPermissionName, 'REJECT_LOANCOLLATERALREVIEW');
});

test('COLLATERAL_REVIEW with null next does not invent IC One or reject collateral', function () {
    var data = loan({
        loanDecisionState: state('COLLATERAL_REVIEW'),
        nextLoanIcReviewDecisionState: null
    });
    assert.equal(buttons.getLoanStage(data), null);
    assert.equal(buttons.getUndoLoanStage(data), null);
});

test('COLLATERAL_REVIEW with next Prepare and Sign follows next', function () {
    var data = loan({
        loanDecisionState: state('COLLATERAL_REVIEW'),
        nextLoanIcReviewDecisionState: state('PREPARE_AND_SIGN_CONTRACT')
    });
    assert.equal(buttons.getLoanStage(data).name, 'button.prepareandsigncontract');
    assert.equal(buttons.getUndoLoanStage(data), null);
});

test('IC level with next IC level builds dynamic next button', function () {
    var data = loan({
        loanDecisionState: state('IC_REVIEW_LEVEL_ONE'),
        nextLoanIcReviewDecisionState: state('IC_REVIEW_LEVEL_TWO')
    });
    var stage = buttons.getLoanStage(data);
    assert.equal(stage.name, 'button.icreviewleveltwo');
    assert.equal(stage.taskPermissionName, 'ACCEPT_LOANICREVIEWDECISIONLEVELTWO');
    assert.equal(buttons.getUndoLoanStage(data).name, 'button.rejecticreviewlevelone');
});

test('IC level with next Prepare and Sign returns prepareandsigncontract', function () {
    var data = loan({
        loanDecisionState: state('IC_REVIEW_LEVEL_TWO'),
        nextLoanIcReviewDecisionState: state('PREPARE_AND_SIGN_CONTRACT')
    });
    assert.equal(buttons.getLoanStage(data).name, 'button.prepareandsigncontract');
});

test('PREPARE_AND_SIGN_CONTRACT with matching next returns Approve', function () {
    var data = loan({
        loanDecisionState: state('PREPARE_AND_SIGN_CONTRACT'),
        nextLoanIcReviewDecisionState: state('PREPARE_AND_SIGN_CONTRACT')
    });
    assert.equal(buttons.getLoanStage(data).name, 'button.approve');
    assert.equal(buttons.getUndoLoanStage(data).name, 'button.rejectprepareandsigncontract');
});

test('PREPARE_AND_SIGN_CONTRACT with null next still returns Approve (no throw)', function () {
    var data = loan({
        loanDecisionState: state('PREPARE_AND_SIGN_CONTRACT'),
        nextLoanIcReviewDecisionState: null
    });
    assert.doesNotThrow(function () {
        buttons.getLoanStage(data);
    });
    assert.equal(buttons.getLoanStage(data).name, 'button.approve');
});

test('IC level with null next does not throw and returns null stage button', function () {
    var data = loan({
        loanDecisionState: state('IC_REVIEW_LEVEL_THREE'),
        nextLoanIcReviewDecisionState: null
    });
    assert.doesNotThrow(function () {
        buttons.getLoanStage(data);
    });
    assert.equal(buttons.getLoanStage(data), null);
    assert.equal(buttons.getUndoLoanStage(data).name, 'button.rejecticreviewlevelthree');
});

test('unmapped stage with null next does not throw', function () {
    var data = loan({
        loanDecisionState: state('SOME_UNKNOWN_STAGE'),
        nextLoanIcReviewDecisionState: null
    });
    assert.doesNotThrow(function () {
        buttons.getLoanStage(data);
        buttons.getUndoLoanStage(data);
    });
    assert.equal(buttons.getLoanStage(data), null);
    assert.equal(buttons.getUndoLoanStage(data), null);
});
