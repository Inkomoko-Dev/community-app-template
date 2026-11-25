describe("Payment type is required on payments", function () {
    var scope, rootScope, pending;

    var createController = function (action) {
        pending = {};
        scope = {
            $watch: jasmine.createSpy('$watch'),
            $watchGroup: jasmine.createSpy('$watchGroup'),
            optlang: {code: 'en'},
            df: 'dd MMMM yyyy'
        };
        rootScope = {};
        var capture = function (name) {
            return jasmine.createSpy(name).andCallFake(function (params, success, failure) {
                pending[name] = {params: params, success: success, failure: failure};
            });
        };
        var posted = function (name) {
            return jasmine.createSpy(name).andCallFake(function (params, body, success) {
                pending[name] = {params: params, body: body, success: success};
            });
        };
        var resourceFactory = {
            LoanAccountResource: {
                getLoanAccountDetails: capture('loanDetails')
            },
            loanTrxnsTemplateResource: {
                get: capture('template')
            },
            loanTrxnsResource: {
                get: capture('transaction'),
                save: posted('transactionSave')
            },
            entityDatatableChecksResource: {
                getAll: jasmine.createSpy('entityDatatableChecks')
            }
        };
        new mifosX.controllers.LoanAccountActionsController(
            scope,
            rootScope,
            resourceFactory,
            jasmine.createSpyObj('$location', ['path']),
            {action: action, id: 42, transactionId: 9},
            function (date, format) {
                return date ? [format, date.getFullYear(), date.getMonth() + 1, date.getDate()].join('|') : undefined;
            }
        );
    };

    var paymentTypes = [{id: 103, name: 'M-Pesa'}, {id: 1, name: 'Cash'}];

    it("shows the payment type on Pay Off and picks the first one", function () {
        createController('payoff');
        pending.template.success({date: [2026, 11, 25], amount: 1667.67, paymentTypeOptions: paymentTypes});

        expect(scope.isTransaction).toBe(true);
        expect(scope.paymentTypes).toEqual(paymentTypes);
        expect(scope.formData.paymentTypeId).toBe(103);
        expect(scope.isPaymentTypeRequired()).toBe(true);
    });

    it("stops a Pay Off without a payment type before it is sent", function () {
        createController('payoff');
        pending.template.success({date: [2026, 11, 25], amount: 1667.67, paymentTypeOptions: paymentTypes});
        scope.formData.paymentTypeId = '';

        scope.submit();

        expect(scope.error).toBe('Please select a payment type.');
        expect(pending.transactionSave).toBeUndefined();
    });

    it("sends a Pay Off with its payment type", function () {
        createController('payoff');
        pending.template.success({date: [2026, 11, 25], amount: 1667.67, paymentTypeOptions: paymentTypes});

        scope.submit();

        expect(pending.transactionSave.params.command).toBe('payoff');
        expect(pending.transactionSave.body.paymentTypeId).toBe(103);
    });

    it("stops a repayment without a payment type before it is sent", function () {
        createController('repayment');
        pending.template.success({date: [2026, 11, 25], amount: 311000, paymentTypeOptions: paymentTypes});
        scope.formData.paymentTypeId = '';

        scope.submit();

        expect(scope.error).toBe('Please select a payment type.');
        expect(pending.transactionSave).toBeUndefined();
    });

    it("tells the user to refresh when the payment types did not load", function () {
        createController('repayment');
        pending.template.success({date: [2026, 11, 25], amount: 311000});

        scope.submit();

        expect(scope.error).toBe('Payment types did not load. Refresh the page and try again.');
        expect(pending.transactionSave).toBeUndefined();
    });

    it("requires a payment type when editing a repayment but not when undoing it", function () {
        createController('modifytransaction');
        pending.transaction.success({type: {repayment: true}, amount: 311000, date: [2026, 9, 3], paymentTypeOptions: paymentTypes});

        expect(scope.isPaymentTypeRequired()).toBe(true);
        scope.formData.transactionAmount = 0;
        expect(scope.isPaymentTypeRequired()).toBe(false);
    });

    it("does not require a payment type on a waiver", function () {
        createController('waiveinterest');

        expect(scope.isPaymentTypeRequired()).toBe(false);
    });
});
