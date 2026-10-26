(function (module) {
    mifosX.controllers = _.extend(module, {
        KivaLoggerHubController: function (scope, $rootScope, http, API_VERSION, resourceFactory, dateFilter, $uibModal) {

            var REPORT_NAME = 'Kiva Posting Report';
            var COLUMN_KEYS = {
                'ID': 'id',
                'Client Name': 'clientName',
                'Client UID': 'clientUid',
                'Loan Account': 'loanAccount',
                'Currency': 'currency',
                'Posted / Not Posted': 'status',
                'Message': 'message',
                'Raw Error Message': 'rawError',
                'Disbursed Date': 'disbursedDate',
                'Posting to Kiva Date (UTC)': 'postedOn',
                'Office': 'office',
                'Triggered By': 'triggeredBy',
                'Failure Stage': 'failureStage',
                'Failure Category': 'failureCategory',
                'Batch ID': 'batchId',
                'Loan ID': 'loanId'
            };

            scope.pageSize = 10;
            scope.pagination = {current: 1};
            scope.totalRecords = 0;
            scope.rows = [];
            scope.officeOptions = [];
            var latestRequest = 0;
            scope.officeToAdd = null;
            scope.sort = {orderBy: 'id', sortOrder: 'desc'};
            scope.exporting = false;

            function emptyFilters() {
                return {
                    status: 'all',
                    offices: [],
                    disbursedFrom: null,
                    disbursedTo: null,
                    postedFrom: null,
                    postedTo: null
                };
            }

            scope.filters = emptyFilters();
            var appliedFilters = emptyFilters();

            function formatDate(value) {
                return value ? dateFilter(value, 'yyyy-MM-dd') : '';
            }

            function officeIdsParameter() {
                if (!appliedFilters.offices.length) {
                    return 'all';
                }
                return '-' + _.pluck(appliedFilters.offices, 'id').join('-') + '-';
            }

            scope.reportParameters = function () {
                return {
                    reportSource: REPORT_NAME,
                    R_status: appliedFilters.status,
                    R_officeIds: officeIdsParameter(),
                    R_disbursedFrom: formatDate(appliedFilters.disbursedFrom),
                    R_disbursedTo: formatDate(appliedFilters.disbursedTo),
                    R_postedFrom: formatDate(appliedFilters.postedFrom),
                    R_postedTo: formatDate(appliedFilters.postedTo),
                    R_orderBy: scope.sort.orderBy,
                    R_sortOrder: scope.sort.sortOrder
                };
            };

            function toRows(data) {
                var headers = _.map((data && data.columnHeaders) || [], function (header) {
                    return COLUMN_KEYS[header.columnName] || header.columnName;
                });
                return _.map((data && data.data) || [], function (record) {
                    var row = _.object(headers, record.row);
                    row.posted = row.status === 'Posted';
                    return row;
                });
            }

            scope.fetchPage = function (pageNumber, includeCount) {
                scope.pagination.current = pageNumber;
                var payload = angular.extend(scope.reportParameters(), {
                    limit: scope.pageSize,
                    offset: (pageNumber - 1) * scope.pageSize,
                    includeCount: includeCount
                });
                var request = ++latestRequest;
                scope.loading = true;
                resourceFactory.runReportsResource.getReport(payload, function (data) {
                    if (request !== latestRequest) {
                        return;
                    }
                    scope.loading = false;
                    scope.rows = toRows(data);
                    if (includeCount && data && data.count !== undefined && data.count !== null) {
                        scope.totalRecords = data.count;
                    }
                }, function () {
                    if (request !== latestRequest) {
                        return;
                    }
                    scope.loading = false;
                    scope.rows = [];
                    scope.totalRecords = 0;
                });
            };

            scope.applyFilters = function () {
                appliedFilters = angular.copy(scope.filters);
                scope.fetchPage(1, true);
            };

            scope.pageChanged = function (newPageNumber) {
                scope.fetchPage(newPageNumber, false);
            };

            scope.sortBy = function (column) {
                if (scope.sort.orderBy === column) {
                    scope.sort.sortOrder = scope.sort.sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    scope.sort.orderBy = column;
                    scope.sort.sortOrder = 'desc';
                }
                scope.fetchPage(1, false);
            };

            scope.sortIcon = function (column) {
                if (scope.sort.orderBy !== column) {
                    return 'fa fa-sort text-muted';
                }
                return scope.sort.sortOrder === 'asc' ? 'fa fa-sort-asc' : 'fa fa-sort-desc';
            };

            scope.availableOffices = function () {
                var selected = _.pluck(scope.filters.offices, 'id');
                return _.filter(scope.officeOptions, function (office) {
                    return !_.contains(selected, office.id);
                });
            };

            scope.addOffice = function () {
                var office = _.findWhere(scope.officeOptions, {id: scope.officeToAdd});
                scope.officeToAdd = null;
                if (office) {
                    scope.filters.offices.push(office);
                }
            };

            scope.removeOffice = function (office) {
                scope.filters.offices = _.reject(scope.filters.offices, function (selected) {
                    return selected.id === office.id;
                });
            };

            scope.clearFilters = function () {
                scope.filters = emptyFilters();
                scope.sort = {orderBy: 'id', sortOrder: 'desc'};
                scope.applyFilters();
            };

            scope.exportToXLSX = function () {
                scope.exporting = true;
                var url = $rootScope.hostUrl + API_VERSION + '/runreports/' + encodeURIComponent(REPORT_NAME);
                var params = angular.extend(scope.reportParameters(), {exportXLSX: true});
                delete params.reportSource;
                http.get(url, {responseType: 'blob', params: params})
                    .then(function (response) {
                        var blob = new Blob([response.data], {type: response.headers('Content-Type')});
                        var objectUrl = window.URL.createObjectURL(blob);
                        var link = document.createElement('a');
                        link.href = objectUrl;
                        link.download = 'kiva-posting-report-' + dateFilter(new Date(), 'yyyy-MM-dd') + '.xlsx';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.setTimeout(function () {
                            window.URL.revokeObjectURL(objectUrl);
                        }, 0);
                    })
                    .finally(function () {
                        scope.exporting = false;
                    });
            };

            var RawErrorCtrl = function ($scope, $uibModalInstance, row) {
                $scope.row = row;
                $scope.copied = false;
                $scope.copy = function () {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(row.rawError || '');
                    }
                    $scope.copied = true;
                };
                $scope.close = function () {
                    $uibModalInstance.close();
                };
            };

            scope.viewRawError = function (row) {
                $uibModal.open({
                    templateUrl: 'kivarawerror.html',
                    controller: RawErrorCtrl,
                    resolve: {
                        row: function () {
                            return row;
                        }
                    }
                }).result.then(angular.noop, angular.noop);
            };

            scope.scrollto = function (id) {
                var element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView(true);
                }
            };

            resourceFactory.officeResource.getAllOffices(function (data) {
                scope.officeOptions = data || [];
            });

            scope.applyFilters();
        }
    });
    mifosX.ng.application.controller('KivaLoggerHubController', [
        '$scope', '$rootScope', '$http', 'API_VERSION', 'ResourceFactory', 'dateFilter', '$uibModal',
        mifosX.controllers.KivaLoggerHubController
    ]).run(function ($log) {
        $log.info("KivaLoggerHubController initialized");
    });
}(mifosX.controllers || {}));
