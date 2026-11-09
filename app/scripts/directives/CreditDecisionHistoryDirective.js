(function (module) {
    mifosX.directives = _.extend(module, {
        /*
         * What was done to the automated credit decision of one application, by whom and when, newest first:
         * <credit-decision-history status="creditDecision"></credit-decision-history>
         * It reads the history from Fineract again whenever the status it is given changes, so a new action shows up at once.
         */
        CreditDecisionHistoryDirective: function (resourceFactory, $translate) {
            var template =
                '<div class="cd cd-history" ng-if="events.length">' +
                '  <h4>{{\'label.creditdecision.history.title\' | translate}}</h4>' +
                '  <ul class="cd-timeline" id="cd-history">' +
                '    <li ng-repeat="e in events track by e.id" ng-class="\'cd-ev-\' + e.eventType">' +
                '      <span class="cd-ev-dot"><i class="fa" ng-class="icon(e)"></i></span>' +
                '      <div class="cd-ev-body">' +
                '        <div>{{\'label.creditdecision.history.\' + eventKey(e) | translate}}' +
                '          <span class="label cd-decision-small" ng-class="labelClass(e.decision)" ng-if="e.decision">{{decisionKey(e.decision) | translate}}</span>' +
                '          <span ng-if="e.score !== null && e.score !== undefined"> &middot; {{\'label.creditdecision.loan.score\' | translate}} {{e.score}}</span></div>' +
                '        <div class="text-muted cd-small" ng-if="e.detail">{{detail(e)}}</div>' +
                '        <div class="text-muted cd-small">{{e.actor || \'-\'}} &middot; {{e.occurredOn | date:\'medium\'}}</div>' +
                '      </div>' +
                '    </li>' +
                '  </ul>' +
                '</div>';

            return {
                restrict: 'E',
                scope: {
                    status: '='
                },
                template: template,
                link: function (scope) {
                    var logic = window.CreditDecisionLoan;
                    scope.events = [];
                    scope.labelClass = logic.labelClass;
                    scope.decisionKey = logic.decisionKey;
                    // a failure that carries INELIGIBLE is the automatic rejection that did not go through, not a failed request
                    scope.eventKey = function (event) {
                        return event.eventType === 'FAILED' && event.decision === 'INELIGIBLE' ? 'REJECT_FAILED' : event.eventType;
                    };
                    var ICONS = {FLAGGED: 'fa-flag', UNFLAGGED: 'fa-times', VERIFIED: 'fa-check', REOPENED: 'fa-undo', DECIDED: 'fa-paper-plane', FAILED: 'fa-exclamation', HELD: 'fa-pause', REJECTED: 'fa-ban'};
                    scope.icon = function (event) {
                        return ICONS[event.eventType] || 'fa-circle';
                    };
                    // the detail of a decision is the reason codes; show them as sentences, and anything else as it was written
                    scope.detail = function (event) {
                        if (event.eventType !== 'DECIDED') {
                            return event.detail;
                        }
                        return logic.reasonList(event.detail).map(function (code) {
                            return logic.reasonText(code, function (key) {
                                return $translate.instant(key);
                            });
                        }).join(', ');
                    };
                    scope.$watch('status', function (status) {
                        if (status && status.loanId && status.required !== undefined) {
                            resourceFactory.creditDecisionLoanHistoryResource.get({loanId: status.loanId}, function (events) {
                                scope.events = events;
                            });
                        }
                    });
                }
            };
        }
    });
    mifosX.ng.application.directive('creditDecisionHistory', ['ResourceFactory', '$translate', mifosX.directives.CreditDecisionHistoryDirective]).run(function ($log) {
        $log.info('CreditDecisionHistoryDirective initialized');
    });
}(mifosX.directives || {}));
