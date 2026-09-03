(function (module) {
    mifosX.filters = _.extend(module, {
        RepaymentFrequencyLabel: function () {
            return function (repaymentEvery, frequencyType) {
                if (!(mifosX.models && mifosX.models.RepaymentFrequency)) {
                    return repaymentEvery;
                }
                var helper = mifosX.models.RepaymentFrequency;
                var typeValue = '';
                if (frequencyType && typeof frequencyType === 'object') {
                    typeValue = frequencyType.value || '';
                } else if (typeof frequencyType === 'string' && isNaN(frequencyType)) {
                    typeValue = frequencyType;
                }
                return helper.label(repaymentEvery, frequencyType, typeValue);
            };
        }
    });
    mifosX.ng.application.filter('RepaymentFrequencyLabel', [mifosX.filters.RepaymentFrequencyLabel]).run(function ($log) {
        $log.info("RepaymentFrequencyLabel filter initialized");
    });
}(mifosX.filters || {}));
