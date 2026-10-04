(function (module) {
    mifosX.controllers = _.extend(module, {
        ApproveLoanRescheduleRequestController: function (scope, resourceFactory, routeParams, location, dateFilter) {
            scope.formData = {};
            scope.loanId = routeParams.loanId;
            scope.requestId = routeParams.requestId;

            scope.cancel = function () {
                location.path('/loans/' + scope.loanId + '/viewreschedulerequest/'+scope.requestId);
            };
            scope.approve = function(){
                this.formData.dateFormat = scope.df;
                this.formData.locale = scope.optlang.code;
                this.formData.approvedOnDate = dateFilter(this.formData.approvedOnDate, scope.df);

                resourceFactory.loanRescheduleResource.approve({scheduleId:scope.requestId},this.formData,function (data) {
                    location.path('/viewloanaccount/' + scope.loanId);
                }, function (response) {
                    var errors = response && response.data && response.data.errors;
                    var backendError = response && response.data;
                    scope.error = errors && errors.length && errors[0].defaultUserMessage
                        ? errors[0].defaultUserMessage
                        : (backendError && backendError.defaultUserMessage)
                            ? backendError.defaultUserMessage
                            : 'Loan reschedule approval failed. Please contact support.';
                });
            };
        }
    });
    mifosX.ng.application.controller('ApproveLoanRescheduleRequestController', ['$scope', 'ResourceFactory', '$routeParams', '$location', 'dateFilter', mifosX.controllers.ApproveLoanRescheduleRequestController]).run(function ($log) {
        $log.info("ApproveLoanRescheduleRequestController initialized");
    });
}(mifosX.controllers || {}));