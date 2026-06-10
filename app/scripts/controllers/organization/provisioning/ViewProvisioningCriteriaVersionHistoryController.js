(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewProvisioningCriteriaVersionHistoryController: function (scope, routeParams, resourceFactory, location) {
            scope.criteriaId = routeParams.criteriaId;
            scope.versions = [];
            scope.loadFailed = false;

            resourceFactory.provisioningcriteria.get({ criteriaId: scope.criteriaId }, function (criteria) {
                scope.criteriaName = criteria.criteriaName;
            });

            resourceFactory.provisioningCriteriaVersions.getAll({ criteriaId: scope.criteriaId }, function (data) {
                scope.versions = angular.isArray(data) ? data : [];
            }, function () {
                scope.loadFailed = true;
                scope.versions = [];
            });

            scope.viewVersion = function (versionId) {
                location.path('/viewprovisioningcriteria/' + scope.criteriaId + '/versions/' + versionId);
            };
        }
    });
    mifosX.ng.application.controller('ViewProvisioningCriteriaVersionHistoryController',
        ['$scope', '$routeParams', 'ResourceFactory', '$location', mifosX.controllers.ViewProvisioningCriteriaVersionHistoryController])
        .run(function ($log) {
            $log.info('ViewProvisioningCriteriaVersionHistoryController initialized');
        });
}(mifosX.controllers || {}));
