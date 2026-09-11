(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateLoanClassificationConfigController: function (scope, resourceFactory, location) {
            scope.formData = { thresholds: [] };
            scope.countryOptions = [];

            function defaultThresholds(data) {
                return data.defaultThresholds && data.defaultThresholds.length ? angular.copy(data.defaultThresholds) : [
                    { classification: 1, minDaysInArrears: 0, maxDaysInArrears: 30 },
                    { classification: 2, minDaysInArrears: 31, maxDaysInArrears: 90 },
                    { classification: 3, minDaysInArrears: 91, maxDaysInArrears: 180 },
                    { classification: 4, minDaysInArrears: 181, maxDaysInArrears: 360 },
                    { classification: 5, minDaysInArrears: 361, maxDaysInArrears: null }
                ];
            }

            resourceFactory.loanClassificationConfigResource.template(function (data) {
                scope.countryOptions = data.countryOptions || [];
                scope.formData.thresholds = defaultThresholds(data);
            });

            scope.addBand = function () {
                scope.formData.thresholds.push({ classification: 5, minDaysInArrears: 0, maxDaysInArrears: null });
            };

            scope.removeBand = function (index) {
                scope.formData.thresholds.splice(index, 1);
            };

            scope.submit = function () {
                resourceFactory.loanClassificationConfigResource.save({
                    countryId: scope.formData.countryId,
                    thresholds: scope.formData.thresholds
                }, function (data) {
                    location.path('/viewloanclassification/' + data.resourceId);
                });
            };
        }
    });
    mifosX.ng.application.controller('CreateLoanClassificationConfigController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.CreateLoanClassificationConfigController]).run(function ($log) {
        $log.info('CreateLoanClassificationConfigController initialized');
    });
}(mifosX.controllers || {}));
