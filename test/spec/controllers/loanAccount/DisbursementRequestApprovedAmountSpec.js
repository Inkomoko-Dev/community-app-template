describe("CGLT-782 disbursement request keeps the approved amount", function () {
    var scope;

    var createController = function (action) {
        scope = {
            $watch: jasmine.createSpy("$watch"),
            $watchGroup: jasmine.createSpy("$watchGroup"),
            optlang: {code: "en"},
            df: "dd MMMM yyyy"
        };
        var resourceFactory = {
            LoanAccountResource: {
                getLoanAccountDetails: jasmine.createSpy("loanDetails"),
                save: jasmine.createSpy("loanSave")
            },
            loanTemplateResource: {
                get: jasmine.createSpy("loanTemplate")
            },
            loanTrxnsTemplateResource: {
                get: jasmine.createSpy("loanTrxnsTemplate")
            },
            loanTrxnsResource: {
                get: jasmine.createSpy("transaction"),
                save: jasmine.createSpy("transactionSave")
            },
            entityDatatableChecksResource: {
                getAll: jasmine.createSpy("entityDatatableChecks")
            },
            clientOtherInfoResource: {
                getAll: jasmine.createSpy("clientOtherInfo")
            }
        };
        new mifosX.controllers.LoanAccountActionsController(
            scope,
            {},
            resourceFactory,
            jasmine.createSpyObj("$location", ["path"]),
            {action: action || "repayment", id: 42},
            function (date, format) {
                return date ? [format, date.getFullYear(), date.getMonth() + 1, date.getDate()].join("|") : undefined;
            }
        );
    };

    it("caps the disbursement request display to the approved amount when the template still has the applied amount", function () {
        createController();

        var display = scope.approvedDisbursementDisplay(
            {approvedPrincipal: 250000, approvedICReview: 250000, proposedPrincipal: 300000},
            {amount: 300000, remainingUndisbursedAmount: 300000}
        );

        expect(display.amount).toEqual(250000);
        expect(display.remaining).toEqual(250000);
    });

    it("keeps a matching full approval amount", function () {
        createController();

        var display = scope.approvedDisbursementDisplay(
            {approvedPrincipal: 50000, proposedPrincipal: 50000},
            {amount: 50000, remainingUndisbursedAmount: 50000}
        );

        expect(display.amount).toEqual(50000);
        expect(display.remaining).toEqual(50000);
    });

    it("aligns a single undisbursed tranche to the approved amount", function () {
        createController("approve");
        scope.disbursementDetails = [{id: 1, principal: 300000}];
        scope.formData = scope.formData || {};
        scope.formData.approvedLoanAmount = 250000;

        scope.alignUndisbursedTranchesToApprovedAmount(250000);

        expect(scope.disbursementDetails[0].principal).toEqual(250000);
        expect(scope.showTrancheAmountTotal).toEqual(250000);
    });

    it("keeps a remaining tranche that is already within the approved amount", function () {
        createController();

        var display = scope.approvedDisbursementDisplay(
            {approvedPrincipal: 250000, approvedICReview: 250000, proposedPrincipal: 300000},
            {amount: 150000, remainingUndisbursedAmount: 150000}
        );

        expect(display.amount).toEqual(150000);
        expect(display.remaining).toEqual(150000);
    });

    it("caps a stale remaining tranche to remaining approved after a partial disbursement", function () {
        createController();

        var display = scope.approvedDisbursementDisplay(
            {approvedPrincipal: 250000, proposedPrincipal: 300000},
            {amount: 200000, remainingUndisbursedAmount: 150000}
        );

        expect(display.amount).toEqual(150000);
        expect(display.remaining).toEqual(150000);
    });

    it("subtracts disbursement charges when the form amount is capped to remaining approved", function () {
        createController();

        expect(scope.cappedDisbursementTransactionAmount(
            {amount: 250000, remaining: 250000},
            {amount: 300000, netDisbursalAmount: 290000, trancheNumber: 1}
        )).toEqual(240000);
    });

    it("aligns the only open tranche to remaining approved after a disbursed tranche", function () {
        createController("approve");
        scope.disbursementDetails = [
            {id: 1, principal: 100000, actualDisbursementDate: [2026, 9, 1]},
            {id: 2, principal: 200000}
        ];
        scope.formData = scope.formData || {};
        scope.formData.approvedLoanAmount = 250000;

        scope.alignUndisbursedTranchesToApprovedAmount(250000);

        expect(scope.disbursementDetails[0].principal).toEqual(100000);
        expect(scope.disbursementDetails[1].principal).toEqual(150000);
        expect(scope.showTrancheAmountTotal).toEqual(250000);
    });
});
