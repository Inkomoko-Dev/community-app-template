(function (module) {
    mifosX.controllers = _.extend(module, {
        RescheduleLoansRequestController: function (scope, resourceFactory, routeParams, location, dateFilter) {
            var fallbackRepaymentFrequencyTypeOptions = [
                { id: 0, value: 'Days' },
                { id: 1, value: 'Weeks' },
                { id: 2, value: 'Months' },
                { id: 3, value: 'Years' }
            ];

            var normalizeDate = function (value) {
                if (!value) {
                    return null;
                }

                if (angular.isDate(value)) {
                    return value;
                }

                if (angular.isArray(value) && value.length >= 3) {
                    return new Date(value[0], value[1] - 1, value[2]);
                }

                var parsedDate = new Date(value);
                if (isNaN(parsedDate.getTime())) {
                    return null;
                }

                return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
            };

            var normalizeRepaymentFrequencyOptions = function (loanData) {
                var options = [];
                if (loanData.product && loanData.product.repaymentFrequencyTypeOptions) {
                    options = loanData.product.repaymentFrequencyTypeOptions.slice();
                } else if (loanData.repaymentFrequencyTypeOptions) {
                    options = loanData.repaymentFrequencyTypeOptions.slice();
                }

                if (!options.length) {
                    options = fallbackRepaymentFrequencyTypeOptions.slice();
                }

                if (loanData.repaymentFrequencyType) {
                    var hasCurrentType = _.some(options, function (option) {
                        return option.id === loanData.repaymentFrequencyType.id;
                    });

                    if (!hasCurrentType) {
                        options.push(loanData.repaymentFrequencyType);
                    }
                }

                return options;
            };

            var findDefaultRescheduleDate = function (loanData, fallbackDate) {
                var schedule = loanData && loanData.repaymentSchedule;
                var schedulePeriods = [];
                var i;

                if (schedule && angular.isArray(schedule.futurePeriods) && schedule.futurePeriods.length) {
                    schedulePeriods = schedule.futurePeriods;
                } else if (schedule && angular.isArray(schedule.periods)) {
                    schedulePeriods = schedule.periods;
                }

                for (i = 0; i < schedulePeriods.length; i++) {
                    if (!schedulePeriods[i] || !schedulePeriods[i].dueDate) {
                        continue;
                    }

                    if (schedulePeriods[i].obligationsMetOnDate) {
                        continue;
                    }

                    return normalizeDate(schedulePeriods[i].dueDate);
                }

                return normalizeDate(fallbackDate) || new Date();
            };

            var normalizeInteger = function (value) {
                if (value === undefined || value === null || value === '') {
                    return value;
                }
                return parseInt(value, 10);
            };

            scope.loanId = routeParams.loanId;
            scope.formData = {};
            scope.rejectData = {};
            scope.adjustFuturePayments = true;
            scope.formData.submittedOnDate = new Date();
            scope.repaymentFrequencyTypeOptions = fallbackRepaymentFrequencyTypeOptions.slice();
            scope.formData.preserveLoanTermDuration = false;

            resourceFactory.loanRescheduleResource.template({scheduleId:'template', loanId:scope.loanId},function(data){
                if (data.length > 0) {
                    scope.formData.rescheduleReasonId = data.rescheduleReasons[0].id;
                }
                scope.codes = data.rescheduleReasons;
                scope.availableCarryForwardCharges = data.availableCarryForwardCharges;
                scope.overdueChargeHandlingOptions = data.overdueChargeHandlingOptions;
                scope.adjustFuturePayments = data.adjustFuturePayments;
                scope.transactionTemplateDate = normalizeDate(data.loanTransactionData.date);
            });

            resourceFactory.loanResource.get({loanId: scope.loanId, template: true}, function (data) {
                scope.currentRepaymentEvery = data.repaymentEvery;
                scope.currentRepaymentFrequencyType = data.repaymentFrequencyType;
                scope.repaymentFrequencyTypeOptions = normalizeRepaymentFrequencyOptions(data);
                scope.formData.repaymentEvery = data.repaymentEvery;
                scope.formData.repaymentFrequencyType = data.repaymentFrequencyType ? data.repaymentFrequencyType.id : null;
                scope.formData.rescheduleFromDate = findDefaultRescheduleDate(data, scope.transactionTemplateDate);
                scope.formData.numberOfRepayments = data.numberOfRepayments;
                scope.formData.loanTermFrequency = data.termFrequency;
                scope.formData.loanTermFrequencyType = data.termPeriodFrequencyType ? data.termPeriodFrequencyType.id : null;
                mifosX.models.RepaymentFrequency.bindTo(scope);
            });

            scope.cancel = function () {
                location.path('/viewloanaccount/' + scope.loanId);
            };

            scope.submit = function () {
                if (scope.assertRepaymentFrequencyValid && !scope.assertRepaymentFrequencyValid(true)) {
                    return;
                }
                var repaymentEvery = normalizeInteger(this.formData.repaymentEvery);
                var repaymentFrequencyType = normalizeInteger(this.formData.repaymentFrequencyType);
                var currentRepaymentEvery = normalizeInteger(scope.currentRepaymentEvery);
                var currentRepaymentFrequencyType = scope.currentRepaymentFrequencyType ?
                    normalizeInteger(scope.currentRepaymentFrequencyType.id) : scope.currentRepaymentFrequencyType;
                var repaymentFrequencyChanged = repaymentEvery !== currentRepaymentEvery ||
                    repaymentFrequencyType !== currentRepaymentFrequencyType;

                this.formData.loanId = scope.loanId;
                this.formData.dateFormat = scope.df;
                this.formData.locale = scope.optlang.code;
                this.formData.rescheduleFromDate = dateFilter(this.formData.rescheduleFromDate, scope.df);
                this.formData.submittedOnDate = dateFilter(this.formData.submittedOnDate, scope.df);
                if (this.formData.carryForwardChargeDueDate) {
                    this.formData.carryForwardChargeDueDate =
                        dateFilter(this.formData.carryForwardChargeDueDate, scope.df);
                }
                this.formData.rescheduleReasonComment = scope.comments;

                if (scope.changeRepaymentDate && this.formData.adjustedDueDate) {
                    this.formData.adjustedDueDate = dateFilter(this.formData.adjustedDueDate, scope.df);
                } else {
                    delete this.formData.adjustedDueDate;
                }

                if (scope.changeEMI) {
                    this.formData.endDate = dateFilter(this.formData.endDate, scope.df);
                } else {
                    delete this.formData.endDate;
                    delete this.formData.emi;
                }

                if (repaymentFrequencyChanged) {
                    this.formData.repaymentEvery = repaymentEvery;
                    this.formData.repaymentFrequencyType = repaymentFrequencyType;
                    // preserveLoanTermDuration is only meaningful when the repayment frequency is changing
                    this.formData.preserveLoanTermDuration = !!this.formData.preserveLoanTermDuration;
                } else {
                    delete this.formData.repaymentEvery;
                    delete this.formData.repaymentFrequencyType;
                    // Do not send preserveLoanTermDuration for non-frequency reschedule types
                    delete this.formData.preserveLoanTermDuration;
                }
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
