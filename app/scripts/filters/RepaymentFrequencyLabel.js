(function (module) {
    mifosX.filters = _.extend(module, {
        RepaymentFrequencyLabel: function () {
            return function (repaymentEvery, frequencyType) {
                var typeId = frequencyType && frequencyType.id !== undefined ? frequencyType.id : frequencyType;
                var typeValue = frequencyType && frequencyType.value ? frequencyType.value : '';
                if (mifosX.models && mifosX.models.RepaymentFrequency) {
                    return mifosX.models.RepaymentFrequency.label(repaymentEvery, typeId, typeValue);
                }
                return repaymentEvery && typeValue ? repaymentEvery + ' ' + typeValue : typeValue;
            };
        }
    });
    mifosX.ng.application.filter('RepaymentFrequencyLabel', [mifosX.filters.RepaymentFrequencyLabel]).run(function ($log) {
        $log.info("RepaymentFrequencyLabel filter initialized");
    });
}(mifosX.filters || {}));
