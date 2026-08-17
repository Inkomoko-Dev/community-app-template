describe("BulkLoanRescheduleController", function () {
    beforeEach(function () {
        this.scope = {};
        this.dateFilter = jasmine.createSpy("dateFilter").andCallFake(function (date, format) {
            return format + "|" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
        });
        this.resourceFactory = {
            bulkLoanRescheduleTemplateResource: {
                get: jasmine.createSpy("bulkLoanRescheduleTemplateResource.get").andCallFake(function (params, callback) {
                    this.templateParams = params;
                    callback({
                        filterOptions: {
                            offices: [
                                {id: 1, name: "Head Office", parentOfficeId: null, hierarchy: "1."},
                                {id: 2, name: "Branch A", parentOfficeId: 1, hierarchy: "1.2."}
                            ],
                            loanStatuses: [{id: "300", value: "300", name: "Active"}],
                            installmentStrategies: [{id: "NEXT_UNPAID", value: "NEXT_UNPAID", name: "Next unpaid installment"}],
                            interestRateTypes: [{id: "FLAT", value: "FLAT", name: "Flat"}],
                            loanProducts: [{id: 12, name: "Agriculture"}],
                            branches: [{id: 2, name: "Branch A", officeId: 1}],
                            loanOfficers: [{id: 9, name: "Officer A", officeId: 2}],
                            currentInterestRates: [{rate: "15.00", rateType: "FLAT"}]
                        },
                        validationRules: {
                            currentInterestRateIsExact: true,
                            newInterestRateIsManualInput: true,
                            newInterestRateMinValue: 0.0,
                            newInterestRateMaxValue: 50.0,
                            requiresApproval: true
                        },
                        userPermissions: {
                            canInitiateBulkReschedule: true,
                            canApprove: true,
                            accessibleOffices: [1, 2]
                        }
                    });
                }.bind(this))
            },
            bulkLoanRescheduleResource: {
                preview: jasmine.createSpy("bulkLoanRescheduleResource.preview").andCallFake(function (payload, callback) {
                    this.previewPayload = payload;
                    callback({
                        executionId: 88,
                        status: "PENDING_APPROVAL",
                        summary: {found: 2, toProcess: 1, skipped: 0, succeeded: 1, failed: 0, excluded: 1},
                        loanResults: [
                            {
                                loanId: 101,
                                accountNo: "LN-101",
                                currentInterestRate: 15,
                                newInterestRate: 10,
                                status: "SUCCESS",
                                message: "Ready"
                            }
                        ]
                    });
                }.bind(this)),
                getAll: jasmine.createSpy("bulkLoanRescheduleResource.getAll").andCallFake(function (params, callback) {
                    this.historyParams = params;
                    callback({pageItems: []});
                }.bind(this))
            },
            bulkLoanRescheduleExecutionResource: {
                get: jasmine.createSpy("bulkLoanRescheduleExecutionResource.get").andCallFake(function (params, callback) {
                    this.detailParams = params;
                    callback({
                        executionId: params.executionId,
                        status: "EXECUTED",
                        summary: {found: 3, toProcess: 2, skipped: 1, succeeded: 1, failed: 1, excluded: 0},
                        loanResults: [{
                            loanId: 201,
                            accountNo: "LN-201",
                            currentInterestRate: 16,
                            newInterestRate: 11,
                            status: "SKIPPED",
                            message: "Already processed"
                        }]
                    });
                }.bind(this)),
            },
            bulkLoanRescheduleCommandResource: {
                approve: jasmine.createSpy("bulkLoanRescheduleCommandResource.approve").andCallFake(function (params, payload, callback) {
                    this.approveParams = params;
                    this.approvePayload = payload;
                    callback({executionId: params.executionId, status: "APPROVED", summary: {}, loanResults: []});
                }.bind(this)),
                reject: jasmine.createSpy("bulkLoanRescheduleCommandResource.reject").andCallFake(function (params, payload, callback) {
                    this.rejectParams = params;
                    this.rejectPayload = payload;
                    callback({executionId: params.executionId, status: "REJECTED", summary: {}, loanResults: []});
                }.bind(this)),
                execute: jasmine.createSpy("bulkLoanRescheduleCommandResource.execute").andCallFake(function (params, payload, callback) {
                    this.executeParams = params;
                    this.executePayload = payload;
                    callback({executionId: params.executionId, status: "EXECUTED", summary: {}, loanResults: []});
                }.bind(this)),
                rollback: jasmine.createSpy("bulkLoanRescheduleCommandResource.rollback").andCallFake(function (params, payload, callback) {
                    this.rollbackParams = params;
                    this.rollbackPayload = payload;
                    callback({executionId: params.executionId, status: "ROLLED_BACK", summary: {}, loanResults: []});
                }.bind(this))
            },
            loanResource: {
                getAllLoans: jasmine.createSpy("loanResource.getAllLoans").andCallFake(function (params, callback) {
                    callback({pageItems: [
                        {id: 301, accountNo: "LN-301", clientName: "Client A"},
                        {id: 302, accountNo: "LN-302", clientName: "Client B"}
                    ]});
                })
            }
        };
        this.$q = {
            defer: function () {
                var resolved;
                return {
                    promise: {
                        then: function (callback) {
                            resolved = callback;
                        }
                    },
                    resolve: function (value) {
                        if (resolved) {
                            resolved(value);
                        }
                    }
                };
            }
        };
        window.confirm = jasmine.createSpy("confirm").andReturn(true);

        this.controller = new mifosX.controllers.BulkLoanRescheduleController(
            this.scope,
            this.resourceFactory,
            {},
            {executionId: null},
            this.dateFilter,
            this.$q
        );
    });

    it("should block preview until required filters are complete", function () {
        expect(this.resourceFactory.bulkLoanRescheduleTemplateResource.get).toHaveBeenCalledWith({officeId: 1}, jasmine.any(Function), jasmine.any(Function));
        expect(this.scope.officeOptions.length).toEqual(2);

        this.scope.formData.filters.officeId = null;
        this.scope.runPreview();

        expect(this.resourceFactory.bulkLoanRescheduleResource.preview).not.toHaveBeenCalled();
        expect(this.scope.validation.officeId).toBeTruthy();
        expect(this.scope.state.step).toEqual(1);
    });

    it("should map preview payload and advance to approval", function () {
        this.scope.selectOffice({id: 1, name: "Head Office"});
        this.scope.formData.filters.loanStatus = "300";
        this.scope.formData.filters.currentInterestRate = 15;
        this.scope.formData.newInterestRate = 10;
        this.scope.formData.filters.loanProductIds = [12];
        this.scope.formData.filters.loanOfficerIds = [9];
        this.scope.formData.filters.excludedLoans = [{id: 101}, {id: 102}];
        this.scope.formData.reschedulingDetails.installmentStrategy = "NEXT_UNPAID";
        this.scope.formData.reschedulingDetails.submittedOnDate = new Date(2026, 7, 1);
        this.scope.formData.reschedulingDetails.adjustInterestRates = true;

        this.scope.runPreview();

        expect(this.resourceFactory.bulkLoanRescheduleResource.preview).toHaveBeenCalled();
        expect(this.resourceFactory.bulkLoanRescheduleResource.preview.mostRecentCall.args[0].dryRun).toBeTruthy();
        expect(this.resourceFactory.bulkLoanRescheduleResource.preview.mostRecentCall.args[0].filters).toEqual({
            officeId: 1,
            loanStatus: "300",
            currentInterestRate: 15,
            loanProductIds: [12],
            loanOfficerIds: [9],
            excludedLoanIds: [101, 102]
        });
        expect(this.resourceFactory.bulkLoanRescheduleResource.preview.mostRecentCall.args[0].reschedulingDetails.installmentStrategy).toEqual("NEXT_UNPAID");
        expect(this.resourceFactory.bulkLoanRescheduleResource.preview.mostRecentCall.args[0].reschedulingDetails.submittedOnDate).toEqual("yyyy-MM-dd|2026-8-1");
        expect(this.resourceFactory.bulkLoanRescheduleResource.preview.mostRecentCall.args[0].reschedulingDetails.newInterestRate).toEqual(10);
        expect(this.scope.state.step).toEqual(2);
        expect(this.scope.previewData.metrics.found).toEqual(2);
        expect(this.scope.previewData.loanResults[0].currentInterestRate).toEqual(15);
        expect(this.scope.previewData.loanResults[0].selected).toBeTruthy();
    });

    it("should require approval note, approve, and enable execution", function () {
        this.scope.selectOffice({id: 1, name: "Head Office"});
        this.scope.formData.filters.loanStatus = "300";
        this.scope.formData.filters.currentInterestRate = 15;
        this.scope.formData.newInterestRate = 10;
        this.scope.formData.reschedulingDetails.installmentStrategy = "NEXT_UNPAID";
        this.scope.formData.reschedulingDetails.adjustInterestRates = true;
        this.scope.runPreview();

        expect(this.scope.canExecute).toBeFalsy();
        this.scope.approve();

        expect(this.resourceFactory.bulkLoanRescheduleCommandResource.approve).not.toHaveBeenCalled();
        expect(this.scope.validation.approvalNote).toBeTruthy();

        this.scope.approvalNote = "Approved for repricing";
        this.scope.approve();

        expect(this.resourceFactory.bulkLoanRescheduleCommandResource.approve).toHaveBeenCalled();
        expect(this.resourceFactory.bulkLoanRescheduleCommandResource.approve.mostRecentCall.args[0]).toEqual({executionId: 88});
        expect(this.resourceFactory.bulkLoanRescheduleCommandResource.approve.mostRecentCall.args[1]).toEqual({
            approvalNote: "Approved for repricing"
        });
        expect(this.scope.canExecute).toBeTruthy();
        this.scope.execute();
        expect(this.resourceFactory.bulkLoanRescheduleCommandResource.execute).toHaveBeenCalledWith({executionId: 88}, {}, jasmine.any(Function), jasmine.any(Function));
    });

    it("should normalize execution details and send rollback reasons", function () {
        var detailScope = {};
        new mifosX.controllers.BulkLoanRescheduleController(
            detailScope,
            this.resourceFactory,
            {executionId: 77},
            {},
            this.dateFilter,
            this.$q
        );

        expect(detailScope.execution.metrics.found).toEqual(3);
        expect(detailScope.execution.loanResults[0].message).toEqual("Already processed");

        this.scope.executionId = 77;
        this.scope.rollbackReason = "Incorrect criteria";
        this.scope.rollback();

        expect(window.confirm).toHaveBeenCalled();
        expect(this.resourceFactory.bulkLoanRescheduleCommandResource.rollback).toHaveBeenCalled();
        expect(this.resourceFactory.bulkLoanRescheduleCommandResource.rollback.mostRecentCall.args[0]).toEqual({executionId: 77});
        expect(this.resourceFactory.bulkLoanRescheduleCommandResource.rollback.mostRecentCall.args[1]).toEqual({
            rollbackReason: "Incorrect criteria"
        });
    });
});
