(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewProvisioningCriteriaVersionController: function (scope, routeParams, resourceFactory) {
            scope.criteriaId = routeParams.criteriaId;
            scope.versionId = routeParams.versionId;
            scope.version = {};
            scope.previousVersion = null;

            resourceFactory.provisioningCriteriaVersions.get({
                criteriaId: scope.criteriaId,
                versionId: scope.versionId
            }, function (data) {
                scope.version = data;
                scope.previousVersion = data.previousVersion;
                if (scope.version.definitions) {
                    scope.version.definitions = scope.version.definitions.slice(0).sort(function (left, right) {
                        var leftOrder = angular.isDefined(left.displayOrder) ? left.displayOrder : 0;
                        var rightOrder = angular.isDefined(right.displayOrder) ? right.displayOrder : 0;
                        if (leftOrder !== rightOrder) {
                            return leftOrder - rightOrder;
                        }
                        return left.minAge - right.minAge;
                    });
                }
            });

            scope.formatMaximumAge = function (definition) {
                if (definition.maxAge === null || angular.isUndefined(definition.maxAge)) {
                    return 'Open-ended';
                }
                return definition.maxAge;
            };

            scope.definitionChanged = function (current, field) {
                if (!scope.previousVersion || !scope.previousVersion.definitions) {
                    return false;
                }
                var previous = findDefinition(scope.previousVersion.definitions, current);
                if (!previous) {
                    return true;
                }
                return normalizeValue(previous[field]) !== normalizeValue(current[field]);
            };

            function findDefinition(definitions, current) {
                for (var i = 0; i < definitions.length; i++) {
                    if (definitions[i].categoryId === current.categoryId) {
                        return definitions[i];
                    }
                }
                return null;
            }

            function normalizeValue(value) {
                if (value === null || angular.isUndefined(value)) {
                    return '';
                }
                return String(value);
            }
        }
    });
    mifosX.ng.application.controller('ViewProvisioningCriteriaVersionController',
        ['$scope', '$routeParams', 'ResourceFactory', mifosX.controllers.ViewProvisioningCriteriaVersionController])
        .run(function ($log) {
            $log.info('ViewProvisioningCriteriaVersionController initialized');
        });
}(mifosX.controllers || {}));
