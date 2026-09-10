(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewLoanClassificationConfigsController: function (scope, resourceFactory, location) {
            scope.configs = [];
            scope.routeTo = function (id) {
                location.path('/viewloanclassification/' + id);
            };
            resourceFactory.loanClassificationConfigResource.getAll(function (data) {
                scope.configs = data;
            });
        }
    });
    mifosX.ng.application.controller('ViewLoanClassificationConfigsController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.ViewLoanClassificationConfigsController]).run(function ($log) {
        $log.info('ViewLoanClassificationConfigsController initialized');
    });
}(mifosX.controllers || {}));
