(function (module) {
    mifosX.controllers = _.extend(module, {
        CreditDecisionCatalogueController: function (scope, resourceFactory) {
            scope.section = 'catalogue';
            scope.groups = [];
            var usedBy = {};

            scope.usedBy = function (item) {
                return usedBy[item.key] || [];
            };

            resourceFactory.creditDecisionCatalogueResource.getAll(function (groups) {
                scope.groups = groups;
            });

            resourceFactory.creditDecisionProfileResource.getAll(function (profiles) {
                _.each(profiles, function (profile) {
                    var version = _.find(profile.versions, {status: 'ACTIVE'}) || _.find(profile.versions, {status: 'PENDING'}) ||
                        _.find(profile.versions, {status: 'DRAFT'}) || profile.versions[0];
                    if (!version) {
                        return;
                    }
                    _.each(version.params, function (p) {
                        if (p.enabled) {
                            usedBy[p.key] = (usedBy[p.key] || []).concat([{id: profile.id, name: profile.name}]);
                        }
                    });
                });
            });
        }
    });
    mifosX.ng.application.controller('CreditDecisionCatalogueController', ['$scope', 'ResourceFactory', mifosX.controllers.CreditDecisionCatalogueController]).run(function ($log) {
        $log.info('CreditDecisionCatalogueController initialized');
    });
}(mifosX.controllers || {}));
