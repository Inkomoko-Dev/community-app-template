(function (module) {
    mifosX.controllers = _.extend(module, {
        /*
         * The applications whose scoring needs somebody: the engine gave no usable reply, details are missing, or a send
         * began and never finished. Fineract also retries failed ones by the clock and alerts the credit team when the
         * retries run out. Here a person can send one again at once.
         */
        CreditDecisionExceptionsController: function (scope, resourceFactory) {
            var Log = window.CreditDecisionLog;

            scope.section = 'exceptions';
            scope.rows = [];
            scope.loaded = false;
            scope.loading = false;
            scope.failed = false;

            scope.next = Log.exceptionNext;
            scope.dot = Log.exceptionDot;

            scope.load = function () {
                scope.loading = true;
                scope.failed = false;
                resourceFactory.creditDecisionExceptionsResource.get(function (rows) {
                    scope.rows = rows;
                    scope.loaded = true;
                    scope.loading = false;
                }, function () {
                    scope.loading = false;
                    scope.failed = true;
                });
            };

            // the answer, or why it did not go through, is shown by the error banner and the refreshed row
            scope.retry = function (row) {
                row.busy = true;
                resourceFactory.creditDecisionLoanResource.command({loanId: row.loanId, command: 'send'}, {}, scope.load, scope.load);
            };

            scope.load();
        }
    });
    mifosX.ng.application.controller('CreditDecisionExceptionsController', ['$scope', 'ResourceFactory', mifosX.controllers.CreditDecisionExceptionsController]).run(function ($log) {
        $log.info('CreditDecisionExceptionsController initialized');
    });
}(mifosX.controllers || {}));
