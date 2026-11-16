(function (module) {
    var MONTHS = 2;
    var NAMED = [
        { code: 'MONTHLY', value: 'Monthly', repaymentEvery: 1, repaymentFrequencyType: MONTHS },
        { code: 'QUARTERLY', value: 'Quarterly', repaymentEvery: 3, repaymentFrequencyType: MONTHS },
        { code: 'SEMI_ANNUAL', value: 'Semi-Annual', repaymentEvery: 6, repaymentFrequencyType: MONTHS }
    ];
    var CUSTOM = { code: 'CUSTOM', value: 'Custom', repaymentEvery: null, repaymentFrequencyType: null };
    var TYPE_NAMES = { Days: 0, Weeks: 1, Months: 2, Years: 3 };

    mifosX.models = _.extend(module, {
        RepaymentFrequency: {
            MONTHS: MONTHS,
            namedPresets: NAMED,
            presets: NAMED.concat([CUSTOM]),
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
                if (code === 'CUSTOM') {
                    return 'label.tooltip.repaymentfrequency.custom';
                }
                return 'label.tooltip.repaymentfrequency.monthly';
            },
            resolveTypeId: function (frequencyType) {
                if (frequencyType === undefined || frequencyType === null) {
                    return NaN;
                }
                if (typeof frequencyType === 'object') {
                    return parseInt(frequencyType.id, 10);
                }
                if (typeof frequencyType === 'string' && TYPE_NAMES[frequencyType] !== undefined) {
                    return TYPE_NAMES[frequencyType];
                }
                return parseInt(frequencyType, 10);
            },
            presetsFor: function (formData) {
                var every = formData && formData.repaymentEvery;
                if (every === undefined || every === null || every === '') {
                    return this.namedPresets;
                }
                var code = this.codeFrom(every, formData && formData.repaymentFrequencyType);
                if (code === 'CUSTOM') {
                    return this.presets;
                }
                return this.namedPresets;
            },
            codeFrom: function (every, typeId) {
                every = parseInt(every, 10);
                typeId = this.resolveTypeId(typeId);
                if (isNaN(every) && isNaN(typeId)) {
                    return '';
                }
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
            preserveImpliedTerm: function (formData, previousEvery, previousType) {
                var oldEvery = parseInt(previousEvery, 10);
                var oldType = this.resolveTypeId(previousType);
                var newEvery = parseInt(formData.repaymentEvery, 10);
                var newType = this.resolveTypeId(formData.repaymentFrequencyType);
                var installments = parseInt(formData.numberOfRepayments, 10);
                if (oldType !== MONTHS || newType !== MONTHS || !(oldEvery > 0) || !(newEvery > 0) || !(installments > 0)) {
                    return;
                }
                var impliedTerm = installments * oldEvery;
                if (impliedTerm % newEvery === 0) {
                    formData.numberOfRepayments = impliedTerm / newEvery;
                }
            },
            label: function (every, typeId, typeValue) {
                var resolvedType = this.resolveTypeId(typeId);
                if (isNaN(resolvedType) && typeValue) {
                    resolvedType = this.resolveTypeId(typeValue);
                }
                var code = this.codeFrom(every, resolvedType);
                if (code !== 'CUSTOM') {
                    return _.find(this.presets, function (item) {
                        return item.code === code;
                    }).value;
                }
                var unit = typeValue;
                if (!unit && typeof typeId === 'object' && typeId && typeId.value) {
                    unit = typeId.value;
                }
                if (every && unit) {
                    return every + ' ' + unit;
                }
                return unit || '';
            },
            syncInstallmentsFromTerm: function (formData) {
                var term = parseInt(formData.loanTermFrequency, 10);
                var termType = this.resolveTypeId(formData.loanTermFrequencyType);
                var every = parseInt(formData.repaymentEvery, 10);
                var freqType = this.resolveTypeId(formData.repaymentFrequencyType);
                if (termType === MONTHS && freqType === MONTHS && term > 0 && every > 0 && (term % every) === 0) {
                    formData.numberOfRepayments = term / every;
                }
            },
            syncTermFromInstallments: function (formData) {
                var installments = parseInt(formData.numberOfRepayments, 10);
                var every = parseInt(formData.repaymentEvery, 10);
                var freqType = this.resolveTypeId(formData.repaymentFrequencyType);
                var termType = this.resolveTypeId(formData.loanTermFrequencyType);
                if (freqType === MONTHS && termType === MONTHS && installments > 0 && every > 0) {
                    formData.loanTermFrequency = installments * every;
                }
            },
            productBounds: function (product) {
                var min = product ? parseInt(product.minNumberOfRepayments, 10) : NaN;
                var max = product ? parseInt(product.maxNumberOfRepayments, 10) : NaN;
                return {
                    min: isNaN(min) ? null : min,
                    max: isNaN(max) ? null : max
                };
            },
            isFixedNumberOfRepayments: function (product) {
                var bounds = this.productBounds(product);
                return bounds.min !== null && bounds.max !== null && bounds.min === bounds.max;
            },
            validateProductBounds: function (numberOfRepayments, product) {
                if (isNaN(numberOfRepayments)) {
                    return null;
                }
                var bounds = this.productBounds(product);
                if (bounds.min !== null && bounds.max !== null) {
                    if (numberOfRepayments < bounds.min || numberOfRepayments > bounds.max) {
                        return 'Number of repayments must be between ' + bounds.min + ' and ' + bounds.max + '.';
                    }
                    return null;
                }
                if (bounds.min !== null && numberOfRepayments < bounds.min) {
                    return 'Number of repayments must be at least ' + bounds.min + '.';
                }
                if (bounds.max !== null && numberOfRepayments > bounds.max) {
                    return 'Number of repayments must be at most ' + bounds.max + '.';
                }
                return null;
            },
            validate: function (formData, hasLoanTerm, product) {
                var every = parseInt(formData.repaymentEvery, 10);
                var freqType = this.resolveTypeId(formData.repaymentFrequencyType);
                var numberOfRepayments = parseInt(formData.numberOfRepayments, 10);
                if (!isNaN(numberOfRepayments) && numberOfRepayments < 1) {
                    return 'Number of installments must be at least 1.';
                }
                if (freqType !== MONTHS || isNaN(every)) {
                    return null;
                }
                var termMonths;
                if (hasLoanTerm) {
                    var termType = this.resolveTypeId(formData.loanTermFrequencyType);
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
                if ((every === 3 || every === 6) && termMonths >= every && termMonths % every !== 0) {
                    return 'Loan term must be a multiple of the repayment interval. For '
                        + (every === 3 ? 'quarterly' : 'semi-annual')
                        + ' repayments, loan term must be a multiple of ' + every + ' months.';
                }
                return this.validateProductBounds(numberOfRepayments, product);
            },
            bindTo: function (scope, formData) {
                var self = this;
                var data = formData || scope.formData;
                var productFromScope = function () {
                    return (scope.loanaccountinfo || {}).product;
                };
                scope.repaymentFrequencyPresets = this.presetsFor(data);
                scope.repaymentFrequencyPreset = this.codeFrom(data.repaymentEvery, data.repaymentFrequencyType);
                scope.repaymentFrequencyTooltipKey = this.tooltipKey(scope.repaymentFrequencyPreset);
                scope.isNumberOfRepaymentsFixed = function () {
                    return self.isFixedNumberOfRepayments(productFromScope());
                };
                scope.onRepaymentFrequencyPresetChange = function () {
                    if (!scope.repaymentFrequencyPreset) {
                        data.repaymentEvery = null;
                        data.repaymentFrequencyType = null;
                        scope.repaymentFrequencyError = null;
                        return;
                    }
                    var previousEvery = data.repaymentEvery;
                    var previousType = data.repaymentFrequencyType;
                    self.apply(data, scope.repaymentFrequencyPreset);
                    self.preserveImpliedTerm(data, previousEvery, previousType);
                    scope.repaymentFrequencyTooltipKey = self.tooltipKey(scope.repaymentFrequencyPreset);
                    if (data.loanTermFrequency) {
                        var term = parseInt(data.loanTermFrequency, 10);
                        var every = parseInt(data.repaymentEvery, 10);
                        var termType = self.resolveTypeId(data.loanTermFrequencyType);
                        var freqType = self.resolveTypeId(data.repaymentFrequencyType);
                        if (termType === MONTHS && freqType === MONTHS && term > 0 && every > 0 && (term % every) === 0) {
                            self.syncInstallmentsFromTerm(data);
                        } else {
                            self.syncTermFromInstallments(data);
                        }
                    }
                    scope.repaymentFrequencyError = self.validate(data, !!data.loanTermFrequency, productFromScope());
                };
                scope.onLoanTermOrFrequencyChange = function () {
                    self.syncInstallmentsFromTerm(data);
                    scope.repaymentFrequencyError = self.validate(data, !!data.loanTermFrequency, productFromScope());
                };
                scope.onNumberOfRepaymentsChange = function () {
                    self.syncTermFromInstallments(data);
                    scope.repaymentFrequencyError = self.validate(data, !!data.loanTermFrequency, productFromScope());
                };
                scope.assertRepaymentFrequencyValid = function (hasLoanTerm) {
                    scope.repaymentFrequencyError = self.validate(data, hasLoanTerm, productFromScope());
                    return !scope.repaymentFrequencyError;
                };
            }
        }
    });
}(mifosX.models || {}));
