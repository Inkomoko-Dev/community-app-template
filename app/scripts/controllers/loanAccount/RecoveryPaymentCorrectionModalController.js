(function (module) {
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

    function transactionDate(transaction) {
        return normalizeDate(transaction && (transaction.date || transaction.transactionDate));
    }

    function addDays(date, days) {
        if (!date) {
            return null;
        }

        var newDate = new Date(date.getTime());
        newDate.setDate(newDate.getDate() + days);
        return newDate;
    }

    function buildLatestClosureArgs(latestClosureDate, dateFilter, dateFormat) {
        if (!latestClosureDate) {
            return null;
        }

        return {
            params: [{
                value: dateFilter(latestClosureDate, dateFormat || 'dd MMMM yyyy')
            }]
        };
    }

    function buildOpenPeriodArgs(correctionDate, latestClosureDate, dateFilter, dateFormat) {
        return {
            params: [{
                value: correctionDate ? dateFilter(correctionDate, dateFormat || 'dd MMMM yyyy') : ''
            }, {
                value: latestClosureDate ? dateFilter(latestClosureDate, dateFormat || 'dd MMMM yyyy') : ''
            }]
        };
    }

    function resolveAutomaticCorrectionDate(scope) {
        if (!scope.correctionDateRequired) {
            delete scope.formData.correctionDate;
            return null;
        }

        var correctionDate = normalizeDate(scope.formData.correctionDate) || normalizeDate(scope.correctionDateMinDate);

        if (!correctionDate && scope.latestClosureDate) {
            correctionDate = addDays(scope.latestClosureDate, 1);
        }

        if (!correctionDate) {
            correctionDate = normalizeDate(new Date());
        }

        scope.formData.correctionDate = correctionDate;
        return correctionDate;
    }

    function applyCorrectionMetadata(scope, metadata, fallbackLatestClosureDate) {
        scope.correctionAllowed = !(metadata && metadata.correctionAllowed === false);
        scope.correctionDateRequired = !!(metadata && metadata.correctionDateRequired === true);
        scope.latestClosureDate = normalizeDate(metadata && metadata.latestClosedAccountingDate) || normalizeDate(fallbackLatestClosureDate);
        scope.correctionDateMinDate = normalizeDate(metadata && metadata.earliestCorrectionDate);
        if (!scope.correctionDateMinDate && scope.latestClosureDate) {
            scope.correctionDateMinDate = addDays(scope.latestClosureDate, 1);
        }
        scope.correctionDateMaxDate = normalizeDate(metadata && metadata.latestCorrectionDate) || new Date();
        resolveAutomaticCorrectionDate(scope);
    }

    function extractTransactionId(transactionRef) {
        if (!transactionRef) {
            return null;
        }

        if (angular.isObject(transactionRef)) {
            return transactionRef.id || transactionRef.transactionId || transactionRef.resourceId || null;
        }

        return transactionRef;
    }

    mifosX.controllers = _.extend(module, {
        ReverseRecoveryPaymentModalController: function (scope, $uibModalInstance, resourceFactory, dateFilter, loanId, transaction, latestClosureDate, dateFormat, locale) {
            scope.transaction = transaction;
            scope.formData = {
                transactionDate: transactionDate(transaction) || new Date(),
                note: ''
            };
            scope.df = dateFormat;
            scope.locale = locale;
            scope.restrictDate = new Date();
            scope.correctionAllowed = true;
            scope.latestClosureDate = normalizeDate(latestClosureDate);
            scope.correctionDateRequired = false;
            scope.correctionDateMinDate = null;
            scope.correctionDateMaxDate = new Date();
            scope.correctionDateErrorCode = null;
            scope.correctionDateErrorArgs = null;

            applyCorrectionMetadata(scope, transaction, latestClosureDate);

            scope.getLatestClosureArgs = function () {
                return buildLatestClosureArgs(scope.latestClosureDate, dateFilter, scope.df);
            };

            resourceFactory.loanTrxnsResource.get({
                loanId: loanId,
                transactionId: transaction.id,
                template: 'true'
            }, function (data) {
                scope.transaction = angular.extend(scope.transaction, data);
                applyCorrectionMetadata(scope, data, latestClosureDate);
            });

            scope.validateCorrectionDate = function () {
                scope.correctionDateErrorCode = null;
                scope.correctionDateErrorArgs = null;

                if (scope.correctionAllowed === false) {
                    scope.correctionDateErrorCode = 'error.msg.loan.transaction.closed.period.corrections.not.allowed';
                    return false;
                }

                if (!scope.correctionDateRequired) {
                    if (scope.formData.correctionDate) {
                        scope.correctionDateErrorCode = 'error.msg.loan.transaction.correction.date.not.allowed';
                        return false;
                    }
                    return true;
                }

                var correctionDate = resolveAutomaticCorrectionDate(scope);
                if (!correctionDate) {
                    scope.correctionDateErrorCode = 'error.msg.loan.transaction.correction.date.required';
                    return false;
                }

                if (scope.correctionDateMinDate && correctionDate.getTime() < scope.correctionDateMinDate.getTime()) {
                    scope.correctionDateErrorCode = 'error.msg.loan.transaction.correction.date.must.be.in.open.period';
                    scope.correctionDateErrorArgs = buildOpenPeriodArgs(correctionDate, scope.latestClosureDate, dateFilter, scope.df);
                    return false;
                }

                if (scope.correctionDateMaxDate && correctionDate.getTime() > scope.correctionDateMaxDate.getTime()) {
                    scope.correctionDateErrorCode = 'error.msg.loan.transaction.correction.date.cannot.be.future';
                    return false;
                }

                return true;
            };

            scope.submit = function () {
                if (!scope.validateCorrectionDate()) {
                    return;
                }

                var payload = {
                    locale: scope.locale,
                    dateFormat: scope.df,
                    transactionDate: dateFilter(scope.formData.transactionDate, scope.df),
                    note: scope.formData.note
                };

                if (scope.correctionDateRequired && scope.formData.correctionDate) {
                    payload.correctionDate = dateFilter(scope.formData.correctionDate, scope.df);
                }

                resourceFactory.loanTrxnsResource.save({
                    loanId: loanId,
                    transactionId: transaction.id,
                    command: 'reverseRecoveryPayment'
                }, payload, function (data) {
                    $uibModalInstance.close(data);
                });
            };

            scope.cancel = function () {
                $uibModalInstance.dismiss('cancel');
            };
        },
        PostCorrectedRecoveryPaymentModalController: function (scope, $uibModalInstance, resourceFactory, dateFilter, loanId, transaction, latestClosureDate, dateFormat, locale) {
            scope.transaction = transaction;
            scope.formData = {
                originalTransactionId: transaction.id,
                transactionDate: transactionDate(transaction) || new Date(),
                transactionAmount: transaction.amount,
                note: ''
            };
            scope.df = dateFormat;
            scope.locale = locale;
            scope.restrictDate = new Date();
            scope.paymentTypes = [];
            scope.correctionAllowed = true;
            scope.latestClosureDate = normalizeDate(latestClosureDate);
            scope.correctionDateRequired = false;
            scope.correctionDateMinDate = null;
            scope.correctionDateMaxDate = new Date();
            scope.correctionDateErrorCode = null;
            scope.correctionDateErrorArgs = null;

            if (transaction.paymentDetailData) {
                if (transaction.paymentDetailData.paymentType) {
                    scope.formData.paymentTypeId = transaction.paymentDetailData.paymentType.id;
                }
                scope.formData.accountNumber = transaction.paymentDetailData.accountNumber;
                scope.formData.checkNumber = transaction.paymentDetailData.checkNumber;
                scope.formData.routingCode = transaction.paymentDetailData.routingCode;
                scope.formData.receiptNumber = transaction.paymentDetailData.receiptNumber;
                scope.formData.bankNumber = transaction.paymentDetailData.bankNumber;
            }

            applyCorrectionMetadata(scope, transaction, latestClosureDate);

            scope.getLatestClosureArgs = function () {
                return buildLatestClosureArgs(scope.latestClosureDate, dateFilter, scope.df);
            };

            resourceFactory.loanTrxnsTemplateResource.get({
                loanId: loanId,
                command: 'recoverypayment',
                originalTransactionId: transaction.id
            }, function (data) {
                scope.paymentTypes = data.paymentTypeOptions || [];
                scope.formData.originalTransactionId = data.originalTransactionId || scope.formData.originalTransactionId;
                applyCorrectionMetadata(scope, data, latestClosureDate);

                if (!scope.formData.paymentTypeId && scope.paymentTypes.length > 0) {
                    scope.formData.paymentTypeId = scope.paymentTypes[0].id;
                }
            });

            if (!transaction.paymentDetailData) {
                resourceFactory.loanTrxnsResource.get({
                    loanId: loanId,
                    transactionId: transaction.id,
                    template: 'true'
                }, function (data) {
                    if (data.paymentDetailData) {
                        if (data.paymentDetailData.paymentType) {
                            scope.formData.paymentTypeId = scope.formData.paymentTypeId || data.paymentDetailData.paymentType.id;
                        }
                        scope.formData.accountNumber = scope.formData.accountNumber || data.paymentDetailData.accountNumber;
                        scope.formData.checkNumber = scope.formData.checkNumber || data.paymentDetailData.checkNumber;
                        scope.formData.routingCode = scope.formData.routingCode || data.paymentDetailData.routingCode;
                        scope.formData.receiptNumber = scope.formData.receiptNumber || data.paymentDetailData.receiptNumber;
                        scope.formData.bankNumber = scope.formData.bankNumber || data.paymentDetailData.bankNumber;
                    }
                });
            }

            scope.validateCorrectionDate = function () {
                scope.correctionDateErrorCode = null;
                scope.correctionDateErrorArgs = null;

                if (scope.correctionAllowed === false) {
                    scope.correctionDateErrorCode = 'error.msg.loan.transaction.closed.period.corrections.not.allowed';
                    return false;
                }

                if (!scope.correctionDateRequired) {
                    if (scope.formData.correctionDate) {
                        scope.correctionDateErrorCode = 'error.msg.loan.transaction.correction.date.not.allowed';
                        return false;
                    }
                    return true;
                }

                var correctionDate = resolveAutomaticCorrectionDate(scope);
                if (!correctionDate) {
                    scope.correctionDateErrorCode = 'error.msg.loan.transaction.correction.date.required';
                    return false;
                }

                if (scope.correctionDateMinDate && correctionDate.getTime() < scope.correctionDateMinDate.getTime()) {
                    scope.correctionDateErrorCode = 'error.msg.loan.transaction.correction.date.must.be.in.open.period';
                    scope.correctionDateErrorArgs = buildOpenPeriodArgs(correctionDate, scope.latestClosureDate, dateFilter, scope.df);
                    return false;
                }

                if (scope.correctionDateMaxDate && correctionDate.getTime() > scope.correctionDateMaxDate.getTime()) {
                    scope.correctionDateErrorCode = 'error.msg.loan.transaction.correction.date.cannot.be.future';
                    return false;
                }

                return true;
            };

            scope.submit = function () {
                if (!scope.validateCorrectionDate()) {
                    return;
                }

                var payload = {
                    locale: scope.locale,
                    dateFormat: scope.df,
                    transactionDate: dateFilter(scope.formData.transactionDate, scope.df),
                    transactionAmount: scope.formData.transactionAmount,
                    note: scope.formData.note,
                    originalTransactionId: scope.formData.originalTransactionId
                };

                if (scope.formData.paymentTypeId) {
                    payload.paymentTypeId = scope.formData.paymentTypeId;
                }

                if (scope.formData.accountNumber) {
                    payload.accountNumber = scope.formData.accountNumber;
                }
                if (scope.formData.checkNumber) {
                    payload.checkNumber = scope.formData.checkNumber;
                }
                if (scope.formData.routingCode) {
                    payload.routingCode = scope.formData.routingCode;
                }
                if (scope.formData.receiptNumber) {
                    payload.receiptNumber = scope.formData.receiptNumber;
                }
                if (scope.formData.bankNumber) {
                    payload.bankNumber = scope.formData.bankNumber;
                }
                if (scope.formData.originalTransactionId && scope.correctionDateRequired && scope.formData.correctionDate) {
                    payload.correctionDate = dateFilter(scope.formData.correctionDate, scope.df);
                }

                resourceFactory.loanTrxnsResource.save({
                    loanId: loanId,
                    command: 'recoverypayment'
                }, payload, function (data) {
                    $uibModalInstance.close(data);
                });
            };

            scope.cancel = function () {
                $uibModalInstance.dismiss('cancel');
            };

            scope.extractTransactionId = function (transactionRef) {
                return extractTransactionId(transactionRef);
            };
        }
    });

    mifosX.ng.application.controller('ReverseRecoveryPaymentModalController', ['$scope', '$uibModalInstance', 'ResourceFactory', 'dateFilter', 'loanId', 'transaction', 'latestClosureDate', 'dateFormat', 'locale', mifosX.controllers.ReverseRecoveryPaymentModalController]).run(function ($log) {
        $log.info("ReverseRecoveryPaymentModalController initialized");
    });

    mifosX.ng.application.controller('PostCorrectedRecoveryPaymentModalController', ['$scope', '$uibModalInstance', 'ResourceFactory', 'dateFilter', 'loanId', 'transaction', 'latestClosureDate', 'dateFormat', 'locale', mifosX.controllers.PostCorrectedRecoveryPaymentModalController]).run(function ($log) {
        $log.info("PostCorrectedRecoveryPaymentModalController initialized");
    });
}(mifosX.controllers || {}));
