(function (module) {
    mifosX.controllers = _.extend(module, {
        ExcessRefundListController: function (scope, resourceFactory, location) {
            scope.refunds = [];
            scope.filters = { status: null };
            scope.load = function () {
                resourceFactory.excessRefundResource.getAll({ status: scope.filters.status }, function (data) {
                    scope.refunds = data;
                });
            };
            scope.create = function () {
                location.path('/excessrefunds/create');
            };
            scope.openBulk = function () {
                location.path('/excessrefunds/bulk');
            };
            scope.open = function (id) {
                location.path('/excessrefunds/' + id);
            };
            scope.load();
        }
    });
    mifosX.ng.application.controller('ExcessRefundListController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.ExcessRefundListController]).run(function ($log) {
        $log.info('ExcessRefundListController initialized');
    });
}(mifosX.controllers || {}));
