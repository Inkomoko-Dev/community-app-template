(function (module) {
    mifosX.controllers = _.extend(module, {
        ExcessRefundListController: function (scope, resourceFactory, location, $rootScope) {
            scope.refunds = [];
            scope.filters = { status: null };
            scope.activeTab = 'single';
            scope.reportLinks = [
                { name: 'Excess Balances', path: '/run_report/Excess Balances' },
                { name: 'Refund Requests and Statuses', path: '/run_report/Refund Requests and Statuses' },
                { name: 'Aging of Excess Balances', path: '/run_report/Aging of Excess Balances' },
                { name: 'Excess Balance Reconciliation Report', path: '/run_report/Excess Balance Reconciliation Report' }
            ];

            scope.load = function () {
                resourceFactory.excessRefundResource.getAll({ status: scope.filters.status }, function (data) {
                    scope.refunds = data;
                });
            };
            scope.setTab = function (tab) {
                scope.activeTab = tab;
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
            scope.exportCsv = function () {
                var base = $rootScope.hostUrl || '';
                var tenant = $rootScope.tenantIdentifier || '';
                var query = [];
                if (scope.filters.status != null) {
                    query.push('status=' + scope.filters.status);
                }
                if (tenant) {
                    query.push('tenantIdentifier=' + encodeURIComponent(tenant));
                }
                var suffix = query.length ? '?' + query.join('&') : '';
                window.open(base + '/fineract-provider/api/v1/excess-refunds/export' + suffix, '_blank');
            };
            scope.load();
        }
    });
    mifosX.ng.application.controller('ExcessRefundListController', ['$scope', 'ResourceFactory', '$location', '$rootScope', mifosX.controllers.ExcessRefundListController]).run(function ($log) {
        $log.info('ExcessRefundListController initialized');
    });
}(mifosX.controllers || {}));
