/* global mifosX, _ */
(function (module) {
    'use strict';
    function normalizeDate(value) {
        if (!value) {
            return null;
        }
        if (angular.isDate(value)) {
            return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        }
        if (angular.isArray(value) && value.length >= 3) {
            return new Date(value[0], value[1] - 1, value[2]);
        }
        if (typeof value === 'string') {
            var dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (dateParts) {
                return new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]));
            }
        }
        var parsedDate = new Date(value);
        if (isNaN(parsedDate.getTime())) {
            return null;
        }
        return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    }

    mifosX.controllers = _.extend(module, {
        AdjustLoanInsuranceChargeController: function (scope, routeParams, resourceFactory, location, dateFilter) {

            scope.loanId = routeParams.loanId;
            scope.chargeId = routeParams.chargeId;
            scope.isSubmitting = false;
            scope.dateFormat = 'dd MMMM yyyy';
            scope.datePicker = { opened: false };
            scope.dateOptions = { formatYear: 'yy', startingDay: 1 };
            scope.today = dateFilter(new Date(), 'dd MMMM yyyy');
            scope.paymentTypes = [];
            scope.incomeGlAccounts = [];
            scope.paymentTypesLoading = true;
            scope.incomeGlAccountsLoading = true;
            scope.paymentTypesLoadFailed = false;
            scope.incomeGlAccountsLoadFailed = false;
            scope.noAdjustmentSubmitted = false;
            scope.originalTransactionDate = null;
            scope.maxInsuranceAmount = null;

            scope.formData = {
                amount: null,
                transactionDate: new Date(),
                paymentTypeId: null,
                notes: ''
            };

            function updateChosen(elementId) {
                scope.$applyAsync(function () {
                    angular.element(elementId).trigger('chosen:updated');
                });
            }

            function mappedPaymentTypes(product) {
                var paymentTypes = [];
                var seenPaymentTypes = {};
                _.each(product.paymentChannelToFundSourceMappings || [], function (mapping) {
                    if (!mapping.paymentType || !mapping.paymentType.id || seenPaymentTypes[mapping.paymentType.id]) {
                        return;
                    }
                    var paymentTypeName = mapping.paymentType.name || mapping.paymentType.value;
                    var fundSourceAccountName = mapping.fundSourceAccount && mapping.fundSourceAccount.name;
                    paymentTypes.push({
                        id: mapping.paymentType.id,
                        name: paymentTypeName,
                        displayName: fundSourceAccountName ? paymentTypeName + ' - ' + fundSourceAccountName : paymentTypeName
                    });
                    seenPaymentTypes[mapping.paymentType.id] = true;
                });
                return paymentTypes;
            }

            function mappedIncomeGlAccounts(product, charge) {
                var chargeDefinitionId = charge && charge.chargeId;
                var glAccounts = [];
                var seenGlAccounts = {};
                function addIncomeAccount(incomeAccount) {
                    if (!incomeAccount || !incomeAccount.id || seenGlAccounts[incomeAccount.id]) {
                        return;
                    }
                    if (!incomeAccount.nameDecorated) {
                        incomeAccount.nameDecorated = incomeAccount.glCode ? incomeAccount.glCode + ' - ' + incomeAccount.name
                            : incomeAccount.name;
                    }
                    glAccounts.push(incomeAccount);
                    seenGlAccounts[incomeAccount.id] = true;
                }
                _.each(product.feeToIncomeAccountMappings || [], function (mapping) {
                    if (chargeDefinitionId && (!mapping.charge || Number(mapping.charge.id) !== Number(chargeDefinitionId))) {
                        return;
                    }
                    addIncomeAccount(mapping.incomeAccount);
                });
                if (glAccounts.length === 0 && product.accountingMappings) {
                    addIncomeAccount(product.accountingMappings.incomeFromFeeAccount);
                }
                return glAccounts;
            }

            function loadProductMappings() {
                resourceFactory.loanResource.get({ loanId: scope.loanId }, function (loan) {
                    scope.maxInsuranceAmount = loan.approvedPrincipal || loan.principal || null;
                    resourceFactory.loanProductResource.get({ loanProductId: loan.loanProductId, template: 'true' }, function (product) {
                        scope.paymentTypes = mappedPaymentTypes(product);
                        scope.incomeGlAccounts = mappedIncomeGlAccounts(product, scope.charge);
                        scope.paymentTypesLoading = false;
                        scope.incomeGlAccountsLoading = false;
                        updateChosen('#paymentTypeId');
                        updateChosen('#glAccountId');
                    }, function () {
                        scope.paymentTypesLoading = false;
                        scope.incomeGlAccountsLoading = false;
                        scope.paymentTypesLoadFailed = true;
                        scope.incomeGlAccountsLoadFailed = true;
                        updateChosen('#paymentTypeId');
                        updateChosen('#glAccountId');
                    });
                }, function () {
                    scope.paymentTypesLoading = false;
                    scope.incomeGlAccountsLoading = false;
                    scope.paymentTypesLoadFailed = true;
                    scope.incomeGlAccountsLoadFailed = true;
                    updateChosen('#paymentTypeId');
                    updateChosen('#glAccountId');
                });
            }

            // Load charge details to show current values
            resourceFactory.loanChargesResource.get(
                { loanId: scope.loanId, chargeId: scope.chargeId },
                function (data) {
                    scope.charge = data;
                    scope.formData.amount = data.amount;
                    scope.originalTransactionDate = normalizeDate(data.dueDate);
                    if (scope.originalTransactionDate) {
                        scope.formData.transactionDate = scope.originalTransactionDate;
                    }
                    loadProductMappings();
                },
                function () {
                    scope.paymentTypesLoading = false;
                    scope.incomeGlAccountsLoading = false;
                    scope.paymentTypesLoadFailed = true;
                    scope.incomeGlAccountsLoadFailed = true;
                    updateChosen('#paymentTypeId');
                    updateChosen('#glAccountId');
                }
            );

            scope.openDatePicker = function () {
                scope.datePicker.opened = true;
            };

            function normalizedAmount(amount) {
                var parsedAmount = parseFloat(amount);
                return isNaN(parsedAmount) ? null : Number(parsedAmount.toFixed(6));
            }

            function normalizedDateTime(date) {
                var normalizedDate = normalizeDate(date);
                return normalizedDate ? normalizedDate.getTime() : null;
            }

            scope.isNoEffectiveAdjustment = function () {
                if (!scope.charge) {
                    return false;
                }
                var sameDate = normalizedDateTime(scope.formData.transactionDate) === normalizedDateTime(scope.originalTransactionDate);
                return normalizedAmount(scope.formData.amount) === normalizedAmount(scope.charge.amount) &&
                    sameDate && !scope.formData.glAccountId && !scope.formData.paymentTypeId;
            };

            scope.submit = function () {
                scope.noAdjustmentSubmitted = false;
                if (scope.isNoEffectiveAdjustment()) {
                    scope.noAdjustmentSubmitted = true;
                    return;
                }
                if (scope.maxInsuranceAmount !== null && Number(scope.formData.amount) > Number(scope.maxInsuranceAmount)) {
                    scope.adjustInsuranceChargeForm.amount.$setValidity('max', false);
                    return;
                }
                scope.isSubmitting = true;

                var payload = {
                    amount: scope.formData.amount,
                    transactionDate: dateFilter(scope.formData.transactionDate, 'dd MMMM yyyy'),
                    dateFormat: 'dd MMMM yyyy',
                    locale: scope.optlang.code,
                    notes: scope.formData.notes
                };

                // Only include glAccountId if selected
                if (scope.formData.glAccountId) {
                    payload.glAccountId = scope.formData.glAccountId;
                }
                if (scope.formData.paymentTypeId) {
                    payload.paymentTypeId = scope.formData.paymentTypeId;
                }

                resourceFactory.loanChargesResource.adjust(
                    { loanId: scope.loanId, chargeId: scope.chargeId },
                    payload,
                    function () {
                        scope.isSubmitting = false;
                        location.path('/viewloanaccount/' + scope.loanId);
                    },
                    function () {
                        scope.isSubmitting = false;
                    }
                );
            };

            scope.cancel = function () {
                location.path('/viewloanaccount/' + scope.loanId);
            };
        }
    });

    mifosX.ng.application.controller('AdjustLoanInsuranceChargeController', [
        '$scope',
        '$routeParams',
        'ResourceFactory',
        '$location',
        'dateFilter',
        mifosX.controllers.AdjustLoanInsuranceChargeController
    ]).run(function ($log) {
        $log.info('AdjustLoanInsuranceChargeController initialized');
    });

}(mifosX.controllers || {}));
