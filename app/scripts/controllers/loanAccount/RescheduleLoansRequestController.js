(function (module) {
    mifosX.controllers = _.extend(module, {
        RescheduleLoansRequestController: function (scope, resourceFactory, routeParams, location, dateFilter) {
            scope.loanId = routeParams.loanId;
            scope.formData = {};
            scope.rejectData = {};
            scope.adjustFuturePayments = true;
            scope.formData.submittedOnDate = new Date();

            resourceFactory.loanRescheduleResource.template({scheduleId:'template', loanId:scope.loanId},function(data){
                if (data.length > 0) {
                    scope.formData.rescheduleReasonId = data.rescheduleReasons[0].id;
                }
                scope.codes = data.rescheduleReasons;
                scope.availableCarryForwardCharges = data.availableCarryForwardCharges;
                scope.overdueChargeHandlingOptions = data.overdueChargeHandlingOptions;
                let transactionDate = data.loanTransactionData.date;
                scope.adjustFuturePayments = data.adjustFuturePayments;
                scope.formData.rescheduleFromDate =new Date(transactionDate) || new Date();
            });
            scope.cancel = function () {
                location.path('/viewloanaccount/' + scope.loanId);
            };

            scope.submit = function () {
                this.formData.loanId = scope.loanId;
                this.formData.dateFormat = scope.df;
                this.formData.locale = scope.optlang.code;
                this.formData.rescheduleFromDate = dateFilter(this.formData.rescheduleFromDate, scope.df);
                this.formData.adjustedDueDate = dateFilter(this.formData.adjustedDueDate, scope.df);
                this.formData.submittedOnDate = dateFilter(this.formData.submittedOnDate, scope.df);
                this.formData.endDate = dateFilter(this.formData.endDate, scope.df);
                if (this.formData.carryForwardChargeDueDate) {
                    this.formData.carryForwardChargeDueDate =
                        dateFilter(this.formData.carryForwardChargeDueDate, scope.df);
                }
                this.formData.rescheduleReasonComment = scope.comments;
                resourceFactory.loanRescheduleResource.put(this.formData, function (data) {
                    scope.requestId = data.resourceId;
                    location.path('/loans/' + scope.loanId + '/viewreschedulerequest/'+ data.resourceId);
                });
            };

        }
    });
    mifosX.ng.application.controller('RescheduleLoansRequestController', ['$scope', 'ResourceFactory', '$routeParams', '$location', 'dateFilter', mifosX.controllers.RescheduleLoansRequestController]).run(function ($log) {
        $log.info("RescheduleLoansRequestController initialized");
    });
}(mifosX.controllers || {}));
