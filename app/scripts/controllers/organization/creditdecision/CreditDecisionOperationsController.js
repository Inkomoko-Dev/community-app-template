(function (module) {
    mifosX.controllers = _.extend(module, {
        CreditDecisionOperationsController: function (scope, resourceFactory) {
            scope.section = 'operations';
            scope.metrics = null;
            scope.loading = false;
            scope.filter = {from: '', to: '', currency: '', productId: ''};
            scope.currencies = [];
            scope.products = [];

            resourceFactory.getApprovalMatrixEngineTemplateResource.get({}, function (data) {
                scope.currencies = data.currencyOptions || [];
            });
            resourceFactory.loanProductResource.getAllLoanProducts(function (products) {
                scope.products = products || [];
            });

            scope.load = function () {
                scope.loading = true;
                var params = {};
                if (scope.filter.from) { params.from = scope.filter.from; }
                if (scope.filter.to) { params.to = scope.filter.to; }
                if (scope.filter.currency) { params.currency = scope.filter.currency; }
                if (scope.filter.productId) { params.productId = scope.filter.productId; }
                resourceFactory.creditDecisionMetricsResource.get(params, function (data) {
                    scope.metrics = data;
                    scope.loading = false;
                }, function () {
                    scope.loading = false;
                });
            };

            scope.load();
        }
    });
    mifosX.ng.application.controller('CreditDecisionOperationsController',
        ['$scope', 'ResourceFactory', mifosX.controllers.CreditDecisionOperationsController]).run(function ($log) {
        $log.info('CreditDecisionOperationsController initialized');
    });
}(mifosX.controllers || {}));
