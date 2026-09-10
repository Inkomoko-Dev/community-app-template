(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewLoanClassificationConfigController: function (scope, resourceFactory, routeParams, location, $uibModal) {
            scope.configId = routeParams.configId;
            resourceFactory.loanClassificationConfigResource.get({ configId: routeParams.configId }, function (data) {
                scope.config = data;
            });
            scope.deleteConfig = function () {
                $uibModal.open({
                    templateUrl: 'deleteclassification.html',
                    controller: function ($scope, $uibModalInstance) {
                        $scope.delete = function () {
                            resourceFactory.loanClassificationConfigResource.delete({ configId: routeParams.configId }, {}, function () {
                                $uibModalInstance.close();
                                location.path('/loanclassification');
                            });
                        };
                        $scope.cancel = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                    }
                });
            };
        }
    });
    mifosX.ng.application.controller('ViewLoanClassificationConfigController', ['$scope', 'ResourceFactory', '$routeParams', '$location', '$uibModal', mifosX.controllers.ViewLoanClassificationConfigController]).run(function ($log) {
        $log.info('ViewLoanClassificationConfigController initialized');
    });
}(mifosX.controllers || {}));
