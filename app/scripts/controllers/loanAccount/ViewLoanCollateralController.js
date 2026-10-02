(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewLoanCollateralController: function (scope, resourceFactory, routeParams, location, $uibModal) {

            scope.loanId = routeParams.loanId || routeParams.id;
            scope.collateralId = routeParams.collateralId || routeParams.id;
            var status = routeParams.status || location.search().status;
            scope.showEditButtons = status == 'Submitted and pending approval';
            resourceFactory.loanResource.get({ resourceType: 'collaterals', loanId: scope.loanId, resourceId: scope.collateralId}, function (data) {
                scope.collateral = data;
            });
            scope.deleteCollateral = function () {
                $uibModal.open({
                    templateUrl: 'deletecollateral.html',
                    controller: CollateralDeleteCtrl
                });
            };
            var CollateralDeleteCtrl = function ($scope, $uibModalInstance) {
                $scope.delete = function () {
                    resourceFactory.loanResource.delete({ resourceType: 'collaterals', loanId: scope.loanId, resourceId: scope.collateralId}, {}, function (data) {
                        $uibModalInstance.close('delete');
                        location.path('/viewloanaccount/' + scope.loanId);
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };
        }
    });
    mifosX.ng.application.controller('ViewLoanCollateralController', ['$scope', 'ResourceFactory', '$routeParams', '$location', '$uibModal', mifosX.controllers.ViewLoanCollateralController]).run(function ($log) {
        $log.info("ViewLoanCollateralController initialized");
    });
}(mifosX.controllers || {}));
