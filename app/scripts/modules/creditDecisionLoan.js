(function (root, factory) {
    var api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    root.CreditDecisionLoan = api;
})(typeof window !== 'undefined' ? window : global, function () {
    /*
     * What the loan details page shows about an automated credit decision. Everything here only reads the status
     * Fineract returned. The decision engine decides; the page displays it.
     */
    /* The directives of the Credit Scoring Process Flow. The class names only colour the page. */
    var DECISION_CLASS = {'AUTO_APPROVE': 'go', 'IC_REVIEW_REQUIRED': 'review', 'INELIGIBLE': 'nogo'};

    function blockers(status) {
        return (status && status.blockers) || [];
    }

    /* The card is for loans that need a decision, and for pending loans that could be flagged. Otherwise it stays out of the way. */
    function visible(status) {
        return !!status && (!!status.required || (!!status.eligible && !!status.canChangeFlag));
    }

    function isVerified(status) {
        return !!status && status.verificationStatus === 'VERIFIED';
    }

    /* Verifying, re-opening and sending belong to one stage of the application. Past it the decision is only looked at. */
    function canVerify(status) {
        return !!status && !!status.required && !!status.reviewStageOpen && !isVerified(status);
    }

    function canReopen(status) {
        return !!status && !!status.required && !!status.reviewStageOpen && isVerified(status);
    }

    /* AUTO_APPROVE and INELIGIBLE are the engine's last word. IC_REVIEW_REQUIRED can be asked again while the review is open. */
    function isFinal(status) {
        return !!status && status.requestStatus === 'DECIDED' && status.decision !== 'IC_REVIEW_REQUIRED';
    }

    /* A request can be sent now, or sent again, and the engine has not given a final outcome. */
    function showSend(status) {
        return !!status && !!status.required && !!status.sendStageOpen && !isFinal(status);
    }

    /* The engine asked for IC review and the application can still be sent again, for example after correcting its details. */
    function reviewAdvice(status) {
        return !!status && !!status.required && !!status.sendStageOpen && status.requestStatus === 'DECIDED' && status.decision === 'IC_REVIEW_REQUIRED';
    }

    function isLive(status) {
        return !!status && status.profileMode === 'LIVE';
    }

    /* A Live profile found the application ineligible: it is rejected, and nothing moves it forward. */
    function isIneligible(status) {
        return !!status && !!status.required && isLive(status) && status.requestStatus === 'DECIDED' && status.decision === 'INELIGIBLE';
    }

    function hasRecord(status) {
        return !!status && !!status.required && status.requestStatus === 'DECIDED';
    }

    /* The request or the reply as indented JSON, or as it came when it is not JSON. */
    function pretty(text) {
        if (!text) {
            return '';
        }
        try {
            return JSON.stringify(JSON.parse(text), null, 2);
        } catch (e) {
            return String(text);
        }
    }

    var DECISION_BUTTON = {
        name: 'button.creditdecision',
        icon: 'fa fa-sliders',
        taskPermissionName: 'VERIFY_CREDITDECISIONLOAN'
    };

    function without(buttons, names) {
        return buttons.filter(function (button) {
            return button && names.indexOf(button.name) === -1;
        });
    }

    /*
     * The buttons on the top of the loan page, changed for an application that needs an automated credit decision.
     * The decision is worked in Review Application, and its outcome decides what comes after Due Diligence:
     * - in Review Application, an Automated Credit Decision button opens the page; Due Diligence waits for the outcome, and the
     *   review cannot be returned once the engine has given it. An ineligible application cannot go on to Due Diligence;
     * - after Due Diligence, AUTO_APPROVE skips IC review and goes to Prepare and sign contract, IC_REVIEW_REQUIRED goes to IC
     *   review as usual, and INELIGIBLE can only be rejected.
     * Without the longer lifecycle the button is there while the application waits for approval.
     */
    function adjustButtons(buttons, status, stage, extendedLifecycle) {
        if (!buttons || !status || !status.required) {
            return buttons;
        }
        var list = without(buttons, [DECISION_BUTTON.name]);
        if (!extendedLifecycle) {
            return status.reviewStageOpen ? [DECISION_BUTTON].concat(list) : list;
        }
        if (stage === 'REVIEW_APPLICATION') {
            var drop = [];
            if (status.blocksApproval || isIneligible(status)) {
                drop.push('button.duediligence');
            }
            if (hasRecord(status)) {
                drop.push('button.rejectreviewapplication');
            }
            list = without(list, drop);
            var at = -1;
            list.forEach(function (button, index) {
                if (at === -1 && (button.name === 'button.duediligence' || button.name === 'button.rejectreviewapplication')) {
                    at = index;
                }
            });
            list.splice(at === -1 ? 0 : at, 0, DECISION_BUTTON);
            return list;
        }
        if (stage === 'DUE_DILIGENCE') {
            // AUTO_APPROVE: contract open, IC review closed. INELIGIBLE: both closed. IC_REVIEW_REQUIRED, Shadow and the rest: IC review as usual
            if (status.blocksIcReview && status.blocksContract) {
                return without(list, ['button.icreviewlevelone']);
            }
            if (status.blocksIcReview && !status.blocksContract) {
                return list.map(function (button) {
                    return button.name === 'button.icreviewlevelone' ? {
                        name: 'button.prepareandsigncontract',
                        icon: 'fa fa-check',
                        taskPermissionName: 'ACCEPT_LOANPREPAREANDSIGNCONTRACT'
                    } : button;
                });
            }
            return list;
        }
        return list;
    }

    /* Why the application cannot move forward yet, as a translation key: ineligible, or it has to go through IC review first. */
    function heldKey(status) {
        if (!status || !status.required || status.requestStatus !== 'DECIDED') {
            return null;
        }
        if (status.decision === 'INELIGIBLE' && isLive(status)) {
            return 'label.creditdecision.page.held.INELIGIBLE';
        }
        if (status.decision === 'IC_REVIEW_REQUIRED' && status.blocksContract) {
            return 'label.creditdecision.page.held.IC_REVIEW_REQUIRED';
        }
        return null;
    }

    /* The engine answered and the application cannot go on to the contract yet. */
    function holdsContract(status) {
        return heldKey(status) !== null;
    }

    /* What the engine reported besides the decision: the risk tier, the largest exposure it allows, the model that scored. */
    function hasFacts(status) {
        return !!status && status.requestStatus === 'DECIDED' && (!!status.riskTier || (status.maxExposure !== null && status.maxExposure !== undefined) || !!status.modelVersion);
    }

    /* Translation key of a decision's name, so the screens show "Auto-approve" rather than AUTO_APPROVE. */
    function decisionKey(decision) {
        return 'label.creditdecision.decision.' + (DECISION_CLASS[decision] ? decision : 'OTHER');
    }

    function canSend(status) {
        return !!status && !!status.required && blockers(status).length === 0;
    }

    /* The first reason the request cannot be sent, as a translation key. Pending verification has its own button. */
    function blockerKey(status) {
        var list = blockers(status);
        return list.length ? 'label.creditdecision.loan.blocker.' + list[0] : null;
    }

    function decisionClass(decision) {
        return DECISION_CLASS[decision] || '';
    }

    /* Bootstrap label colour for a decision, so it looks like the other labels in the app. */
    var LABEL_CLASS = {'AUTO_APPROVE': 'label-success', 'IC_REVIEW_REQUIRED': 'label-warning', 'INELIGIBLE': 'label-danger'};

    function labelClass(decision) {
        return LABEL_CLASS[decision] || 'label-default';
    }

    function outcome(status) {
        if (!status) {
            return 'none';
        }
        if (status.requestStatus === 'DECIDED') {
            return 'decided';
        }
        if (status.requestStatus === 'FAILED') {
            return 'failed';
        }
        return 'none';
    }

    /*
     * One word for where the application is, used to colour the card so the state reads without reading the text:
     * idle (not flagged), pending (waiting for verification), ready (verified, not sent), go / review / nogo (the
     * engine's answer) or failed (no usable reply).
     */
    function stateName(status) {
        if (!status || !status.required) {
            return 'idle';
        }
        var result = outcome(status);
        if (result === 'decided') {
            return decisionClass(status.decision) || 'ready';
        }
        if (result === 'failed') {
            return 'failed';
        }
        return isVerified(status) ? 'ready' : 'pending';
    }

    /* "A, B" as ['A', 'B'], so each reason can be shown on its own. */
    function reasonList(codes) {
        if (!codes) {
            return [];
        }
        return String(codes).split(',').map(function (code) {
            return code.trim();
        }).filter(function (code) {
            return code.length > 0;
        });
    }

    /* BUREAU_SCORE_LOW as "Bureau score low", so a code nobody has written a sentence for is still readable. */
    function humanize(code) {
        var text = String(code === null || code === undefined ? '' : code).trim();
        if (!/^[A-Z0-9_\-]+$/.test(text) || text.length < 4) {
            return text;
        }
        var words = text.split(/[_\-]+/).filter(Boolean).map(function (word) {
            return /\d/.test(word) ? word : word.toLowerCase();
        });
        var line = words.join(' ');
        return line.charAt(0).toUpperCase() + line.slice(1);
    }

    /* The sentence written for a reason code, or the readable form of the code when there is none. */
    function reasonText(code, translate) {
        var key = 'label.creditdecision.reason.' + code;
        var text = translate ? translate(key) : key;
        return text && text !== key ? text : humanize(code);
    }

    /* Translation key of what the outcome means for the application, in one sentence. */
    function meaningKey(status) {
        if (reviewAdvice(status)) {
            return 'label.creditdecision.page.advice';
        }
        var result = outcome(status);
        if (result === 'decided') {
            return 'label.creditdecision.page.meaning.' + (DECISION_CLASS[status.decision] ? status.decision : 'OTHER');
        }
        if (result === 'failed') {
            return 'label.creditdecision.page.meaning.FAILED';
        }
        return isVerified(status) ? 'label.creditdecision.page.ready' : 'label.creditdecision.page.verifyfirst';
    }

    /* Bootstrap alert colour for the line on the loan page: the engine's answer, or neutral while nothing is decided. */
    function alertClass(status) {
        var name = stateName(status);
        if (name === 'go') {
            return 'alert-success';
        }
        if (name === 'review') {
            return 'alert-warning';
        }
        return name === 'nogo' || name === 'failed' ? 'alert-danger' : 'alert-info';
    }

    /*
     * What happens after a send that failed: the next automatic retry, the credit team having been told, or nothing until
     * somebody sends it again. Null when the last send did not fail.
     */
    function retry(status) {
        if (!status || status.requestStatus !== 'FAILED') {
            return null;
        }
        var n = status.failureCount || 1;
        if (status.nextRetryOn) {
            return {key: 'label.creditdecision.loan.retry.scheduled', n: n, at: status.nextRetryOn};
        }
        if (status.alertedOn) {
            return {key: 'label.creditdecision.loan.retry.alerted', n: n, at: status.alertedOn};
        }
        return {key: 'label.creditdecision.loan.retry.manual', n: n, at: null};
    }

    return {
        retry: retry,
        isFinal: isFinal,
        showSend: showSend,
        reviewAdvice: reviewAdvice,
        holdsContract: holdsContract,
        heldKey: heldKey,
        hasFacts: hasFacts,
        decisionKey: decisionKey,
        isIneligible: isIneligible,
        alertClass: alertClass,
        labelClass: labelClass,
        adjustButtons: adjustButtons,
        hasRecord: hasRecord,
        pretty: pretty,
        stateName: stateName,
        reasonList: reasonList,
        humanize: humanize,
        reasonText: reasonText,
        meaningKey: meaningKey,
        visible: visible,
        isVerified: isVerified,
        canVerify: canVerify,
        canReopen: canReopen,
        canSend: canSend,
        blockerKey: blockerKey,
        decisionClass: decisionClass,
        outcome: outcome
    };
});
