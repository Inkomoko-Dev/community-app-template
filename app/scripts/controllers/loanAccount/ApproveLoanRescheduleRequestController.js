(function (module) {
    mifosX.controllers = _.extend(module, {
        ApproveLoanRescheduleRequestController: function (scope, resourceFactory, routeParams, location, dateFilter, $translate) {
            scope.formData = {};
            scope.loanId = routeParams.loanId;
            scope.requestId = routeParams.requestId;
            scope.tranchePositionLoaded = false;

            resourceFactory.loanRescheduleResource.get({scheduleId: scope.requestId}, function (request) {
                resourceFactory.loanResource.get({loanId: scope.loanId, associations: 'multiDisburseDetails'}, function (loan) {
                    scope.multiTrancheNotice = MultiTrancheRescheduleNotice.assess(loan, request.rescheduleFromDate);
                    scope.multiTrancheWarnings = MultiTrancheRescheduleNotice.lines(scope.multiTrancheNotice, function (key, params) {
                        return $translate.instant(key, params);
                    });
                    scope.tranchePositionLoaded = true;
                });
            });

            scope.cancel = function () {
                location.path('/loans/' + scope.loanId + '/viewreschedulerequest/'+scope.requestId);
            };
            scope.approve = function(){
                if (!scope.tranchePositionLoaded) {
                    scope.error = $translate.instant('validation.msg.rescheduleloan.acknowledgeMultiTrancheReschedule.required');
                    return;
                }
                if (scope.multiTrancheNotice && scope.multiTrancheNotice.nothingDisbursed) {
                    scope.error = $translate.instant('validation.msg.rescheduleloan.multiTranche.nothing.disbursed');
                    return;
                }
                if (scope.multiTrancheNotice && !scope.formData.acknowledgeMultiTrancheReschedule) {
                    scope.error = $translate.instant('validation.msg.rescheduleloan.acknowledgeMultiTrancheReschedule.required');
                    return;
                }
                if (!scope.multiTrancheNotice) {
                    delete this.formData.acknowledgeMultiTrancheReschedule;
                }
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
    mifosX.ng.application.controller('ApproveLoanRescheduleRequestController', ['$scope', 'ResourceFactory', '$routeParams', '$location', 'dateFilter', '$translate', mifosX.controllers.ApproveLoanRescheduleRequestController]).run(function ($log) {
        $log.info("ApproveLoanRescheduleRequestController initialized");
    });
}(mifosX.controllers || {}));