describe("RepaymentFrequency", function () {
    var MONTHS = 2;
    var WEEKS = 1;

    function monthlyForm(overrides) {
        var form = {
            loanTermFrequency: 12,
            loanTermFrequencyType: MONTHS,
            numberOfRepayments: 12,
            repaymentEvery: 1,
            repaymentFrequencyType: MONTHS
        };
        return _.extend(form, overrides || {});
    }

    it("sets loan term from monthly repayment count and does not clobber repayments", function () {
        var RF = mifosX.models.RepaymentFrequency;
        var formData = monthlyForm({
            loanTermFrequency: 12,
            numberOfRepayments: 6
        });

        RF.syncTermFromInstallments(formData);

        expect(formData.numberOfRepayments).toEqual(6);
        expect(formData.loanTermFrequency).toEqual(6);
    });

    it("sets loan term for quarterly repaymentEvery=3", function () {
        var RF = mifosX.models.RepaymentFrequency;
        var formData = monthlyForm({
            loanTermFrequency: 12,
            numberOfRepayments: 8,
            repaymentEvery: 3
        });

        RF.syncTermFromInstallments(formData);

        expect(formData.numberOfRepayments).toEqual(8);
        expect(formData.loanTermFrequency).toEqual(24);
    });

    it("sets loan term for semi-annual repaymentEvery=6", function () {
        var RF = mifosX.models.RepaymentFrequency;
        var formData = monthlyForm({
            loanTermFrequency: 12,
            numberOfRepayments: 4,
            repaymentEvery: 6
        });

        RF.syncTermFromInstallments(formData);

        expect(formData.numberOfRepayments).toEqual(4);
        expect(formData.loanTermFrequency).toEqual(24);
    });

    it("is a no-op when repayment frequency is not months", function () {
        var RF = mifosX.models.RepaymentFrequency;
        var formData = monthlyForm({
            loanTermFrequency: 12,
            numberOfRepayments: 6,
            repaymentFrequencyType: WEEKS,
            loanTermFrequencyType: WEEKS
        });

        RF.syncTermFromInstallments(formData);

        expect(formData.loanTermFrequency).toEqual(12);
        expect(formData.numberOfRepayments).toEqual(6);
    });

    it("is a no-op for empty or invalid repayment counts", function () {
        var RF = mifosX.models.RepaymentFrequency;
        var blank = monthlyForm({ numberOfRepayments: '', loanTermFrequency: 12 });
        var zero = monthlyForm({ numberOfRepayments: 0, loanTermFrequency: 12 });
        var nanValue = monthlyForm({ numberOfRepayments: 'abc', loanTermFrequency: 12 });

        RF.syncTermFromInstallments(blank);
        RF.syncTermFromInstallments(zero);
        RF.syncTermFromInstallments(nanValue);

        expect(blank.loanTermFrequency).toEqual(12);
        expect(zero.loanTermFrequency).toEqual(12);
        expect(nanValue.loanTermFrequency).toEqual(12);
    });

    it("still derives monthly repayments from loan term", function () {
        var RF = mifosX.models.RepaymentFrequency;
        var formData = monthlyForm({
            loanTermFrequency: 24,
            numberOfRepayments: 12
        });

        RF.syncInstallmentsFromTerm(formData);

        expect(formData.numberOfRepayments).toEqual(24);
        expect(formData.loanTermFrequency).toEqual(24);
    });

    it("updates term via bindTo handler without resetting repayments", function () {
        var RF = mifosX.models.RepaymentFrequency;
        var scope = {
            formData: monthlyForm({
                loanTermFrequency: 12,
                numberOfRepayments: 12
            })
        };

        RF.bindTo(scope);
        scope.formData.numberOfRepayments = 6;
        scope.onNumberOfRepaymentsChange();

        expect(scope.formData.numberOfRepayments).toEqual(6);
        expect(scope.formData.loanTermFrequency).toEqual(6);
        expect(scope.repaymentFrequencyError).toEqual(null);
    });

    it("realigns loan term when switching to quarterly after a non-aligned repayment edit", function () {
        var RF = mifosX.models.RepaymentFrequency;
        var scope = {
            formData: monthlyForm({
                loanTermFrequency: 12,
                numberOfRepayments: 12,
                repaymentEvery: 1,
                repaymentFrequencyType: MONTHS
            })
        };

        RF.bindTo(scope);
        scope.formData.numberOfRepayments = 7;
        scope.onNumberOfRepaymentsChange();
        expect(scope.formData.loanTermFrequency).toEqual(7);

        scope.repaymentFrequencyPreset = 'QUARTERLY';
        scope.onRepaymentFrequencyPresetChange();

        expect(scope.formData.repaymentEvery).toEqual(3);
        expect(scope.formData.numberOfRepayments).toEqual(7);
        expect(scope.formData.loanTermFrequency).toEqual(21);
        expect(scope.repaymentFrequencyError).toEqual(null);
    });
});
