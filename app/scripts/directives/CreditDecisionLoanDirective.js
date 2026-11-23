(function (module) {
    mifosX.directives = _.extend(module, {
        /*
         * The automated credit decision of one loan application, for the loan details page:
         * <credit-decision-loan loan="loandetails"></credit-decision-loan>
         * It shows whether the application needs a decision, whether someone verified its details, the button that sends
         * the request to the decision engine, and the outcome the engine replied with. Fineract builds and sends the
         * request. This only asks Fineract to do it and shows what came back.
         */
        CreditDecisionLoanDirective: function (resourceFactory, $rootScope, $translate) {
            /*
             * The page that works the decision, in the same table style as the rest of the loan screens: the decision,
             * then the facts behind it, with the action that moves it on beside the row it belongs to.
             */
            var pageTemplate =
                '<div class="cd cd-pg" ng-if="visible()">' +

                '  <div class="alert alert-info" ng-if="!status.required">' +
                '    {{\'label.creditdecision.loan.off\' | translate}}' +
                '    <button type="button" class="btn btn-primary btn-sm pull-right" id="cd-loan-require" ng-if="status.canChangeFlag" ng-disabled="busy || !hasPermission(\'UPDATE_CREDITDECISIONLOAN\')" ng-click="setRequired(true)">{{\'label.creditdecision.loan.require\' | translate}}</button>' +
                '  </div>' +

                '  <div ng-if="status.required">' +
                '    <div class="alert alert-danger" id="cd-loan-error" ng-if="outcome() == \'failed\'"><i class="fa fa-exclamation-circle"></i> {{status.errorMessage}}' +
                '      <div class="cd-small" id="cd-loan-retry" ng-if="retry()">{{retry().key | translate:{n: retry().n, at: (retry().at | date:\'medium\')} }}</div></div>' +
                '    <div class="alert alert-info" id="cd-loan-blocker" ng-if="showSend() && blockerKey() && isVerified()"><i class="fa fa-info-circle"></i> {{blockerKey() | translate}}</div>' +
                '    <div class="alert alert-warning" id="cd-loan-hold" ng-if="!blockerKey() && status.blocksApproval && !reviewAdvice()"><i class="fa fa-lock"></i> {{\'label.creditdecision.loan.hold\' | translate}}</div>' +

                '    <div class="cd-outcome" id="cd-loan-request" ng-class="\'cd-outcome-\' + stateName()">' +
                '      <div class="cd-outcome-main">' +
                '        <div class="cd-outcome-head" id="cd-loan-outcome" ng-if="outcome() == \'decided\'">' +
                '          <span class="label cd-decision-lg" ng-class="labelClass()">{{decisionKey() | translate}}</span>' +
                '          <span class="cd-score-lg" ng-if="status.score !== null && status.score !== undefined"><strong>{{status.score}}</strong> <span class="text-muted">{{\'label.creditdecision.loan.score\' | translate}}</span></span>' +
                '        </div>' +
                '        <div class="cd-outcome-head" ng-if="outcome() == \'failed\'"><span class="label label-danger cd-decision-lg">{{\'label.creditdecision.loan.request.FAILED\' | translate}}</span></div>' +
                '        <div class="cd-outcome-head" ng-if="outcome() == \'none\'"><span class="label label-default cd-decision-lg">{{\'label.creditdecision.loan.request.NOT_SENT\' | translate}}</span></div>' +
                '        <p class="cd-meaning" id="cd-loan-advice">{{meaningKey() | translate}}</p>' +
                '        <p class="cd-meaning cd-held" id="cd-loan-held" ng-if="holdsContract()"><i class="fa fa-lock"></i> {{heldKey() | translate}}</p>' +
                '        <div class="cd-facts" id="cd-loan-facts" ng-if="hasFacts()">' +
                '          <span class="cd-fact" ng-if="status.riskTier"><span class="text-muted">{{\'label.creditdecision.page.risktier\' | translate}}</span> <strong>{{status.riskTier}}</strong></span>' +
                '          <span class="cd-fact" ng-if="status.maxExposure !== null && status.maxExposure !== undefined"><span class="text-muted">{{\'label.creditdecision.page.maxexposure\' | translate}}</span> <strong>{{status.maxExposure | number:0}}</strong></span>' +
                '          <span class="cd-fact" ng-if="status.modelVersion"><span class="text-muted">{{\'label.creditdecision.page.model\' | translate}}</span> <strong>{{status.modelVersion}}</strong></span>' +
                '        </div>' +
                '        <div class="cd-why" id="cd-loan-reasons" ng-if="outcome() == \'decided\' && reasons().length">' +
                '          <span class="cd-why-title text-muted">{{\'label.creditdecision.page.why\' | translate}}</span>' +
                '          <span class="cd-chip" ng-repeat="r in reasons() track by $index" title="{{r}}">{{reasonText(r)}}</span>' +
                '        </div>' +
                '      </div>' +
                '      <div class="cd-outcome-action" ng-if="showSend()">' +
                '        <button type="button" class="btn" ng-class="outcome() == \'none\' ? \'btn-primary\' : \'btn-default\'" id="cd-loan-send" ng-disabled="busy || !canSend() || !hasPermission(\'SEND_CREDITDECISIONLOAN\')" ng-click="send()">' +
                '          <i class="fa fa-spinner fa-spin" ng-if="sending"></i><i class="fa fa-refresh" ng-if="!sending && outcome() != \'none\'"></i><i class="fa fa-paper-plane" ng-if="!sending && outcome() == \'none\'"></i> {{(outcome() == \'none\' ? \'label.creditdecision.loan.send\' : \'label.creditdecision.loan.sendagain\') | translate}}</button>' +
                '      </div>' +
                '    </div>' +

                '    <table class="table table-striped table-bordered cd-table">' +
                '      <tr id="cd-loan-verification">' +
                '        <th class="table-bold-loan">{{\'label.creditdecision.loan.verification\' | translate}}</th>' +
                '        <td>' +
                '          <span ng-if="isVerified()"><i class="fa fa-check text-success"></i> {{\'label.creditdecision.loan.verification.VERIFIED\' | translate}}' +
                '            &middot; {{status.verifiedBy}} &middot; {{status.verifiedOn | date:\'mediumDate\'}}<span ng-if="status.verificationNote"> &middot; &ldquo;{{status.verificationNote}}&rdquo;</span></span>' +
                '          <span ng-if="!isVerified()" class="text-muted">{{\'label.creditdecision.loan.verification.PENDING_VERIFICATION\' | translate}}</span>' +
                '          <span class="pull-right">' +
                '            <button type="button" class="btn btn-primary btn-sm" id="cd-loan-verify" ng-if="canVerify() && !ui.verifying" ng-disabled="busy || !hasPermission(\'VERIFY_CREDITDECISIONLOAN\')" ng-click="startVerify()">{{\'label.creditdecision.loan.verify\' | translate}}</button>' +
                '            <a class="btn btn-default btn-sm" ng-if="canVerify() && !ui.verifying" ng-href="#/editloanaccount/{{status.loanId}}">{{\'label.creditdecision.loan.editapplication\' | translate}}</a>' +
                '            <button type="button" class="btn btn-default btn-sm" id="cd-loan-reopen" ng-if="canReopen() && !ui.reopening && hasPermission(\'VERIFY_CREDITDECISIONLOAN\')" ng-click="startReopen()">{{\'label.creditdecision.loan.reopen\' | translate}}</button>' +
                '          </span>' +
                '        </td>' +
                '      </tr>' +
                '      <tr ng-if="status.requestedBy && outcome() != \'none\'">' +
                '        <th class="table-bold-loan">{{\'label.creditdecision.page.request\' | translate}}</th>' +
                '        <td>{{status.requestedBy}} &middot; {{status.requestedOn | date:\'medium\'}}' +
                '          <div class="text-muted cd-small">{{status.provider || \'-\'}}<span ng-if="status.replyMs !== null && status.replyMs !== undefined"> &middot; {{\'label.creditdecision.page.replied\' | translate}} {{seconds()}}</span> &middot; {{profile()}}<span ng-if="status.requestId"> &middot; {{\'label.creditdecision.page.requestid\' | translate}} <code id="cd-loan-requestid">{{status.requestId}}</code></span> &middot; <span class="cd-mode" title="{{\'label.creditdecision.mode.help.\' + status.profileMode | translate}}">{{\'label.creditdecision.mode.\' + status.profileMode | translate}} <i class="fa fa-question-circle"></i></span></div></td>' +
                '      </tr>' +
                '      <tr ng-if="!status.requestedBy || outcome() == \'none\'"><th class="table-bold-loan">{{\'label.creditdecision.record.profile\' | translate}}</th><td>{{profile()}} &middot; {{\'label.creditdecision.mode.\' + status.profileMode | translate}}</td></tr>' +
                '    </table>' +
                '    <p class="text-muted cd-small" id="cd-loan-readonly" ng-if="!status.sendStageOpen"><i class="fa fa-lock"></i> {{\'label.creditdecision.loan.readonly\' | translate}}</p>' +

                '    <div class="well well-sm" id="cd-loan-verify-panel" ng-if="ui.verifying">' +
                '      <div class="checkbox"><label><input type="checkbox" id="cd-loan-confirm" ng-model="ui.confirmed"/> {{\'label.creditdecision.loan.verify.confirm\' | translate}}</label></div>' +
                '      <textarea class="form-control" id="cd-loan-note" rows="2" maxlength="500" ng-model="ui.note" placeholder="{{\'label.creditdecision.loan.verify.note\' | translate}}"></textarea>' +
                '      <div class="cd-panel-actions">' +
                '        <button type="button" class="btn btn-primary btn-sm" id="cd-loan-verify-submit" ng-disabled="!ui.confirmed || busy" ng-click="verify()">{{\'label.creditdecision.loan.verify.submit\' | translate}}</button>' +
                '        <button type="button" class="btn btn-default btn-sm" ng-click="cancel()">{{\'label.button.cancel\' | translate}}</button>' +
                '      </div>' +
                '    </div>' +
                '    <div class="well well-sm" id="cd-loan-reopen-panel" ng-if="ui.reopening">' +
                '      <p>{{\'label.creditdecision.loan.reopen.warning\' | translate}}</p>' +
                '      <div class="cd-panel-actions">' +
                '        <button type="button" class="btn btn-primary btn-sm" id="cd-loan-reopen-submit" ng-disabled="busy" ng-click="reopen()">{{\'label.creditdecision.loan.reopen.submit\' | translate}}</button>' +
                '        <button type="button" class="btn btn-default btn-sm" ng-click="cancel()">{{\'label.button.cancel\' | translate}}</button>' +
                '      </div>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            /*
             * One line on the loan page, as a normal alert coloured by where the decision stands, with a way into the page
             * that works it. The page and the "Automated Credit Decision" tab hold the detail.
             */
            var stripTemplate =
                '<div class="alert cd cd-strip" ng-class="alertClass()" ng-if="visible()">' +
                '  <i class="fa fa-sliders"></i> <strong>{{\'label.creditdecision.loan.title\' | translate}}</strong>' +
                '  <span id="cd-strip-state">' +
                '    <span ng-if="!status.required">&mdash; {{\'label.creditdecision.loan.off\' | translate}}</span>' +
                '    <span ng-if="status.required && outcome() == \'decided\'">&mdash; <span class="label" ng-class="labelClass()">{{decisionKey() | translate}}</span>' +
                '      <span ng-if="status.score !== null && status.score !== undefined">&nbsp;{{\'label.creditdecision.loan.score\' | translate}} {{status.score}}</span></span>' +
                '    <span ng-if="status.required && outcome() == \'failed\'">&mdash; {{\'label.creditdecision.loan.request.FAILED\' | translate}}</span>' +
                '    <span ng-if="status.required && outcome() == \'none\'">&mdash; {{(isVerified() ? \'label.creditdecision.loan.strip.ready\' : \'label.creditdecision.loan.strip.pending\') | translate}}</span>' +
                '    <span ng-if="status.required">&middot; {{status.profileName}} &middot; {{\'label.creditdecision.mode.\' + status.profileMode | translate}}</span>' +
                '    <span id="cd-strip-hold" ng-if="status.required && status.blocksApproval">&middot; <i class="fa fa-lock"></i> {{\'label.creditdecision.loan.strip.hold\' | translate}}</span>' +
                '  </span>' +
                '  <span class="pull-right cd-strip-actions">' +
                '    <button type="button" class="btn btn-primary btn-sm" id="cd-loan-require" ng-if="!status.required" ng-disabled="busy || !hasPermission(\'UPDATE_CREDITDECISIONLOAN\')" ng-click="setRequired(true)">' +
                '      {{\'label.creditdecision.loan.require\' | translate}}</button>' +
                '    <a href="" id="cd-loan-notrequired" ng-if="status.required && status.canChangeFlag && outcome() != \'decided\' && hasPermission(\'UPDATE_CREDITDECISIONLOAN\')" ng-click="setRequired(false)">' +
                '      {{\'label.creditdecision.loan.remove\' | translate}}</a>' +
                '    <a class="btn btn-default btn-sm" id="cd-strip-open" ng-if="status.required" ng-href="#/loanaccount/{{status.loanId}}/creditdecision">' +
                '      {{(status.reviewStageOpen ? \'label.creditdecision.loan.strip.open\' : \'label.creditdecision.loan.strip.view\') | translate}}</a>' +
                '  </span>' +
                '</div>';

            return {
                restrict: 'E',
                scope: {
                    loan: '='
                },
                template: function (element, attrs) {
                    return attrs.mode === 'page' ? pageTemplate : stripTemplate;
                },
                link: function (scope, element, attrs) {
                    var logic = window.CreditDecisionLoan;
                    var page = attrs.mode === 'page';
                    scope.status = null;
                    scope.busy = false;
                    scope.sending = false;
                    scope.hasPermission = function (permission) {
                        return $rootScope.hasPermission(permission);
                    };

                    function resetPanels() {
                        scope.ui = {verifying: false, reopening: false, confirmed: false, note: ''};
                    }

                    function apply(data) {
                        scope.status = data;
                        scope.$emit('creditDecisionLoaded', data);
                        scope.busy = false;
                        scope.sending = false;
                        resetPanels();
                    }

                    function fail() {
                        // the error banner on the page says what went wrong
                        scope.busy = false;
                        scope.sending = false;
                        resetPanels();
                        if (scope.status && scope.status.loanId) {
                            load(scope.status.loanId);
                        }
                    }

                    function load(loanId) {
                        resourceFactory.creditDecisionLoanResource.get({loanId: loanId}, function (data) {
                            scope.status = data;
                            scope.$emit('creditDecisionLoaded', data);
                        });
                    }

                    function command(name, body) {
                        scope.busy = true;
                        resourceFactory.creditDecisionLoanResource.command({loanId: scope.status.loanId, command: name}, body || {}, apply, fail);
                    }

                    resetPanels();
                    scope.$on('creditDecisionReload', function () {
                        if (scope.loan && scope.loan.id) {
                            load(scope.loan.id);
                        }
                    });
                    scope.$watch('loan.id', function (id) {
                        if (id) {
                            load(id);
                        }
                    });

                    scope.visible = function () {
                        // the page that works the decision shows whatever there is, the strip only what is useful
                        return page ? !!scope.status : logic.visible(scope.status);
                    };
                    scope.isVerified = function () {
                        return logic.isVerified(scope.status);
                    };
                    scope.canVerify = function () {
                        return logic.canVerify(scope.status);
                    };
                    scope.canReopen = function () {
                        return logic.canReopen(scope.status);
                    };
                    scope.canSend = function () {
                        return logic.canSend(scope.status);
                    };
                    scope.retry = function () {
                        return logic.retry(scope.status);
                    };
                    scope.blockerKey = function () {
                        return logic.blockerKey(scope.status);
                    };
                    scope.decisionClass = function () {
                        return logic.decisionClass(scope.status && scope.status.decision);
                    };
                    scope.outcome = function () {
                        return logic.outcome(scope.status);
                    };
                    scope.profile = function () {
                        var s = scope.status || {};
                        // the profile the request was built from, or the product's own for an older record that did not keep it
                        var name = s.requestedProfileName || s.profileName;
                        return name ? name + (s.requestedVersionNo ? ' v' + s.requestedVersionNo : '') : '-';
                    };
                    scope.seconds = function () {
                        var ms = scope.status && scope.status.replyMs;
                        return ms === null || ms === undefined ? '-' : (ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1) + ' s');
                    };
                    scope.showSend = function () {
                        return logic.showSend(scope.status);
                    };
                    scope.reviewAdvice = function () {
                        return logic.reviewAdvice(scope.status);
                    };
                    scope.labelClass = function () {
                        return logic.labelClass(scope.status && scope.status.decision);
                    };
                    scope.alertClass = function () {
                        return logic.alertClass(scope.status);
                    };
                    scope.stateName = function () {
                        return logic.stateName(scope.status);
                    };
                    scope.reasons = function () {
                        return logic.reasonList(scope.status && scope.status.reasonCodes);
                    };
                    scope.reasonText = function (code) {
                        return logic.reasonText(code, function (key) {
                            return $translate.instant(key);
                        });
                    };
                    scope.holdsContract = function () {
                        return logic.holdsContract(scope.status);
                    };
                    scope.heldKey = function () {
                        return logic.heldKey(scope.status);
                    };
                    scope.hasFacts = function () {
                        return logic.hasFacts(scope.status);
                    };
                    scope.decisionKey = function () {
                        return logic.decisionKey(scope.status && scope.status.decision);
                    };
                    scope.meaningKey = function () {
                        return logic.meaningKey(scope.status);
                    };

                    scope.startVerify = function () {
                        resetPanels();
                        scope.ui.verifying = true;
                    };
                    scope.startReopen = function () {
                        resetPanels();
                        scope.ui.reopening = true;
                    };
                    scope.cancel = resetPanels;

                    scope.setRequired = function (required) {
                        scope.busy = true;
                        resourceFactory.creditDecisionLoanFlagResource.update({loanId: scope.status.loanId}, {required: required}, apply, fail);
                    };
                    scope.verify = function () {
                        command('verify', {note: scope.ui.note});
                    };
                    scope.reopen = function () {
                        command('unverify');
                    };
                    scope.send = function () {
                        scope.sending = true;
                        command('send');
                    };
                }
            };
        }
    });
    mifosX.ng.application.directive('creditDecisionLoan', ['ResourceFactory', '$rootScope', '$translate', mifosX.directives.CreditDecisionLoanDirective]).run(function ($log) {
        $log.info('CreditDecisionLoanDirective initialized');
    });
}(mifosX.directives || {}));
