describe("RecoveryPaymentCorrectionModalController", function () {
    beforeEach(function () {
        this.scope = {};
        this.modalInstance = {
            close: jasmine.createSpy('$uibModalInstance.close'),
            dismiss: jasmine.createSpy('$uibModalInstance.dismiss')
        };
        this.dateFilter = jasmine.createSpy('dateFilter').andCallFake(function (date, format) {
            return [format, date.getFullYear(), date.getMonth() + 1, date.getDate()].join('|');
        });
        this.loanTransactionGetCallback = null;
        this.loanTransactionTemplateCallback = null;
        this.resourceFactory = {
            loanTrxnsResource: {
                get: jasmine.createSpy('loanTrxnsResource.get').andCallFake(function (params, callback) {
                    this.loanTransactionGetCallback = callback;
                }.bind(this)),
                save: jasmine.createSpy('loanTrxnsResource.save').andCallFake(function (params, payload, callback) {
                    if (callback) {
                        callback({loanId: params.loanId});
                    }
                })
            },
            loanTrxnsTemplateResource: {
                get: jasmine.createSpy('loanTrxnsTemplateResource.get').andCallFake(function (params, callback) {
                    this.loanTransactionTemplateCallback = callback;
                }.bind(this))
            }
        };
    });

    it("should automatically send the next open-period correction date when reversing a recovery payment", function () {
        this.controller = new mifosX.controllers.ReverseRecoveryPaymentModalController(
            this.scope,
            this.modalInstance,
            this.resourceFactory,
            this.dateFilter,
            42,
            {
                id: 3195112,
                date: [2026, 4, 17]
            },
            null,
            'dd MMMM yyyy',
            'en'
        );

        this.loanTransactionGetCallback({
            correctionDateRequired: true,
            latestClosedAccountingDate: [2026, 4, 17]
        });

        expect(this.scope.formData.correctionDate.getTime()).toEqual(new Date(2026, 3, 18).getTime());

        this.scope.submit();

        expect(this.resourceFactory.loanTrxnsResource.save).toHaveBeenCalled();
        expect(this.resourceFactory.loanTrxnsResource.save.mostRecentCall.args[0]).toEqual({
            loanId: 42,
            transactionId: 3195112,
            command: 'reverseRecoveryPayment'
        });
        expect(this.resourceFactory.loanTrxnsResource.save.mostRecentCall.args[1].correctionDate).toEqual('dd MMMM yyyy|2026|4|18');
    });

    it("should automatically send the correction date when reposting a corrected recovery payment", function () {
        this.controller = new mifosX.controllers.PostCorrectedRecoveryPaymentModalController(
            this.scope,
            this.modalInstance,
            this.resourceFactory,
            this.dateFilter,
            42,
            {
                id: 3195112,
                amount: 600,
                date: [2026, 4, 17],
                paymentDetailData: {
                    paymentType: {
                        id: 7
                    }
                }
            },
            null,
            'dd MMMM yyyy',
            'en'
        );

        this.loanTransactionTemplateCallback({
            paymentTypeOptions: [{id: 7}],
            originalTransactionId: 3195112,
            correctionDateRequired: true,
            earliestCorrectionDate: [2026, 4, 18]
        });

        expect(this.scope.formData.correctionDate.getTime()).toEqual(new Date(2026, 3, 18).getTime());

        this.scope.submit();

        expect(this.resourceFactory.loanTrxnsResource.save).toHaveBeenCalled();
        expect(this.resourceFactory.loanTrxnsResource.save.mostRecentCall.args[0]).toEqual({
            loanId: 42,
            command: 'recoverypayment'
        });
        expect(this.resourceFactory.loanTrxnsResource.save.mostRecentCall.args[1].originalTransactionId).toEqual(3195112);
        expect(this.resourceFactory.loanTrxnsResource.save.mostRecentCall.args[1].correctionDate).toEqual('dd MMMM yyyy|2026|4|18');
    });
});
