(function (module) {
    mifosX.controllers = _.extend(module, {
        PreviewLoanRepaymentScheduleController: function (scope, resourceFactory, routeParams, location, dateFilter, translate) {
            scope.requestId = routeParams.requestId;
            scope.loanId = routeParams.loanId;
            scope.data = {};
            scope.previewLoaded = false;
            scope.previewError = null;

            resourceFactory.loanRescheduleResource.preview({scheduleId:scope.requestId}, function (data) {
                scope.data = data;
                scope.previewLoaded = true;
            }, function (response) {
                var body = response && angular.isObject(response.data) ? response.data : null;
                var errors = body && body.errors;
                if (errors && errors.length && errors[0].defaultUserMessage) {
                    scope.previewError = errors[0].defaultUserMessage;
                } else if (body && body.defaultUserMessage) {
                    scope.previewError = body.defaultUserMessage;
                } else {
                    scope.previewError = translate.instant('error.msg.loan.reschedule.preview.failed');
                }
            });
            scope.reject = function(){
                location.path('/loans/' + scope.loanId + '/rejectreschedulerequest/'+scope.requestId);
            };
            scope.approve = function(){
                location.path('/loans/' + scope.loanId + '/approvereschedulerequest/'+scope.requestId);
            };

            scope.back = function () {
                location.path('/loans/' + scope.loanId + '/viewreschedulerequest/'+scope.requestId);
            };
        }
    });
    mifosX.ng.application.controller('PreviewLoanRepaymentScheduleController', ['$scope', 'ResourceFactory', '$routeParams', '$location', 'dateFilter', '$translate', mifosX.controllers.PreviewLoanRepaymentScheduleController]).run(function ($log) {
        $log.info("PreviewLoanRepaymentScheduleController initialized");
    });
}(mifosX.controllers || {}));