(function (module) {
    mifosX.controllers = _.extend(module, {
        CRBLoggerHubController: function (scope, $rootScope, http, API_VERSION, resourceFactory) {

            scope.postingLogs = [];
            scope.selectedStatus = 'all';
            scope.searchText = '';
            scope.currentPage = 1;
            scope.pageSize = 15;
            scope.pageSizeOptions = [15, 25, 50, 100];
            scope.totalLogs = 0;
            scope.loading = true;
            scope.fromDate = '';
            scope.toDate = '';

            var searchTimer = null;

            function formatDate(date) {
                if (!date) {
                    return '';
                }
                var d = new Date(date);
                if (isNaN(d.getTime())) {
                    return '';
                }
                var month = '' + (d.getMonth() + 1);
                var day = '' + (d.getDate());
                var year = d.getFullYear();
                if (month.length < 2) month = '0' + month;
                if (day.length < 2) day = '0' + day;
                return [year, month, day].join('-');
            }

            function extractErrorMessage(response) {
                if (!response) {
                    return 'Unknown error';
                }
                var data = response.data || response;
                return data.defaultUserMessage || data.developerMessage || data.message || response.statusText || 'Unknown error';
            }

            function buildQueryParams(pageNumber) {
                var params = {
                    offset: ((pageNumber - 1) * scope.pageSize),
                    limit: scope.pageSize,
                    paged: true
                };

                if (scope.selectedStatus === 'true' || scope.selectedStatus === 'false') {
                    params.status = scope.selectedStatus;
                }
                if (scope.fromDate) {
                    params.fromDate = formatDate(scope.fromDate);
                }
                if (scope.toDate) {
                    params.toDate = formatDate(scope.toDate);
                }
                if (scope.searchText) {
                    params.search = scope.searchText;
                }
                return params;
            }

            function normalizePage(data, offset, limit) {
                var items = [];
                var total = 0;

                if (!data) {
                    return { items: items, total: total };
                }

                if (Object.prototype.toString.call(data) === '[object Array]') {
                    items = data;
                    total = data.length;
                } else {
                    items = data.pageItems || data.content || [];
                    total = data.totalFilteredRecords || data.totalElements || items.length;
                }

                if (items.length > limit) {
                    total = items.length;
                    items = items.slice(offset, offset + limit);
                }

                return { items: items, total: total };
            }

            function fetchLogs(pageNumber) {
                if (!pageNumber) {
                    pageNumber = 1;
                }
                scope.currentPage = pageNumber;
                scope.loading = true;
                scope.error = null;

                var params = buildQueryParams(pageNumber);

                resourceFactory.crbPostingReportsViewResource.get(params, function (data) {
                    var page = normalizePage(data, params.offset, params.limit);
                    scope.postingLogs = page.items;
                    scope.totalLogs = page.total;
                    scope.loading = false;
                }, function (response) {
                    scope.postingLogs = [];
                    scope.totalLogs = 0;
                    scope.loading = false;
                    scope.error = 'Unable to fetch CRB posting logs. Error: ' + extractErrorMessage(response);
                });
            }

            scope.getResultsPage = function (pageNumber) {
                if (!pageNumber || pageNumber === scope.currentPage) {
                    return;
                }
                fetchLogs(pageNumber);
            };

            scope.applyFilters = function () {
                scope.currentPage = 1;
                fetchLogs(1);
            };

            scope.onSearchChange = function () {
                if (searchTimer) {
                    clearTimeout(searchTimer);
                }
                searchTimer = setTimeout(function () {
                    scope.$apply(function () {
                        scope.applyFilters();
                    });
                }, 400);
            };

            scope.onPageSizeChange = function () {
                scope.pageSize = parseInt(scope.pageSize, 10) || 15;
                scope.applyFilters();
            };

            /**
             * Get status badge CSS class based on hasPassed field
             */
            scope.getStatusClass = function (hasPassed) {
                return hasPassed === true || hasPassed === 'true' ? 'label-success' : 'label-danger';
            };

            /**
             * Get status icon based on hasPassed field
             */
            scope.getStatusIcon = function (hasPassed) {
                return hasPassed === true || hasPassed === 'true' ? 'fa fa-check-circle' : 'fa fa-times-circle';
            };

            /**
             * Retry posting for a failed log entry
             */
            scope.retryPosting = function (logEntry) {
                if (!confirm('Are you sure you want to retry posting for log entry #' + logEntry.id + '?')) {
                    return;
                }

                var requestUrl = $rootScope.hostUrl + API_VERSION + '/crb/posting-logs/' + logEntry.id + '/retry';

                http.post(requestUrl, {}).then(function () {
                    scope.success = 'Retry posting initiated successfully. Log entry has been queued for reprocessing.';
                    fetchLogs(scope.currentPage);
                }).catch(function (error) {
                    scope.error = 'Failed to retry posting. Error: ' + extractErrorMessage(error);
                });
            };

            /**
             * Mark loan record as fixed and ready to post
             */
            scope.markAsFixed = function (logEntry) {
                if (!confirm('Mark loan #' + logEntry.loanId + ' as fixed? This will update the loan record status.')) {
                    return;
                }

                var requestUrl = $rootScope.hostUrl + API_VERSION + '/crb/posting-logs/' + logEntry.loanId + '/mark-fixed';

                http.post(requestUrl, { loanId: logEntry.loanId }).then(function () {
                    scope.success = 'Loan record marked as fixed and has been rescheduled for retry.';
                    fetchLogs(scope.currentPage);
                }).catch(function (error) {
                    scope.error = 'Failed to mark loan as fixed. Error: ' + extractErrorMessage(error);
                });
            };

            /**
             * Export logs to CSV
             */
            scope.exportToCSV = function () {
                if (scope.totalLogs === 0) {
                    alert('No logs to export');
                    return;
                }

                var params = {};
                if (scope.selectedStatus === 'true' || scope.selectedStatus === 'false') {
                    params.status = scope.selectedStatus;
                }
                if (scope.fromDate) {
                    params.fromDate = formatDate(scope.fromDate);
                }
                if (scope.toDate) {
                    params.toDate = formatDate(scope.toDate);
                }
                if (scope.searchText) {
                    params.search = scope.searchText;
                }

                var queryString = Object.keys(params)
                    .map(function (key) {
                        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                    })
                    .join('&');

                var url = $rootScope.hostUrl + API_VERSION + '/crb/posting-logs/export' + (queryString ? '?' + queryString : '');

                http.get(url, { responseType: 'arraybuffer' })
                    .then(function (response) {
                        var file = new Blob([response.data], {
                            type: response.headers('Content-Type') || 'text/csv'
                        });
                        var fileURL = URL.createObjectURL(file);
                        var a = document.createElement('a');
                        a.href = fileURL;
                        a.download = 'crb-logs.csv';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(fileURL);
                    })
                    .catch(function (error) {
                        scope.error = 'Failed to export CRB posting logs. Error: ' + extractErrorMessage(error);
                    });
            };

            /**
             * View detailed error information for a log entry
             */
            scope.viewDetails = function (logEntry) {
                scope.selectedLog = logEntry;
                scope.showDetailsModal = true;
            };

            /**
             * Close details modal
             */
            scope.closeDetailsModal = function () {
                scope.showDetailsModal = false;
                scope.selectedLog = null;
            };

            /**
             * Show error details modal
             */
            scope.showErrorModal = function (logEntry) {
                scope.selectedErrorLog = logEntry;
                scope.showErrorModalFlag = true;
            };

            /**
             * Close error modal
             */
            scope.closeErrorModal = function () {
                scope.showErrorModalFlag = false;
                scope.selectedErrorLog = null;
            };

            /**
             * Clear all filters
             */
            scope.clearFilters = function () {
                scope.selectedStatus = 'all';
                scope.searchText = '';
                scope.fromDate = '';
                scope.toDate = '';
                scope.applyFilters();
            };

            /**
             * Scroll to element
             */
            scope.scrollto = function (id) {
                var element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView(true);
                }
            };

            scope.arrayToDate = function (arr) {
                if (!arr) {
                    return null;
                }
                if (arr instanceof Date) {
                    return arr;
                }
                if (typeof arr === 'string' || typeof arr === 'number') {
                    return new Date(arr);
                }
                return new Date(arr[0], arr[1] - 1, arr[2], arr[3] || 0, arr[4] || 0, arr[5] || 0);
            };

            fetchLogs(1);
        }
    });

    mifosX.ng.application.controller('CRBLoggerHubController', [
        '$scope', '$rootScope', '$http', 'API_VERSION', 'ResourceFactory',
        mifosX.controllers.CRBLoggerHubController
    ]).run(function ($log) {
        $log.info("CRBLoggerHubController initialized");
    });
}(mifosX.controllers || {}));
