(function (module) {
    mifosX.controllers = _.extend(module, {
        CRBPostingLoggerController: function (scope, rootScope, http, API_VERSION, resourceFactory, routeParams, location, paginatorService, dateFilter) {

            scope.loanId = routeParams.loanId;
            scope.clientId = routeParams.clientId;
            scope.postingLogs = [];
            scope.filteredLogs = [];
            scope.selectedStatus = 'all';
            scope.searchText = '';
            scope.currentPage = 1;
            scope.itemsPerPage = 10;
            scope.pageSize = 10;
            scope.pageSizeOptions = [10, 20, 50, 100];

            // Initialize pagination
            scope.maxSize = 5;

            /**
             * Fetch CRB posting logs for the loan account
             */
            var fetchPostingLogs = function() {
                var requestUrl = $rootScope.hostUrl + API_VERSION + '/loans/' + scope.loanId + '/crb/posting-logs';
                
                http.get(requestUrl).success(function(data) {
                    scope.postingLogs = data.postingLogs || [];
                    scope.applyFilters();
                }).error(function(data, status, headers, config) {
                    scope.error = 'Unable to fetch CRB posting logs. Error: ' + (data.defaultUserMessage || 'Unknown error');
                });
            };

            /**
             * Apply filters to posting logs (status, search text)
             */
            scope.applyFilters = function() {
                scope.filteredLogs = scope.postingLogs.filter(function(log) {
                    var statusMatch = scope.selectedStatus === 'all' || log.status === scope.selectedStatus;
                    var searchMatch = true;
                    
                    if (scope.searchText) {
                        var search = scope.searchText.toLowerCase();
                        searchMatch = (log.loanAccountNumber && log.loanAccountNumber.toLowerCase().indexOf(search) > -1) ||
                                    (log.errorMessage && log.errorMessage.toLowerCase().indexOf(search) > -1) ||
                                    (log.details && log.details.toLowerCase().indexOf(search) > -1);
                    }
                    
                    return statusMatch && searchMatch;
                });
                scope.currentPage = 1;
            };

            /**
             * Get status badge CSS class
             */
            scope.getStatusClass = function(status) {
                switch(status) {
                    case 'FAILED':
                        return 'label-danger';
                    case 'SUCCESS':
                        return 'label-success';
                    case 'PENDING':
                        return 'label-warning';
                    case 'RETRY':
                        return 'label-info';
                    default:
                        return 'label-default';
                }
            };

            /**
             * Get status icon
             */
            scope.getStatusIcon = function(status) {
                switch(status) {
                    case 'FAILED':
                        return 'fa fa-times-circle';
                    case 'SUCCESS':
                        return 'fa fa-check-circle';
                    case 'PENDING':
                        return 'fa fa-clock-o';
                    case 'RETRY':
                        return 'fa fa-redo';
                    default:
                        return 'fa fa-question-circle';
                }
            };

            /**
             * Retry posting for a failed log entry
             */
            scope.retryPosting = function(logEntry) {
                if (!confirm('Are you sure you want to retry posting for log entry #' + logEntry.id + '?')) {
                    return;
                }

                var requestUrl = $rootScope.hostUrl + API_VERSION + '/loans/' + scope.loanId + '/crb/posting-logs/' + logEntry.id + '/retry';
                
                http.post(requestUrl, {}).success(function(data) {
                    scope.success = 'Retry posting initiated successfully. Log entry has been queued for reprocessing.';
                    fetchPostingLogs();
                }).error(function(data, status, headers, config) {
                    scope.error = 'Failed to retry posting. Error: ' + (data.defaultUserMessage || 'Unknown error');
                });
            };

            /**
             * Export logs to CSV
             */
            scope.exportToCSV = function() {
                if (scope.filteredLogs.length === 0) {
                    alert('No logs to export');
                    return;
                }

                var csv = 'Log ID,Loan Account,Status,Posted Date,Retry Count,Error Message\n';
                
                scope.filteredLogs.forEach(function(log) {
                    var postedDate = log.postedDate ? dateFilter(new Date(log.postedDate), 'yyyy-MM-dd HH:mm:ss') : 'N/A';
                    var errorMsg = (log.errorMessage || 'N/A').replace(/"/g, '""');
                    csv += log.id + ',"' + log.loanAccountNumber + '",' + log.status + ',"' + postedDate + '",' + log.retryCount + ',"' + errorMsg + '"\n';
                });

                var element = document.createElement('a');
                element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
                element.setAttribute('download', 'crb-posting-logs-' + scope.loanId + '.csv');
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
            };

            /**
             * View detailed error information for a log entry
             */
            scope.viewDetails = function(logEntry) {
                scope.selectedLog = logEntry;
                scope.showDetailsModal = true;
            };

            /**
             * Close details modal
             */
            scope.closeDetailsModal = function() {
                scope.showDetailsModal = false;
                scope.selectedLog = null;
            };

            /**
             * Clear all filters
             */
            scope.clearFilters = function() {
                scope.selectedStatus = 'all';
                scope.searchText = '';
                scope.applyFilters();
            };

            /**
             * Navigate back to loan account details
             */
            scope.back = function() {
                location.path('/viewloanaccount/' + scope.loanId);
            };

            // Initialize on controller load
            fetchPostingLogs();
        }
    });
    
    mifosX.ng.application.controller('CRBPostingLoggerController', [
        '$scope', '$rootScope', '$http', 'API_VERSION', 'ResourceFactory', 
        '$routeParams', '$location', 'PaginatorService', 'dateFilter', 
        mifosX.controllers.CRBPostingLoggerController
    ]).run(function ($log) {
        $log.info("CRBPostingLoggerController initialized");
    });
}(mifosX.controllers || {}));
