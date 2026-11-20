(function (module) {
    mifosX.controllers = _.extend(module, {
        /*
         * Rules that choose which IC level an IC_REVIEW_REQUIRED application enters. First match by currency, amount
         * band and risk tier wins; levels below the entry level are bypassed.
         */
        CreditDecisionDelegatedAuthorityController: function (scope, resourceFactory, $timeout, $translate) {
            scope.section = 'delegatedauthority';
            scope.rules = [];
            scope.levels = [];
            scope.currencies = [];
            scope.users = [];
            scope.loaded = false;
            scope.loading = false;
            scope.editing = false;
            scope.saving = false;
            scope.formErrors = {};
            scope.form = null;
            scope.saved = false;

            function blank(value) {
                return value === undefined || value === null || String(value).trim() === '';
            }

            function emptyForm() {
                return {
                    id: null,
                    currency: '',
                    riskTier: '',
                    minAmount: 0,
                    maxAmount: '',
                    entryLevelNumber: scope.levels.length ? scope.levels[0].levelNumber : null,
                    approverUserId: '',
                    active: true,
                    description: ''
                };
            }

            function fromRule(rule) {
                return {
                    id: rule.id,
                    currency: rule.currency || '',
                    riskTier: rule.riskTier || '',
                    minAmount: rule.minAmount != null ? Number(rule.minAmount) : 0,
                    maxAmount: rule.maxAmount != null ? Number(rule.maxAmount) : '',
                    entryLevelNumber: rule.entryLevelNumber,
                    approverUserId: rule.approverUserId != null ? String(rule.approverUserId) : '',
                    active: rule.active !== false,
                    description: rule.description || ''
                };
            }

            function payload() {
                var body = {
                    currency: blank(scope.form.currency) ? null : String(scope.form.currency).trim().toUpperCase(),
                    riskTier: blank(scope.form.riskTier) ? null : String(scope.form.riskTier).trim().toUpperCase(),
                    minAmount: blank(scope.form.minAmount) ? 0 : Number(scope.form.minAmount),
                    maxAmount: blank(scope.form.maxAmount) ? null : Number(scope.form.maxAmount),
                    entryLevelNumber: scope.form.entryLevelNumber == null || scope.form.entryLevelNumber === ''
                        ? null : Number(scope.form.entryLevelNumber),
                    approverUserId: blank(scope.form.approverUserId) ? null : Number(scope.form.approverUserId),
                    active: !!scope.form.active,
                    description: blank(scope.form.description) ? null : String(scope.form.description).trim()
                };
                return body;
            }

            function clientProblems() {
                var problems = {};
                var body = payload();
                if (body.minAmount != null && body.minAmount < 0) {
                    problems.minAmount = 'label.creditdecision.delegatedauthority.error.minnegative';
                }
                if (body.maxAmount != null && body.minAmount != null && body.maxAmount < body.minAmount) {
                    problems.maxAmount = 'label.creditdecision.delegatedauthority.error.maxbelowmin';
                }
                if (body.entryLevelNumber == null || isNaN(body.entryLevelNumber)) {
                    problems.entryLevelNumber = 'label.creditdecision.delegatedauthority.error.levelrequired';
                }
                return problems;
            }

            function mapApiErrors(httpResponse) {
                var mapped = {};
                var errors = httpResponse && httpResponse.data && httpResponse.data.errors;
                _.each(errors || [], function (err) {
                    if (err.parameterName) {
                        mapped[err.parameterName] = err.defaultUserMessage || err.developerMessage;
                    }
                });
                return mapped;
            }

            scope.amountBand = function (rule) {
                var min = rule.minAmount != null ? rule.minAmount : 0;
                if (rule.maxAmount == null || rule.maxAmount === '') {
                    return min + '+';
                }
                return min + ' – ' + rule.maxAmount;
            };

            scope.levelLabel = function (rule) {
                if (rule.entryLevelName) {
                    return rule.entryLevelName + ' (' + rule.entryLevelNumber + ')';
                }
                return rule.entryLevelNumber != null ? String(rule.entryLevelNumber) : '-';
            };

            scope.load = function () {
                scope.loading = true;
                resourceFactory.creditDecisionDelegatedAuthorityResource.getAll(function (rules) {
                    scope.rules = rules || [];
                    scope.loaded = true;
                    scope.loading = false;
                }, function () {
                    scope.loading = false;
                    scope.loaded = true;
                });
            };

            scope.startCreate = function () {
                scope.editing = true;
                scope.formErrors = {};
                scope.saved = false;
                scope.form = emptyForm();
            };

            scope.startEdit = function (rule) {
                scope.editing = true;
                scope.formErrors = {};
                scope.saved = false;
                scope.form = fromRule(rule);
            };

            scope.cancelEdit = function () {
                scope.editing = false;
                scope.form = null;
                scope.formErrors = {};
                scope.saving = false;
            };

            scope.save = function () {
                scope.formErrors = clientProblems();
                if (!_.isEmpty(scope.formErrors)) {
                    return;
                }
                scope.saving = true;
                var body = payload();
                var onOk = function () {
                    scope.saving = false;
                    scope.editing = false;
                    scope.form = null;
                    scope.formErrors = {};
                    scope.saved = true;
                    $timeout(function () {
                        scope.saved = false;
                    }, 3500);
                    scope.load();
                };
                var onFail = function (response) {
                    scope.saving = false;
                    scope.formErrors = mapApiErrors(response);
                };
                if (scope.form.id) {
                    resourceFactory.creditDecisionDelegatedAuthorityResource.update({ruleId: scope.form.id}, body, onOk, onFail);
                } else {
                    resourceFactory.creditDecisionDelegatedAuthorityResource.save({}, body, onOk, onFail);
                }
            };

            scope.remove = function (rule) {
                if (!window.confirm($translate.instant('label.creditdecision.delegatedauthority.confirmdelete'))) {
                    return;
                }
                rule.busy = true;
                resourceFactory.creditDecisionDelegatedAuthorityResource.delete({ruleId: rule.id}, {}, function () {
                    scope.load();
                }, function () {
                    rule.busy = false;
                });
            };

            resourceFactory.getApprovalMatrixEngineTemplateResource.get({}, function (data) {
                scope.currencies = data.currencyOptions || [];
                scope.levels = data.activeIcReviewLevels || [];
            });
            resourceFactory.userListResource.getAllUsers(function (users) {
                scope.users = users || [];
            });
            scope.load();
        }
    });
    mifosX.ng.application.controller('CreditDecisionDelegatedAuthorityController',
        ['$scope', 'ResourceFactory', '$timeout', '$translate', mifosX.controllers.CreditDecisionDelegatedAuthorityController]).run(function ($log) {
        $log.info('CreditDecisionDelegatedAuthorityController initialized');
    });
}(mifosX.controllers || {}));
