(function (module) {
    mifosX.controllers = _.extend(module, {
        LoanClassificationSummaryController: function (scope, resourceFactory, dateFilter) {
            scope.offices = [];
            scope.products = [];
            scope.countries = [];
            scope.rows = [];
            scope.formData = {};
            scope.first = {};
            scope.first.fromDate = new Date();
            scope.first.fromDate.setFullYear(scope.first.fromDate.getFullYear() - 1);
            scope.first.toDate = new Date();

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
                if (scope.first.fromDate) {
                    params.fromDate = dateFilter(scope.first.fromDate, 'yyyy-MM-dd');
                }
                if (scope.first.toDate) {
                    params.toDate = dateFilter(scope.first.toDate, 'yyyy-MM-dd');
                }
                resourceFactory.loanClassificationSummaryResource.get(params, function (data) {
                    scope.rows = data;
                });
            };

            scope.search();
        }
    });
    mifosX.ng.application.controller('LoanClassificationSummaryController', ['$scope', 'ResourceFactory', 'dateFilter', mifosX.controllers.LoanClassificationSummaryController]).run(function ($log) {
        $log.info('LoanClassificationSummaryController initialized');
    });
}(mifosX.controllers || {}));
