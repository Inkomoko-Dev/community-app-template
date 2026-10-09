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
});
