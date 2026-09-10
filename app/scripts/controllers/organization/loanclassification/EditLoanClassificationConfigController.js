(function (module) {
    mifosX.controllers = _.extend(module, {
        EditLoanClassificationConfigController: function (scope, resourceFactory, routeParams, location) {
            scope.formData = { thresholds: [] };
            resourceFactory.loanClassificationConfigResource.get({ configId: routeParams.configId }, function (data) {
                scope.config = data;
                scope.formData.thresholds = angular.copy(data.thresholds || []);
            });
            scope.addBand = function () {
                scope.formData.thresholds.push({ classification: 5, minDaysInArrears: 0, maxDaysInArrears: null });
            };
            scope.removeBand = function (index) {
                scope.formData.thresholds.splice(index, 1);
            };
            scope.submit = function () {
                resourceFactory.loanClassificationConfigResource.update({ configId: routeParams.configId }, {
                    thresholds: scope.formData.thresholds
                }, function () {
                    location.path('/viewloanclassification/' + routeParams.configId);
                });
            };
        }
    });
    mifosX.ng.application.controller('EditLoanClassificationConfigController', ['$scope', 'ResourceFactory', '$routeParams', '$location', mifosX.controllers.EditLoanClassificationConfigController]).run(function ($log) {
        $log.info('EditLoanClassificationConfigController initialized');
    });
}(mifosX.controllers || {}));
