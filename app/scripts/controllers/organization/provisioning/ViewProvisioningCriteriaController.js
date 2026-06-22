(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewProvisioningCriteriaController: function (scope, routeParams, resourceFactory, location, $uibModal) {
            scope.choice = 0;

            resourceFactory.provisioningcriteria.get({ criteriaId: routeParams.criteriaId }, function (data) {
                scope.loanproducts = data.loanProducts || [];
                scope.definitions = (data.versionDisplayStatus === 'SCHEDULED' && data.effectiveDefinitions && data.effectiveDefinitions.length)
                    ? data.effectiveDefinitions.slice(0)
                    : (data.definitions || []).slice(0);
                scope.definitions.sort(function (left, right) {
                    var leftOrder = angular.isDefined(left.displayOrder) && left.displayOrder !== null ? left.displayOrder : 0;
                    var rightOrder = angular.isDefined(right.displayOrder) && right.displayOrder !== null ? right.displayOrder : 0;
                    if (leftOrder !== rightOrder) {
                        return leftOrder - rightOrder;
                    }
                    return left.minAge - right.minAge;
                });
                scope.criterianame = data.criteriaName;
                scope.criteriaId = data.criteriaId;
                scope.versionNo = data.versionNo;
                scope.effectiveFrom = data.effectiveFrom;
                scope.policyChangeReason = data.policyChangeReason;
                scope.activeVersionId = data.activeVersionId;
                scope.effectiveForTodayVersionNo = data.effectiveForTodayVersionNo;
                scope.effectiveForTodayFrom = data.effectiveForTodayFrom;
                scope.versionDisplayStatus = data.versionDisplayStatus;
                scope.formattedProductNames = scope.loanproducts.map(function (loanProduct) {
                    return loanProduct.name;
                }).join(', ');
            });

            scope.formatMaximumAge = function (definition) {
                if (definition.maxAge === null || angular.isUndefined(definition.maxAge)) {
                    return 'Open-ended';
                }
                return definition.maxAge;
            };

            scope.deleteProvisionigCriteria = function () {
                $uibModal.open({
                    templateUrl: 'deletech.html',
                    controller: criteriaDeleteCtrl
                });
            };

            var criteriaDeleteCtrl = function ($scope, $uibModalInstance) {
                $scope.delete = function () {
                    resourceFactory.provisioningcriteria.delete({ criteriaId: scope.criteriaId }, {}, function () {
                        $uibModalInstance.close('delete');
                        location.path('/viewallprovisionings');
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };
        }
    });
    mifosX.ng.application.controller('ViewProvisioningCriteriaController', ['$scope', '$routeParams', 'ResourceFactory', '$location', '$uibModal', mifosX.controllers.ViewProvisioningCriteriaController]).run(function ($log) {
        $log.info('ViewProvisioningCriteriaController initialized');
    });
}(mifosX.controllers || {}));
