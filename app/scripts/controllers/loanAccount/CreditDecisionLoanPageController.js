(function (module) {
    mifosX.controllers = _.extend(module, {
        /*
         * The page where the automated credit decision of one application is worked: verify the details, send them to
         * the decision engine, read what came back. The steps themselves live in <credit-decision-loan mode="page">. This
         * only finds the loan for the heading and keeps the status the card loaded so the record can show it.
         */
        CreditDecisionLoanPageController: function (scope, routeParams, resourceFactory, $rootScope) {
            scope.loanId = routeParams.id;
            scope.loan = {id: routeParams.id};
            scope.status = null;
            scope.summary = null;

            resourceFactory.LoanAccountResource.getLoanAccountDetails({loanId: routeParams.id, associations: 'all', exclude: 'guarantors,futureSchedule'}, function (data) {
                scope.summary = data;
            });

            scope.$on('creditDecisionLoaded', function (event, data) {
                scope.status = data;
            });

            // the requirement can be taken off until the engine has answered, never after it
            scope.canRemove = function () {
                return !!scope.status && scope.status.required && scope.status.canChangeFlag && scope.status.requestStatus !== 'DECIDED';
            };

            // taking the requirement off lives in the footer, away from the steps, so it is not pressed by mistake
            scope.remove = function () {
                if (!$rootScope.hasPermission('UPDATE_CREDITDECISIONLOAN')) {
                    return;
                }
                resourceFactory.creditDecisionLoanFlagResource.update({loanId: routeParams.id}, {required: false}, function (data) {
                    scope.status = data;
                    scope.$broadcast('creditDecisionReload');
                });
            };
        }
    });
    mifosX.ng.application.controller('CreditDecisionLoanPageController', ['$scope', '$routeParams', 'ResourceFactory', '$rootScope', mifosX.controllers.CreditDecisionLoanPageController]).run(function ($log) {
        $log.info('CreditDecisionLoanPageController initialized');
    });
}(mifosX.controllers || {}));
