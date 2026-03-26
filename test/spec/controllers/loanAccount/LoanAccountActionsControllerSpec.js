describe("LoanAccountActionsController", function () {
    var templateCallback;

    beforeEach(function () {
        this.scope = {
            $watch: jasmine.createSpy('$watch')
        };
        this.rootScope = {};
        this.routeParams = {
            action: 'recoverypayment',
            id: 42
        };
        this.location = jasmine.createSpyObj('$location', ['path']);
        this.dateFilter = jasmine.createSpy('dateFilter').andCallFake(function (date, format) {
            return [format, date.getFullYear(), date.getMonth() + 1, date.getDate()].join('|');
        });
        this.resourceFactory = {
            loanTrxnsTemplateResource: {
                get: jasmine.createSpy('loanTrxnsTemplateResource.get').andCallFake(function (params, callback) {
                    templateCallback = callback;
                })
            },
            loanTrxnsResource: {
                save: jasmine.createSpy('loanTrxnsResource.save')
            }
        };

        this.controller = new mifosX.controllers.LoanAccountActionsController(
            this.scope,
            this.rootScope,
            this.resourceFactory,
            this.location,
            this.routeParams,
            this.dateFilter
        );

        this.scope.optlang = {code: 'en'};
        this.scope.df = 'dd MMMM yyyy';
    });

    it("should use writeOffOnDate as the minimum recovery payment date", function () {
        templateCallback({
            paymentTypeOptions: [{id: 7}],
            amount: 1250,
            date: [2026, 3, 20],
            writeOffOnDate: [2026, 3, 25]
        });

        expect(this.scope.formData.paymentTypeId).toEqual(7);
        expect(this.scope.formData.transactionAmount).toEqual(1250);
        expect(this.scope.transactionDateMinDate.getTime()).toEqual(new Date(2026, 2, 25).getTime());
        expect(this.scope.formData.transactionDate.getTime()).toEqual(new Date(2026, 2, 25).getTime());
        expect(this.scope.getRecoveryPaymentWriteOffDateArgs()).toEqual({
            params: [{value: 'dd MMMM yyyy|2026|3|25'}]
        });
    });

    it("should block recovery payment submission before the write-off date", function () {
        templateCallback({
            paymentTypeOptions: [{id: 7}],
            amount: 1250,
            date: [2026, 3, 26],
            writeOffOnDate: [2026, 3, 25]
        });

        this.scope.formData.transactionDate = new Date(2026, 2, 24);
        this.scope.submit();

        expect(this.resourceFactory.loanTrxnsResource.save).not.toHaveBeenCalled();
        expect(this.scope.getRecoveryPaymentDateErrorCode()).toEqual('error.msg.loan.recovery.payment.date.cannot.be.before.writeoff.date');
    });

    it("should allow recovery payment submission on the write-off date", function () {
        templateCallback({
            paymentTypeOptions: [{id: 7}],
            amount: 1250,
            date: [2026, 3, 26],
            writeOffOnDate: [2026, 3, 25]
        });

        this.scope.formData.transactionDate = new Date(2026, 2, 25);
        this.scope.submit();

        expect(this.resourceFactory.loanTrxnsResource.save).toHaveBeenCalled();
        expect(this.resourceFactory.loanTrxnsResource.save.mostRecentCall.args[0]).toEqual({
            command: 'recoverypayment',
            loanId: 42
        });
        expect(this.resourceFactory.loanTrxnsResource.save.mostRecentCall.args[1].transactionDate).toEqual('dd MMMM yyyy|2026|3|25');
    });
});
