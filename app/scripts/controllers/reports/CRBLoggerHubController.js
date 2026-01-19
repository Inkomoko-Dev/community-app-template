(function (module) {
    mifosX.controllers = _.extend(module, {
        CRBLoggerHubController: function (scope, rootScope, http, API_VERSION, resourceFactory, routeParams, location, paginatorService) {

            scope.loanSearch = {};
            scope.selectedLoan = null;
            scope.loansFound = [];
            scope.searching = false;

            /**
             * Search for loans by account number or client name
             */
            scope.searchLoans = function() {
                if (!scope.loanSearch.query || scope.loanSearch.query.trim().length < 2) {
                    scope.loansFound = [];
                    return;
                }

                scope.searching = true;
                var requestUrl = $rootScope.hostUrl + API_VERSION + '/loans?search=' + encodeURIComponent(scope.loanSearch.query) + '&limit=50';
                
                http.get(requestUrl).success(function(data) {
                    scope.loansFound = data.pageItems || [];
                    if (scope.loansFound.length === 0) {
                        scope.noLoansMessage = 'No loans found matching your search criteria.';
                    } else {
                        scope.noLoansMessage = null;
                    }
                    scope.searching = false;
                }).error(function(data, status, headers, config) {
                    scope.error = 'Failed to search loans. Error: ' + (data.defaultUserMessage || 'Unknown error');
                    scope.loansFound = [];
                    scope.searching = false;
                });
            };

            /**
             * Select a loan and navigate to its posting logs
             */
            scope.selectLoan = function(loan) {
                if (loan && loan.id && loan.clientId) {
                    location.path('/crbpostinglogger/' + loan.id + '/' + loan.clientId);
                } else {
                    scope.error = 'Invalid loan selection';
                }
            };

            /**
             * Clear search
             */
            scope.clearSearch = function() {
                scope.loanSearch.query = '';
                scope.loansFound = [];
                scope.selectedLoan = null;
                scope.noLoansMessage = null;
            };
        }
    });
    
    mifosX.ng.application.controller('CRBLoggerHubController', [
        '$scope', '$rootScope', '$http', 'API_VERSION', 'ResourceFactory', 
        '$routeParams', '$location', 'PaginatorService', 
        mifosX.controllers.CRBLoggerHubController
    ]).run(function ($log) {
        $log.info("CRBLoggerHubController initialized");
    });
}(mifosX.controllers || {}));
