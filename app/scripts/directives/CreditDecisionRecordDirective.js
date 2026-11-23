(function (module) {
    mifosX.directives = _.extend(module, {
        /*
         * What the decision engine was asked and what it answered for one loan application, read only:
         * <credit-decision-record status="creditDecision"></credit-decision-record>
         * Used on the "Automated Credit Decision" tab of the loan page and under the decision page. It shows nothing until the
         * engine has replied.
         */
        CreditDecisionRecordDirective: function ($translate) {
            var template =
                '<div class="cd cd-record" ng-if="has()">' +
                '  <table class="table table-striped table-bordered cd-table" ng-if="!compact">' +
                '    <tr><th class="table-bold-loan">{{\'label.creditdecision.page.decision\' | translate}}</th><td><span class="label cd-decision" ng-class="labelClass()" id="cd-record-decision">{{decisionKey() | translate}}</span></td></tr>' +
                '    <tr ng-if="status.riskTier" id="cd-record-tier"><th class="table-bold-loan">{{\'label.creditdecision.page.risktier\' | translate}}</th><td>{{status.riskTier}}</td></tr>' +
                '    <tr ng-if="status.maxExposure !== null && status.maxExposure !== undefined" id="cd-record-exposure"><th class="table-bold-loan">{{\'label.creditdecision.page.maxexposure\' | translate}}</th><td>{{status.maxExposure | number:0}}</td></tr>' +
                '    <tr ng-if="status.modelVersion" id="cd-record-model"><th class="table-bold-loan">{{\'label.creditdecision.page.model\' | translate}}</th><td>{{status.modelVersion}}</td></tr>' +
                '    <tr ng-if="status.score !== null && status.score !== undefined"><th class="table-bold-loan">{{\'label.creditdecision.loan.score\' | translate}}</th><td>{{status.score}}</td></tr>' +
                '    <tr ng-if="reasons().length" id="cd-record-reasons"><th class="table-bold-loan">{{\'label.creditdecision.page.reasons\' | translate}}</th><td><span class="label label-default cd-reason" ng-repeat="r in reasons() track by $index" title="{{r}}">{{reasonText(r)}}</span></td></tr>' +
                '    <tr><th class="table-bold-loan">{{\'label.creditdecision.loan.verification\' | translate}}</th>' +
                '      <td>{{(\'label.creditdecision.loan.verification.\' + status.verificationStatus) | translate}}<span ng-if="status.verifiedBy"> &middot; {{status.verifiedBy}} &middot; {{status.verifiedOn | date:\'mediumDate\'}}</span><span ng-if="status.verificationNote"> &middot; &ldquo;{{status.verificationNote}}&rdquo;</span></td></tr>' +
                '    <tr><th class="table-bold-loan">{{\'label.creditdecision.page.sent\' | translate}}</th><td>{{status.requestedBy || \'-\'}}<span ng-if="status.requestedOn"> &middot; {{status.requestedOn | date:\'medium\'}}</span></td></tr>' +
                '    <tr><th class="table-bold-loan">{{\'label.creditdecision.record.provider\' | translate}}</th><td>{{status.provider || \'-\'}} &middot; {{seconds()}}</td></tr>' +
                '    <tr><th class="table-bold-loan">{{\'label.creditdecision.record.profile\' | translate}}</th><td>{{profile()}}</td></tr>' +
                '  </table>' +
                '  <div class="cd-record-payload" ng-if="status.requestJson || status.replyJson">' +
                '    <a href="" id="cd-record-toggle" ng-click="open = !open"><i class="fa" ng-class="open ? \'fa-caret-down\' : \'fa-caret-right\'"></i> {{\'label.creditdecision.record.payload\' | translate}}</a>' +
                '    <div class="row" ng-if="open">' +
                '      <div class="col-md-6"><h5>{{\'label.creditdecision.record.request\' | translate}}</h5><pre id="cd-record-request">{{pretty(status.requestJson)}}</pre></div>' +
                '      <div class="col-md-6"><h5>{{\'label.creditdecision.record.replyjson\' | translate}}</h5><pre id="cd-record-reply">{{pretty(status.replyJson)}}</pre></div>' +
                '    </div>' +
                '  </div>' +
                '</div>';

            return {
                restrict: 'E',
                scope: {
                    status: '='
                },
                template: template,
                link: function (scope, element, attrs) {
                    // under the decision page everything but the exchange itself is already shown above
                    scope.compact = attrs.compact === 'true';
                    var logic = window.CreditDecisionLoan;
                    scope.open = false;
                    scope.has = function () {
                        return logic.hasRecord(scope.status);
                    };
                    scope.labelClass = function () {
                        return logic.labelClass(scope.status && scope.status.decision);
                    };
                    scope.decisionKey = function () {
                        return logic.decisionKey(scope.status && scope.status.decision);
                    };
                    scope.reasons = function () {
                        return logic.reasonList(scope.status && scope.status.reasonCodes);
                    };
                    scope.reasonText = function (code) {
                        return logic.reasonText(code, function (key) {
                            return $translate.instant(key);
                        });
                    };
                    scope.pretty = logic.pretty;
                    scope.profile = function () {
                        var s = scope.status || {};
                        // the profile the request was built from, or the product's profile for an older record that did not keep it
                        var name = s.requestedProfileName || s.profileName;
                        return name ? name + (s.requestedVersionNo ? ' v' + s.requestedVersionNo : '') : '-';
                    };
                    scope.seconds = function () {
                        var ms = scope.status && scope.status.replyMs;
                        return ms === null || ms === undefined ? '-' : (ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1) + ' s');
                    };
                }
            };
        }
    });
    mifosX.ng.application.directive('creditDecisionRecord', ['$translate', mifosX.directives.CreditDecisionRecordDirective]).run(function ($log) {
        $log.info('CreditDecisionRecordDirective initialized');
    });
}(mifosX.directives || {}));
