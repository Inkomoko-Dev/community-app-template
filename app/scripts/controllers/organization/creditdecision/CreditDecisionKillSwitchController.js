(function (module) {
    mifosX.controllers = _.extend(module, {
        CreditDecisionKillSwitchController: function (scope, resourceFactory, $timeout) {
            scope.section = 'killswitch';
            scope.switches = [];
            scope.currencies = [];
            scope.products = [];
            scope.loaded = false;
            scope.saved = false;
            scope.form = {scope: 'GLOBAL', scopeKey: '', enabled: true, reason: ''};

            function load() {
                resourceFactory.creditDecisionKillSwitchResource.getAll(function (rows) {
                    scope.switches = rows || [];
                    scope.loaded = true;
                });
            }

            resourceFactory.getApprovalMatrixEngineTemplateResource.get({}, function (data) {
                scope.currencies = data.currencyOptions || [];
            });
            resourceFactory.loanProductResource.getAllLoanProducts(function (products) {
                scope.products = products || [];
            });
            load();

            scope.save = function () {
                if (!scope.hasPermission || !scope.hasPermission('UPDATE_CREDITDECISIONKILLSWITCH')) {
                    return;
                }
                var body = {
                    scope: scope.form.scope,
                    scopeKey: scope.form.scope === 'GLOBAL' ? '*' : scope.form.scopeKey,
                    enabled: !!scope.form.enabled,
                    reason: scope.form.reason || null
                };
                if (body.enabled && !window.confirm('Turn ON the emergency kill switch for ' + body.scope
                        + (body.scope === 'GLOBAL' ? '' : ' / ' + body.scopeKey)
                        + '? New AUTO_APPROVE outcomes will route to IC Level 1.')) {
                    return;
                }
                resourceFactory.creditDecisionKillSwitchResource.update({}, body, function () {
                    scope.saved = true;
                    $timeout(function () { scope.saved = false; }, 3500);
                    load();
                });
            };

            scope.toggle = function (row) {
                if (!scope.hasPermission || !scope.hasPermission('UPDATE_CREDITDECISIONKILLSWITCH')) {
                    return;
                }
                var turningOn = !row.enabled;
                if (turningOn && !window.confirm('Turn ON the emergency kill switch for ' + row.scope
                        + (row.scope === 'GLOBAL' ? '' : ' / ' + row.scopeKey)
                        + '? New AUTO_APPROVE outcomes will route to IC Level 1.')) {
                    return;
                }
                resourceFactory.creditDecisionKillSwitchResource.update({}, {
                    scope: row.scope,
                    scopeKey: row.scopeKey,
                    enabled: turningOn,
                    reason: row.reason
                }, load);
            };
        }
    });
    mifosX.ng.application.controller('CreditDecisionKillSwitchController',
        ['$scope', 'ResourceFactory', '$timeout', mifosX.controllers.CreditDecisionKillSwitchController]).run(function ($log) {
        $log.info('CreditDecisionKillSwitchController initialized');
    });
}(mifosX.controllers || {}));
