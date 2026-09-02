(function (module) {
    var MONTHS = 2;
    mifosX.models = _.extend(module, {
        RepaymentFrequency: {
            MONTHS: MONTHS,
            presets: [
                { code: 'MONTHLY', value: 'Monthly', repaymentEvery: 1, repaymentFrequencyType: MONTHS },
                { code: 'QUARTERLY', value: 'Quarterly', repaymentEvery: 3, repaymentFrequencyType: MONTHS },
                { code: 'SEMI_ANNUAL', value: 'Semi-Annual', repaymentEvery: 6, repaymentFrequencyType: MONTHS },
                { code: 'CUSTOM', value: 'Custom', repaymentEvery: null, repaymentFrequencyType: null }
            ],
            tooltipKey: function (code) {
                if (code === 'QUARTERLY') {
                    return 'label.tooltip.repaymentfrequency.quarterly';
                }
                if (code === 'SEMI_ANNUAL') {
                    return 'label.tooltip.repaymentfrequency.semiannual';
                }
                if (code === 'MONTHLY') {
                    return 'label.tooltip.repaymentfrequency.monthly';
                }
                return 'label.tooltip.repaymentfrequency.custom';
            },
            codeFrom: function (every, typeId) {
                every = parseInt(every, 10);
                typeId = parseInt(typeId, 10);
                if (typeId === MONTHS && every === 1) {
                    return 'MONTHLY';
                }
                if (typeId === MONTHS && every === 3) {
                    return 'QUARTERLY';
                }
                if (typeId === MONTHS && every === 6) {
                    return 'SEMI_ANNUAL';
                }
                return 'CUSTOM';
            },
            apply: function (formData, code) {
                var preset = _.find(this.presets, function (item) {
                    return item.code === code;
                });
                if (!preset || preset.code === 'CUSTOM') {
                    return;
                }
                formData.repaymentEvery = preset.repaymentEvery;
                formData.repaymentFrequencyType = preset.repaymentFrequencyType;
            },
            label: function (every, typeId, typeValue) {
                var code = this.codeFrom(every, typeId);
                if (code !== 'CUSTOM') {
                    return _.find(this.presets, function (item) {
                        return item.code === code;
                    }).value;
                }
                if (every && typeValue) {
                    return every + ' ' + typeValue;
                }
                return typeValue || '';
            },
            syncInstallmentsFromTerm: function (formData) {
                var term = parseInt(formData.loanTermFrequency, 10);
                var termType = parseInt(formData.loanTermFrequencyType, 10);
                var every = parseInt(formData.repaymentEvery, 10);
                var freqType = parseInt(formData.repaymentFrequencyType, 10);
                if (termType === MONTHS && freqType === MONTHS && term > 0 && every > 0 && (term % every) === 0) {
                    formData.numberOfRepayments = term / every;
                }
            },
            validate: function (formData, hasLoanTerm) {
                var every = parseInt(formData.repaymentEvery, 10);
                var freqType = parseInt(formData.repaymentFrequencyType, 10);
                var numberOfRepayments = parseInt(formData.numberOfRepayments, 10);
                if (!isNaN(numberOfRepayments) && numberOfRepayments < 1) {
                    return 'Number of installments must be at least 1.';
                }
                if (freqType !== MONTHS || isNaN(every)) {
                    return null;
                }
                var termMonths;
                if (hasLoanTerm) {
                    var termType = parseInt(formData.loanTermFrequencyType, 10);
                    var term = parseInt(formData.loanTermFrequency, 10);
                    if (termType === 3) {
                        termMonths = term * 12;
                    } else if (termType === MONTHS) {
                        termMonths = term;
                    } else {
                        return null;
                    }
                } else {
                    termMonths = numberOfRepayments * every;
                }
                if (every === 3 && termMonths < 3) {
                    return 'For quarterly repayments, loan term must be at least 3 months.';
                }
                if (every === 6 && termMonths < 6) {
                    return 'For semi-annual repayments, loan term must be at least 6 months.';
                }
                return null;
            },
            bindTo: function (scope) {
                var self = this;
                scope.repaymentFrequencyPresets = this.presets;
                scope.repaymentFrequencyPreset = this.codeFrom(scope.formData.repaymentEvery, scope.formData.repaymentFrequencyType);
                scope.repaymentFrequencyTooltipKey = this.tooltipKey(scope.repaymentFrequencyPreset);
                scope.onRepaymentFrequencyPresetChange = function () {
                    self.apply(scope.formData, scope.repaymentFrequencyPreset);
                    scope.repaymentFrequencyTooltipKey = self.tooltipKey(scope.repaymentFrequencyPreset);
                    if (scope.formData.loanTermFrequency) {
                        self.syncInstallmentsFromTerm(scope.formData);
                    }
                    scope.repaymentFrequencyError = self.validate(scope.formData, !!scope.formData.loanTermFrequency);
                };
                scope.onLoanTermOrFrequencyChange = function () {
                    self.syncInstallmentsFromTerm(scope.formData);
                    scope.repaymentFrequencyError = self.validate(scope.formData, !!scope.formData.loanTermFrequency);
                };
                scope.assertRepaymentFrequencyValid = function (hasLoanTerm) {
                    scope.repaymentFrequencyError = self.validate(scope.formData, hasLoanTerm);
                    return !scope.repaymentFrequencyError;
                };
            }
        }
    });
}(mifosX.models || {}));
