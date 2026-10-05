describe("Reschedule fixed principal", function () {
    var translate = {
        instant: function (key) {
            return key;
        }
    };
    var dateFilter = function (date) {
        return date;
    };

    describe("RescheduleLoansRequestController", function () {
        beforeEach(function () {
            this.scope = {optlang: {code: "en"}, df: "dd MMMM yyyy"};
            this.location = {path: jasmine.createSpy("location.path")};
            this.resourceFactory = {
                loanRescheduleResource: {
                    template: jasmine.createSpy("template"),
                    put: jasmine.createSpy("put")
                },
                loanResource: {get: jasmine.createSpy("loanResource.get")}
            };
            new mifosX.controllers.RescheduleLoansRequestController(this.scope, this.resourceFactory, {loanId: 422415},
                this.location, dateFilter, translate);
            this.scope.formData.rescheduleFromDate = "01 July 2026";
            this.scope.formData.submittedOnDate = "28 September 2026";
        });

        it("does not send a fixed principal amount once the option is unticked", function () {
            this.scope.formData.newPrincipalDueFixedAmount = "30,000";
            this.scope.changeFixedPrincipal = false;
            this.scope.changeRepaymentDate = true;
            this.scope.formData.adjustedDueDate = "30 September 2026";

            this.scope.submit();

            var payload = this.resourceFactory.loanRescheduleResource.put.mostRecentCall.args[0];
            expect(payload.newPrincipalDueFixedAmount).toBeUndefined();
            expect(payload.adjustedDueDate).toEqual("30 September 2026");
        });

        it("does not send a fixed principal percentage once the option is unticked", function () {
            this.scope.formData.newFixedPrincipalPercentagePerInstallment = "4.2857";
            this.scope.changeFixedPrincipalPercentagePerInstallment = false;
            this.scope.changeFixedPrincipal = true;
            this.scope.formData.newPrincipalDueFixedAmount = "30,000";

            this.scope.submit();

            var payload = this.resourceFactory.loanRescheduleResource.put.mostRecentCall.args[0];
            expect(payload.newFixedPrincipalPercentagePerInstallment).toBeUndefined();
            expect(payload.newPrincipalDueFixedAmount).toEqual("30,000");
        });

        it("refuses an amount and a percentage together", function () {
            this.scope.changeFixedPrincipal = true;
            this.scope.formData.newPrincipalDueFixedAmount = "30,000";
            this.scope.changeFixedPrincipalPercentagePerInstallment = true;
            this.scope.formData.newFixedPrincipalPercentagePerInstallment = "4.2857";

            this.scope.submit();

            expect(this.resourceFactory.loanRescheduleResource.put).not.toHaveBeenCalled();
            expect(this.scope.error).toEqual("validation.msg.rescheduleloan.fixedPrincipal.amountAndPercentage");
        });

        it("refuses a ticked fixed principal option without a value", function () {
            this.scope.changeFixedPrincipal = true;

            this.scope.submit();

            expect(this.resourceFactory.loanRescheduleResource.put).not.toHaveBeenCalled();
            expect(this.scope.error).toEqual("validation.msg.rescheduleloan.fixedPrincipal.required");
        });
    });

    describe("RescheduleLoansRequestController defaults", function () {
        it("defaults the reschedule date to the first unpaid repayment and the reason to the first option", function () {
            var scope = {optlang: {code: "en"}, df: "dd MMMM yyyy"};
            var loanParams;
            var resourceFactory = {
                loanRescheduleResource: {
                    template: function (params, callback) {
                        callback({
                            rescheduleReasons: [{id: 693, name: "Adjust repayment schedule"}],
                            loanTransactionData: {date: [2026, 10, 5]}
                        });
                    },
                    put: jasmine.createSpy("put")
                },
                loanResource: {
                    get: function (params, callback) {
                        loanParams = params;
                        callback({
                            repaymentEvery: 1,
                            repaymentFrequencyType: {id: 2},
                            repaymentSchedule: {
                                periods: [
                                    {dueDate: [2025, 12, 1]},
                                    {period: 1, dueDate: [2026, 1, 1], complete: true, obligationsMetOnDate: [2026, 1, 2]},
                                    {period: 7, dueDate: [2026, 7, 1], complete: false},
                                    {period: 8, dueDate: [2026, 8, 1], complete: false}
                                ]
                            }
                        });
                    }
                }
            };

            new mifosX.controllers.RescheduleLoansRequestController(scope, resourceFactory, {loanId: 422415},
                {path: function () {}}, dateFilter, translate);

            expect(loanParams.associations).toEqual("repaymentSchedule");
            expect(scope.formData.rescheduleReasonId).toEqual(693);
            expect(scope.formData.rescheduleFromDate.getFullYear()).toEqual(2026);
            expect(scope.formData.rescheduleFromDate.getMonth()).toEqual(6);
            expect(scope.formData.rescheduleFromDate.getDate()).toEqual(1);
        });
    });

    describe("ViewRescheduleRequestController", function () {
        it("lists the fixed principal change per instalment without touching extra terms", function () {
            var scope = {};
            var resourceFactory = {
                loanRescheduleResource: {
                    get: function (params, callback) {
                        callback({
                            rescheduleFromDate: [2026, 7, 1],
                            timeline: {submittedOnDate: [2026, 9, 28]},
                            loanTermVariationsData: [
                                {termType: {value: "fixedPrincipalPerInstallmentAmount"}, termVariationApplicableFrom: [2026, 9, 1], decimalValue: 30000},
                                {termType: {value: "fixedPrincipalPerInstallmentAmount"}, termVariationApplicableFrom: [2026, 7, 1], decimalValue: 30000},
                                {termType: {value: "extendRepaymentPeriod"}, termVariationApplicableFrom: [2026, 7, 1], decimalValue: 2}
                            ]
                        });
                    }
                }
            };

            new mifosX.controllers.ViewRescheduleRequestController(scope, resourceFactory, {loanId: 422415, requestId: 14796},
                {path: function () {}}, dateFilter);

            expect(scope.principalAmountChange).toBe(true);
            expect(scope.loanRescheduleDetails.principalAmountChange.length).toEqual(2);
            expect(scope.loanRescheduleDetails.principalAmountChange[0].date).toEqual([2026, 7, 1]);
            expect(scope.loanRescheduleDetails.principalAmountChange[0].amount).toEqual(30000);
            expect(scope.loanRescheduleDetails.extraTerms).toEqual(2);
        });
    });

    describe("PreviewLoanRepaymentScheduleController", function () {
        function preview(failure) {
            var scope = {};
            var resourceFactory = {
                loanRescheduleResource: {
                    preview: function (params, success, error) {
                        error(failure);
                    }
                }
            };
            new mifosX.controllers.PreviewLoanRepaymentScheduleController(scope, resourceFactory, {loanId: 422415, requestId: 14796},
                {path: function () {}}, dateFilter, translate);
            return scope;
        }

        it("explains a gateway failure instead of showing an empty schedule", function () {
            var scope = preview({status: 404, data: "<html><body>404 Not Found nginx</body></html>"});

            expect(scope.previewLoaded).toBe(false);
            expect(scope.previewError).toEqual("error.msg.loan.reschedule.preview.failed");
        });

        it("shows the platform message when the schedule cannot be generated", function () {
            var scope = preview({status: 403, data: {errors: [{defaultUserMessage: "The repayment schedule does not repay the outstanding principal"}]}});

            expect(scope.previewLoaded).toBe(false);
            expect(scope.previewError).toEqual("The repayment schedule does not repay the outstanding principal");
        });
    });
});
