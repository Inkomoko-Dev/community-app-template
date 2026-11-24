(function (module) {
    mifosX.controllers = _.extend(module, {
        /*
         * The applications whose scoring needs somebody: the engine gave no usable reply, details are missing, or a send
         * began and never finished. Ops can retry, or request maker-checker REEVALUATE / MANUAL_IC (CGLT-849).
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

            scope.currentUsername = function () {
                return scope.currentSession && scope.currentSession.user && scope.currentSession.user.name
                    ? scope.currentSession.user.name : '';
            };

            scope.isOverrideMaker = function (row) {
                if (!row || !row.pendingOverrideBy) {
                    return false;
                }
                return row.pendingOverrideBy.toLowerCase() === scope.currentUsername().toLowerCase();
            };

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

            scope.retry = function (row) {
                row.busy = true;
                resourceFactory.creditDecisionLoanResource.command({loanId: row.loanId, command: 'send'}, {}, scope.load, scope.load);
            };

            scope.requestOverride = function (row, action) {
                var note = window.prompt('Optional note for ' + action + ' (leave blank for none):', '') || '';
                row.busy = true;
                resourceFactory.creditDecisionExceptionOverrideResource.save(
                    {loanId: row.loanId},
                    {action: action, note: note.trim() || undefined},
                    scope.load,
                    function () { row.busy = false; }
                );
            };

            scope.approveOverride = function (row) {
                row.busy = true;
                resourceFactory.creditDecisionExceptionOverrideDecideResource.command(
                    {overrideId: row.pendingOverrideId, command: 'approve'}, {}, scope.load, function () {
                        row.busy = false;
                    });
            };

            scope.cancelOverride = function (row) {
                row.busy = true;
                resourceFactory.creditDecisionExceptionOverrideDecideResource.command(
                    {overrideId: row.pendingOverrideId, command: 'cancel'}, {}, scope.load, function () {
                        row.busy = false;
                    });
            };

            scope.load();
        }
    });
    mifosX.ng.application.controller('CreditDecisionExceptionsController', ['$scope', 'ResourceFactory', mifosX.controllers.CreditDecisionExceptionsController]).run(function ($log) {
        $log.info('CreditDecisionExceptionsController initialized');
    });
}(mifosX.controllers || {}));
