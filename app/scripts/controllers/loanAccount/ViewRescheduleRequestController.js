(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewRescheduleRequestController: function (scope, resourceFactory, routeParams, location, dateFilter) {
            scope.requestId = routeParams.requestId;
            scope.loanId = routeParams.loanId;

            function toTime(date) {
                return angular.isArray(date) ? new Date(date[0], date[1] - 1, date[2]).getTime() : new Date(date).getTime();
            }

            resourceFactory.loanRescheduleResource.get({scheduleId:scope.requestId}, function (data) {
                scope.loanRescheduleDetails = data;
                scope.loanTermVariationsData = data.loanTermVariationsData;
                scope.rescheduleFromDate = new Date(scope.loanRescheduleDetails.rescheduleFromDate);
                scope.rescheduleFromDate = dateFilter(scope.rescheduleFromDate,"dd MMMM yyyy");
                scope.submittedOnDate = new Date(scope.loanRescheduleDetails.timeline.submittedOnDate);
                scope.submittedOnDate = dateFilter(scope.submittedOnDate,"dd MMMM yyyy");
                scope.repaymentFrequencyTypeValue = scope.loanRescheduleDetails.repaymentFrequencyType ?
                    (scope.loanRescheduleDetails.repaymentFrequencyType.value ||
                        scope.loanRescheduleDetails.repaymentFrequencyType.name ||
                        scope.loanRescheduleDetails.repaymentFrequencyType) : '';
                scope.loanRescheduleDetails.emichange = [];
                scope.loanRescheduleDetails.principalAmountChange = [];
                for(var i in scope.loanTermVariationsData) {

                    if(scope.loanTermVariationsData[i].termType.value == "dueDate") {
                        scope.loanRescheduleDetails.adjustedDueDate = new Date(scope.loanTermVariationsData[i].dateValue);
                        scope.loanRescheduleDetails.adjustedDueDate = dateFilter(scope.loanTermVariationsData[i].dateValue,"dd MMMM yyyy");
                        scope.changeRepaymentDate = true;
                    }

                    if(scope.loanTermVariationsData[i].termType.value == "graceOnPrincipal") {
                        scope.loanRescheduleDetails.graceOnPrincipal = scope.loanTermVariationsData[i].decimalValue;
                        scope.introduceGracePeriods = true;
                    }

                    if(scope.loanTermVariationsData[i].termType.value == "graceOnInterest") {
                        scope.loanRescheduleDetails.graceOnInterest = scope.loanTermVariationsData[i].decimalValue;
                        scope.introduceGracePeriods = true;
                    }

                    if(scope.loanTermVariationsData[i].termType.value == "extendRepaymentPeriod") {
                        scope.loanRescheduleDetails.extraTerms = scope.loanTermVariationsData[i].decimalValue;
                        scope.extendRepaymentPeriod = true;
                    }

                    var termTypeValue = scope.loanTermVariationsData[i].termType.value;
                    if (termTypeValue === 'principalAmount' || termTypeValue === 'fixedPrincipalPerInstallmentAmount') {
                        scope.loanRescheduleDetails.principalAmountChange.push({
                            amount: scope.loanTermVariationsData[i].decimalValue,
                            date: scope.loanTermVariationsData[i].termVariationApplicableFrom
                        });
                        scope.principalAmountChange = true;
                     }

                    if(scope.loanTermVariationsData[i].termType.value == "interestRateForInstallment") {
                        scope.loanRescheduleDetails.interestRate = scope.loanTermVariationsData[i].decimalValue;
                        scope.adjustinterestrates = true;
                    }
                    if(scope.loanTermVariationsData[i].termType.value == "principalPercentagePerInstallment") {
                        scope.loanRescheduleDetails.newFixedPrincipalPercentagePerInstallment = scope.loanTermVariationsData[i].decimalValue;
                        scope.changeFixedPrincipalPercentagePerInstallment = true;
                    }
                    

                    if(scope.loanTermVariationsData[i].termType.value == "emiAmount") {
                        var emi = {};
                        emi.emi = scope.loanTermVariationsData[i].decimalValue;
                        emi.instDate = dateFilter(scope.loanTermVariationsData[i].dateValue,"dd MMMM yyyy");
                        scope.loanRescheduleDetails.emichange.push(emi);
                        scope.changeEMI = true;
                    }
                }
                scope.loanRescheduleDetails.principalAmountChange.sort(function (a, b) {
                    return toTime(a.date) - toTime(b.date);
                });
            });

            scope.reject = function(){
                location.path('/loans/' + scope.loanId + '/rejectreschedulerequest/'+scope.requestId);
            };

            scope.approve = function(){

                location.path('/loans/' + scope.loanId + '/approvereschedulerequest/'+scope.requestId);
            };

            scope.cancel = function () {
                location.path('/loans/' + scope.loanId + '/reschedule/');
            };

            scope.submit = function () {
                location.path('/loans/' + scope.loanId  + '/previewloanrepaymentschedule/'+scope.requestId);
            };

        }
    });
    mifosX.ng.application.controller('ViewRescheduleRequestController', ['$scope', 'ResourceFactory', '$routeParams', '$location', 'dateFilter', mifosX.controllers.ViewRescheduleRequestController]).run(function ($log) {
        $log.info("ViewRescheduleRequestController initialized");
    });
}(mifosX.controllers || {}));
