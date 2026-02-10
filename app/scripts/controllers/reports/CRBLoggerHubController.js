(function (module) {
    mifosX.controllers = _.extend(module, {
        CRBLoggerHubController: function (scope, $rootScope, http, API_VERSION, resourceFactory) {

            scope.postingLogs = [];
            scope.filteredLogs = [];
            scope.selectedStatus = 'all';
            scope.searchText = '';
            scope.pageSize = 10;

            /**
             * Fetch all CRB posting logs
             */
            var fetchAllPostingLogs = function () {
                resourceFactory.crbPostingReportsViewResource.query(function (data) {
                    scope.postingLogs = data || [];
                    scope.applyFilters();
                }, function (data) {
                    scope.error = 'Unable to fetch CRB posting logs. Error: ' + (data.defaultUserMessage || 'Unknown error');
                });
            };

            scope.$watch('fromDate', function (newVal, oldVal) {
                scope.applyFilters();
            });
            scope.$watch('toDate', function (newVal, oldVal) {
                scope.applyFilters();
            });

            /**
             * Apply filters to posting logs (hasPassed status, search text)
             */
            scope.applyFilters = function () {
                console.log("apply filter called")
                scope.filteredLogs = scope.postingLogs.filter(function (log) {
                    var statusMatch = scope.selectedStatus === 'all' ||
                        (scope.selectedStatus === 'true' && log.hasPassed === true) ||
                        (scope.selectedStatus === 'true' && log.hasPassed === 'true') ||
                        (scope.selectedStatus === 'false' && log.hasPassed === false) ||
                        (scope.selectedStatus === 'false' && log.hasPassed === 'false');


                    // Date Filter
                    // -------------------------
                    var dateMatch = true;

                    if (log.date) {
                        console.log("log date " + scope.arrayToDate(log.date))
                        var logDate = scope.arrayToDate(log.date);

                        if (scope.fromDate) {
                            var from = new Date(scope.fromDate);
                            console.log("from date " + from)
                            from.setHours(0, 0, 0, 0);
                            if (logDate < from) dateMatch = false;
                        }

                        if (scope.toDate) {
                            var to = new Date(scope.toDate);
                            to.setHours(23, 59, 59, 999);
                            if (logDate > to) dateMatch = false;
                        }
                    }

                    var searchMatch = true;

                    if (scope.searchText) {
                        var search = scope.searchText.toLowerCase();
                        searchMatch = (log.loanId && log.loanId.toString().toLowerCase().indexOf(search) > -1) ||
                            (log.errorMessage && log.errorMessage.toLowerCase().indexOf(search) > -1) ||
                            (log.details && log.details.toLowerCase().indexOf(search) > -1);
                    }

                    return statusMatch && searchMatch && dateMatch;
                });
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

                http.post(requestUrl, {}).then(function (response) {
                    scope.success = 'Retry posting initiated successfully. Log entry has been queued for reprocessing.';
                    fetchAllPostingLogs();
                }).catch(function (error) {
                    scope.error = 'Failed to retry posting. Error: ' + (error.data.defaultUserMessage || 'Unknown error');
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

                http.post(requestUrl, { loanId: logEntry.loanId }).then(function (response) {
                    scope.success = 'Loan record marked as fixed and has been rescheduled for retry.';
                    fetchAllPostingLogs();
                }).catch(function (error) {
                    scope.error = 'Failed to mark loan as fixed. Error: ' + (error.data.defaultUserMessage || 'Unknown error');
                });
            };

            /**
             * Export logs to CSV
             */
            scope.exportToCSV = function () {

                if (scope.filteredLogs.length === 0) {
                    alert('No logs to export');
                    return;
                }

                const url = $rootScope.hostUrl + '/fineract-provider/api/v1/crb/posting-logs/export';

                http.get(url, { responseType: 'arraybuffer' })
                    .then(function (response) {

                        const file = new Blob([response.data], {
                            type: response.headers('Content-Type')
                        });

                        const fileURL = URL.createObjectURL(file);
                        window.open(fileURL);

                    })
                    .catch(function (error) {
                        console.error("Error exporting report:", error);
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
                scope.showErrorModal = true;
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
                scope.showErrorModal = true;
            };

            /**
             * Close error modal
             */
            scope.closeErrorModal = function () {
                scope.showErrorModal = false;
                scope.selectedErrorLog = null;
            };

            /**
             * Clear all filters
             */
            scope.clearFilters = function () {
                scope.selectedStatus = 'all';
                scope.searchText = '';
                scope.fromDate = ''
                scope.toDate = ''
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
                if (!arr) return null;
                return new Date(arr[0], arr[1] - 1, arr[2], arr[3] || 0, arr[4] || 0, arr[5] || 0);
            };

            // Initialize on controller load
            fetchAllPostingLogs();
        }
    });

    mifosX.ng.application.controller('CRBLoggerHubController', [
        '$scope', '$rootScope', '$http', 'API_VERSION', 'ResourceFactory',
        '$routeParams', '$location', 'PaginatorService', 'dateFilter',
        mifosX.controllers.CRBLoggerHubController
    ]).run(function ($log) {
        $log.info("CRBLoggerHubController initialized");
    });
}(mifosX.controllers || {}));
