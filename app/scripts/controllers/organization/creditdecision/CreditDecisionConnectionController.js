(function (module) {
    mifosX.controllers = _.extend(module, {
        CreditDecisionConnectionController: function (scope, resourceFactory, $timeout) {
            scope.section = 'connection';
            scope.form = null;
            scope.saved = false;

            function show(data) {
                scope.form = {
                    provider: data.provider,
                    enabled: !!data.enabled,
                    endpointUrl: data.endpointUrl || '',
                    timeoutSeconds: data.timeoutSeconds,
                    retries: data.retries,
                    onNoReply: data.onNoReply
                };
                scope.updatedBy = data.updatedBy;
                scope.updatedOn = data.updatedOn;
            }

            resourceFactory.creditDecisionConnectionResource.get(show);

            scope.save = function () {
                resourceFactory.creditDecisionConnectionResource.update({}, scope.form, function (data) {
                    show(data);
                    scope.saved = true;
                    $timeout(function () {
                        scope.saved = false;
                    }, 3500);
                });
            };
        }
    });
    mifosX.ng.application.controller('CreditDecisionConnectionController', ['$scope', 'ResourceFactory', '$timeout', mifosX.controllers.CreditDecisionConnectionController]).run(function ($log) {
        $log.info('CreditDecisionConnectionController initialized');
    });
}(mifosX.controllers || {}));
