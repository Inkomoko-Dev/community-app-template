(function (module) {
    mifosX.controllers = _.extend(module, {
        CreditDecisionProfilesController: function (scope, resourceFactory, location) {
            scope.section = 'profiles';
            scope.profiles = [];
            scope.unassigned = [];
            scope.ui = {showUnassigned: false};
            scope.loaded = false;

            var productNames = {};

            function byStatus(profile, status) {
                return _.find(profile.versions, function (v) {
                    return v.status === status;
                });
            }

            function describe(profile) {
                profile.active = byStatus(profile, 'ACTIVE');
                profile.pending = byStatus(profile, 'PENDING');
                profile.draft = byStatus(profile, 'DRAFT');
                profile.open = profile.pending || profile.draft;
                profile.shown = profile.active || profile.open || profile.versions[0];
                profile.sentCount = CreditDecisionRequest.sentCount(profile.shown ? profile.shown.params : []);
                var ids = profile.shown ? profile.shown.productIds : [];
                profile.productCount = ids.length;
                profile.productSummary = _.map(ids.slice(0, 2), function (id) {
                    return productNames[id];
                }).join(', ') + (ids.length > 2 ? ' +' + (ids.length - 2) : '');
                profile.currencies = _.uniq(_.map(ids, function (id) {
                    return productCurrencies[id];
                }));
                return profile;
            }

            var productCurrencies = {};
            resourceFactory.creditDecisionProductsResource.getAll(function (products) {
                _.each(products, function (p) {
                    productNames[p.id] = p.name;
                    productCurrencies[p.id] = p.currencyCode;
                });
                scope.unassigned = _.filter(products, function (p) {
                    return !p.claimedByProfileId;
                });
                resourceFactory.creditDecisionProfileResource.getAll(function (profiles) {
                    scope.profiles = _.map(profiles, describe);
                    scope.loaded = true;
                });
            });

            scope.open = function (profile) {
                location.path('/creditdecision/profile/' + profile.id);
            };
        }
    });
    mifosX.ng.application.controller('CreditDecisionProfilesController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.CreditDecisionProfilesController]).run(function ($log) {
        $log.info('CreditDecisionProfilesController initialized');
    });
}(mifosX.controllers || {}));
