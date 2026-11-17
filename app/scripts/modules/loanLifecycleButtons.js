(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.LoanLifecycleButtons = api;
})(typeof window !== 'undefined' ? window : global, function () {
    /*
     * Loan details action-bar stage buttons when Add-More-Stages-To-A-Loan-Life-Cycle
     * (isExtendLoanLifeCycleConfig) is on. Pure mapping from loan GET fields — never throws
     * on missing nextLoanIcReviewDecisionState (that used to wipe the whole button bar).
     *
     * Collateral: CBS accept/reject collateral APIs require DUE_DILIGENCE on the loan.
     * After collateral is accepted (current === COLLATERAL_REVIEW), forward follows next only;
     * do not invent IC Level One (IC One still validates DUE_DILIGENCE server-side).
     */

    function decisionValue(state) {
        return state && state.value ? state.value : null;
    }

    function button(name, taskPermissionName) {
        return {
            name: name,
            icon: 'fa fa-check',
            taskPermissionName: taskPermissionName
        };
    }

    function getLoanStage(data) {
        if (!data || data.isExtendLoanLifeCycleConfig == false) {
            return button('button.approve', 'APPROVE_LOAN');
        }

        if (data.isExtendLoanLifeCycleConfig != true) {
            return null;
        }

        var current = decisionValue(data.loanDecisionState);
        var next = decisionValue(data.nextLoanIcReviewDecisionState);

        if (data.loanDecisionState == null || data.loanDecisionState == '') {
            return button('button.reviewapplication', 'ACCEPT_LOANAPPLICATIONREVIEW');
        }

        if (current === 'REVIEW_APPLICATION') {
            return button('button.duediligence', 'ACCEPT_DUEDILIGENCE');
        }

        if (current === 'DUE_DILIGENCE') {
            if (next === 'COLLATERAL_REVIEW') {
                return button('button.collateralreview', 'ACCEPT_LOANCOLLATERALREVIEW');
            }
            return button('button.icreviewlevelone', 'ACCEPT_LOANICREVIEWDECISIONLEVELONE');
        }

        // COLLATERAL_REVIEW (post-accept): only follow a concrete next; never invent IC One
        if (current && current.indexOf('IC_REVIEW_LEVEL_') === 0 &&
            next && next.indexOf('IC_REVIEW_LEVEL_') === 0) {
            var nextLevel = next.replace('IC_REVIEW_LEVEL_', '').toLowerCase();
            return button(
                'button.icreviewlevel' + nextLevel,
                'ACCEPT_LOANICREVIEWDECISIONLEVEL' + nextLevel.toUpperCase()
            );
        }

        if (next === 'PREPARE_AND_SIGN_CONTRACT' && current !== 'PREPARE_AND_SIGN_CONTRACT') {
            return button('button.prepareandsigncontract', 'ACCEPT_LOANPREPAREANDSIGNCONTRACT');
        }

        // Final extended stage: Approve even when nextLoanIcReviewDecisionState is null/omitted
        if (current === 'PREPARE_AND_SIGN_CONTRACT') {
            return button('button.approve', 'APPROVE_LOAN');
        }

        return null;
    }

    function getUndoLoanStage(data) {
        if (!data || data.isExtendLoanLifeCycleConfig != true) {
            return null;
        }

        var current = decisionValue(data.loanDecisionState);
        var next = decisionValue(data.nextLoanIcReviewDecisionState);
        if (!current) {
            return null;
        }

        if (current === 'REVIEW_APPLICATION') {
            return button('button.rejectreviewapplication', 'REJECT_LOANAPPLICATIONREVIEW');
        }
        // Reject collateral is validated against DUE_DILIGENCE with next pending COLLATERAL_REVIEW
        if (current === 'DUE_DILIGENCE' && next === 'COLLATERAL_REVIEW') {
            return button('button.rejectcollateralreview', 'REJECT_LOANCOLLATERALREVIEW');
        }
        if (current === 'DUE_DILIGENCE') {
            return button('button.rejectduediligence', 'REJECT_DUEDILIGENCE');
        }
        if (current.indexOf('IC_REVIEW_LEVEL_') === 0) {
            var currentLevel = current.replace('IC_REVIEW_LEVEL_', '').toLowerCase();
            return button(
                'button.rejecticreviewlevel' + currentLevel,
                'REJECT_LOANICREVIEWDECISIONLEVEL' + currentLevel.toUpperCase()
            );
        }
        if (current === 'PREPARE_AND_SIGN_CONTRACT') {
            return button('button.rejectprepareandsigncontract', 'REJECT_LOANPREPAREANDSIGNCONTRACT');
        }

        return null;
    }

    return {
        getLoanStage: getLoanStage,
        getUndoLoanStage: getUndoLoanStage
    };
});
