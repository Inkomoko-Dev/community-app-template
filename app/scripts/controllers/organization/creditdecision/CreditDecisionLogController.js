(function (module) {
    mifosX.controllers = _.extend(module, {
        CreditDecisionLogController: function (scope, resourceFactory, $uibModal, $timeout) {
            var Log = window.CreditDecisionLog;
            var pending = null;
            var requestNo = 0;

            scope.section = 'log';
            scope.rows = [];
            scope.loaded = false;
            scope.loading = false;
            scope.failed = false;
            scope.filter = Log.blank();
            scope.tabs = ['', 'AUTO_APPROVE', 'IC_REVIEW_REQUIRED', 'INELIGIBLE', 'HELD', 'AWAITING'];
            scope.modes = ['SHADOW', 'LIVE'];
            scope.sorts = Log.SORTS;
            scope.pageSizes = Log.PAGE_SIZES;
            scope.pageSize = 25;
            scope.page = 1;
            scope.totalPages = 1;
            scope.total = 0;
            scope.counts = {total: 0, autoApprove: 0, icReview: 0, ineligible: 0, held: 0, awaiting: 0};
            scope.profiles = [];
            scope.riskTiers = [];
            scope.modelVersions = [];
            scope.pageNumbers = [1];
            scope.range = Log.range(1, 25, 0);
            scope.showMore = false;

            resourceFactory.creditDecisionProfileResource.getAll(function (profiles) {
                scope.profiles = _.sortBy(profiles, function (p) {
                    return (p.name || '').toLowerCase();
                });
            });

            scope.tabCount = function (tab) {
                var c = scope.counts;
                return {'': c.total, 'AUTO_APPROVE': c.autoApprove, 'IC_REVIEW_REQUIRED': c.icReview, 'INELIGIBLE': c.ineligible, 'HELD': c.held, 'AWAITING': c.awaiting}[tab];
            };

            function load(page) {
                var mine = ++requestNo;
                scope.loading = true;
                scope.failed = false;
                var query = Log.query(scope.filter, page || 1, scope.pageSize);
                resourceFactory.creditDecisionLogResource.get(query, function (result) {
                    if (mine !== requestNo) {
                        return;
                    }
                    scope.rows = result.content || [];
                    scope.total = result.total;
                    scope.page = result.page;
                    scope.pageSize = result.pageSize;
                    scope.totalPages = result.totalPages;
                    scope.counts = result.counts;
                    scope.riskTiers = result.riskTiers || [];
                    scope.modelVersions = result.modelVersions || [];
                    scope.pageNumbers = Log.pages(scope.page, scope.totalPages);
                    scope.range = Log.range(scope.page, scope.pageSize, scope.total);
                    scope.loaded = true;
                    scope.loading = false;
                }, function () {
                    if (mine === requestNo) {
                        scope.loading = false;
                        scope.failed = true;
                    }
                });
            }

            // any change to a filter goes back to the first page
            scope.refilter = function () {
                $timeout.cancel(pending);
                load(1);
            };

            // typing waits for a short pause before asking the server
            scope.typed = function () {
                $timeout.cancel(pending);
                pending = $timeout(function () {
                    load(1);
                }, 400);
            };

            scope.setOutcome = function (tab) {
                scope.filter.outcome = tab;
                scope.refilter();
            };

            scope.goTo = function (page) {
                if (page < 1 || page > scope.totalPages || page === scope.page) {
                    return;
                }
                load(page);
            };

            scope.setPageSize = function () {
                scope.refilter();
            };

            scope.clear = function () {
                scope.filter = Log.blank();
                scope.refilter();
            };

            scope.activeFilters = function () {
                return Log.activeCount(scope.filter);
            };

            scope.isFiltered = function () {
                return Log.isFiltered(scope.filter);
            };

            scope.show = function (row) {
                $uibModal.open({
                    templateUrl: 'creditDecisionLogEntry.html',
                    size: 'lg',
                    controller: ['$scope', '$uibModalInstance', function ($scope, $uibModalInstance) {
                        // the list leaves the request and reply out, they are read when an entry is opened
                        $scope.row = row;
                        $scope.loading = true;
                        resourceFactory.creditDecisionLogEntryResource.get({logId: row.id}, function (full) {
                            $scope.row = full;
                            $scope.request = Log.prettify(full.requestJson);
                            $scope.reply = Log.prettify(full.replyJson);
                            $scope.loading = false;
                        }, function () {
                            $scope.loading = false;
                        });
                        $scope.close = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                    }]
                });
            };

            load(1);
        }
    });
    mifosX.ng.application.controller('CreditDecisionLogController', ['$scope', 'ResourceFactory', '$uibModal', '$timeout', mifosX.controllers.CreditDecisionLogController]).run(function ($log) {
        $log.info('CreditDecisionLogController initialized');
    });
}(mifosX.controllers || {}));
