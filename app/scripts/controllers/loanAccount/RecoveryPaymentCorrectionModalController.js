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

    function applyCorrectionMetadata(scope, metadata) {
        scope.correctionAllowed = !(metadata && metadata.correctionAllowed === false);
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

            applyCorrectionMetadata(scope, transaction);

            resourceFactory.loanTrxnsResource.get({
                loanId: loanId,
                transactionId: transaction.id,
                template: 'true'
            }, function (data) {
                scope.transaction = angular.extend(scope.transaction, data);
                applyCorrectionMetadata(scope, data);
            };

            scope.submit = function () {
                if (scope.correctionAllowed === false) {
                    return;
                }

                var payload = {
                    locale: scope.locale,
                    dateFormat: scope.df,
                    transactionDate: dateFilter(scope.formData.transactionDate, scope.df),
                    note: scope.formData.note
                };

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

            applyCorrectionMetadata(scope, transaction);

            resourceFactory.loanTrxnsTemplateResource.get({
                loanId: loanId,
                command: 'recoverypayment',
                originalTransactionId: transaction.id
            }, function (data) {
                scope.paymentTypes = data.paymentTypeOptions || [];
                scope.formData.originalTransactionId = data.originalTransactionId || scope.formData.originalTransactionId;
                applyCorrectionMetadata(scope, data);

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

            scope.submit = function () {
                if (scope.correctionAllowed === false) {
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
