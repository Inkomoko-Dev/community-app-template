describe("ViewLoanDetailsController", function () {
    var scope, resourceFactory, paginatorService, interval;

    function activeLoanWithCharges(charges) {
        return {
            id: 413468,
            accountNo: "000413468",
            clientId: 10,
            clientName: "Sample Client",
            loanProductId: 20,
            loanProductName: "Penalty Loan",
            loanOfficerName: "Loan Officer",
            currency: {
                code: "SSP",
                decimalPlaces: 2
            },
            status: {
                id: 300,
                value: "Active"
            },
            subStatus: {
                id: 0,
                value: ""
            },
            repaymentSchedule: {
                totalWaived: 0
            },
            timeline: {
                actualDisbursementDate: [2026, 1, 1],
                submittedOnDate: [2025, 12, 1]
            },
            charges: charges,
            transactions: [],
            isExtendLoanLifeCycleConfig: false,
            recalculateInterest: false
        };
    }

    function createController(charges) {
        scope = {
            $on: jasmine.createSpy("$on"),
            optlang: {
                code: "en"
            },
            df: "dd MMMM yyyy"
        };

        resourceFactory = {
            LoanAccountResource: {
                getLoanAccountDetails: jasmine.createSpy("LoanAccountResource.getLoanAccountDetails").andCallFake(function (params, callback) {
                    callback(activeLoanWithCharges(charges));
                }),
                delete: jasmine.createSpy("LoanAccountResource.delete")
            },
            standingInstructionTemplateResource: {
                get: jasmine.createSpy("standingInstructionTemplateResource.get")
            },
            standingInstructionResource: {
                search: jasmine.createSpy("standingInstructionResource.search")
            },
            creditBureauByLoanProductId: {
                get: jasmine.createSpy("creditBureauByLoanProductId.get")
            },
            loanResource: {
                getAllNotes: jasmine.createSpy("loanResource.getAllNotes").andCallFake(function (params, callback) {
                    callback([]);
                }),
                save: jasmine.createSpy("loanResource.save")
            },
            DataTablesResource: {
                getAllDataTables: jasmine.createSpy("DataTablesResource.getAllDataTables").andCallFake(function (params, callback) {
                    callback([]);
                }),
                getTableDetails: jasmine.createSpy("DataTablesResource.getTableDetails")
            }
        };

        paginatorService = {
            paginate: jasmine.createSpy("paginate").andReturn({ currentPageItems: [] })
        };
        interval = jasmine.createSpy("interval").andReturn(1);
        interval.cancel = jasmine.createSpy("interval.cancel");

        new mifosX.controllers.ViewLoanDetailsController(scope, { id: 413468 }, resourceFactory, paginatorService,
            jasmine.createSpyObj("location", ["path"]), jasmine.createSpyObj("route", ["reload"]), {},
            jasmine.createSpyObj("$uibModal", ["open"]), function () { return ""; }, "/api/v1", {}, {},
            {}, interval, { get: jasmine.createSpy("webStorage.get") },
            { getFromLocalStorage: jasmine.createSpy("getFromLocalStorage") });
    }

    it("allows residual penalty waiver for a waived active penalty charge with outstanding balance", function () {
        createController([{
            id: 1,
            name: "Penalty",
            penalty: true,
            paid: false,
            waived: true,
            amountOutstanding: 537400,
            chargeTimeType: { value: "Specified due date" }
        }]);

        expect(scope.isResidualPenaltyWaiver(scope.charges[0])).toBe(true);
        expect(scope.canWaiveLoanCharge(scope.charges[0])).toBe(true);
        expect(scope.charges[0].actionFlag).toBe(false);
    });

    it("does not allow residual penalty waiver for non-penalty or settled charges", function () {
        createController([
            {
                id: 1,
                name: "Fee",
                penalty: false,
                paid: false,
                waived: true,
                amountOutstanding: 537400,
                chargeTimeType: { value: "Specified due date" }
            },
            {
                id: 2,
                name: "Settled Penalty",
                penalty: true,
                paid: false,
                waived: true,
                amountOutstanding: 0,
                chargeTimeType: { value: "Specified due date" }
            }
        ]);

        expect(scope.isResidualPenaltyWaiver(scope.charges[0])).toBe(false);
        expect(scope.isResidualPenaltyWaiver(scope.charges[1])).toBe(false);
        expect(scope.canWaiveLoanCharge(scope.charges[0])).toBe(false);
        expect(scope.canWaiveLoanCharge(scope.charges[1])).toBe(false);
        expect(scope.charges[0].actionFlag).toBe(true);
        expect(scope.charges[1].actionFlag).toBe(true);
    });
});
