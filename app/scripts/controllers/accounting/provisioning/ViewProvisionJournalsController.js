(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewProvisionJournalsController: function (scope, routeParams, resourceFactory, location, dateFilter) {
            scope.entryId = routeParams.entryId;
            scope.statusFilter = '';
            scope.dateFilter = null;
            scope.journals = [];

            scope.routeTo = function (id) {
                location.path('/viewprovisionjournal/' + id);
            };

            scope.clearFilters = function () {
                scope.statusFilter = '';
                scope.dateFilter = null;
                scope.load();
            };

            scope.load = function () {
                var params = {};
                if (scope.entryId) {
                    params.entryId = scope.entryId;
                }
                if (scope.statusFilter) {
                    params.status = scope.statusFilter;
                }
                if (scope.dateFilter) {
                    params.date = dateFilter(scope.dateFilter, scope.df);
                    params.dateFormat = scope.df;
                    params.locale = scope.optlang.code;
                }
                resourceFactory.provisioningJournals.getAll(params, function (data) {
                    scope.journals = data || [];
                });
            };

            scope.load();
        }
    });
    mifosX.ng.application.controller('ViewProvisionJournalsController', ['$scope', '$routeParams', 'ResourceFactory', '$location', 'dateFilter', mifosX.controllers.ViewProvisionJournalsController]).run(function ($log) {
        $log.info("ViewProvisionJournalsController initialized");
    });
}(mifosX.controllers || {}));
