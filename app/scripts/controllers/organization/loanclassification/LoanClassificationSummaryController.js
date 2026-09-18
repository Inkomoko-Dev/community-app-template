(function (module) {
    mifosX.controllers = _.extend(module, {
        LoanClassificationSummaryController: function (scope, resourceFactory) {
            scope.offices = [];
            scope.products = [];
            scope.countries = [];
            scope.rows = [];
            scope.formData = {};

            resourceFactory.officeResource.getAllOffices(function (data) {
                scope.offices = data;
            });
            resourceFactory.loanProductResource.getAllLoanProducts(function (data) {
                scope.products = data;
            });
            resourceFactory.loanClassificationConfigResource.getAll(function (data) {
                scope.countries = (data || []).map(function (config) {
                    return { id: config.countryId, name: config.countryName };
                });
            });

            scope.search = function () {
                var params = {};
                if (scope.formData.countryId) {
                    params.countryId = scope.formData.countryId;
                }
                if (scope.formData.officeId) {
                    params.officeId = scope.formData.officeId;
                }
                if (scope.formData.loanProductId) {
                    params.loanProductId = scope.formData.loanProductId;
                }
                resourceFactory.loanClassificationSummaryResource.get(params, function (data) {
                    scope.rows = data;
                });
            };

            scope.search();
        }
    });
    mifosX.ng.application.controller('LoanClassificationSummaryController', ['$scope', 'ResourceFactory', mifosX.controllers.LoanClassificationSummaryController]).run(function ($log) {
        $log.info('LoanClassificationSummaryController initialized');
    });
}(mifosX.controllers || {}));
