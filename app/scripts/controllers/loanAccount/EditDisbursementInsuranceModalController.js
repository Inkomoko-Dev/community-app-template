(function (module) {
    function normalizeDate(value) {
        if (!value) {
            return null;
        }

        if (angular.isDate(value)) {
            return value;
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
        EditDisbursementInsuranceModalController: function (scope, $uibModalInstance, resourceFactory, dateFilter, loanId, transaction, insuranceCharges, loanPrincipal, dateFormat, locale) {
            scope.transaction = transaction;
            scope.insuranceCharges = insuranceCharges;
            scope.maxInsuranceAmount = loanPrincipal ? Number(loanPrincipal) : null;
            scope.dateFormat = dateFormat;
            scope.datePicker = { opened: false };
            scope.dateOptions = { formatYear: 'yy', startingDay: 1 };
            scope.isSubmitting = false;
            scope.formData = {
                loanChargeId: insuranceCharges.length === 1 ? insuranceCharges[0].id : null,
                amount: insuranceCharges.length === 1 ? insuranceCharges[0].amount : null,
                transactionDate: normalizeDate(transaction.date) || new Date(),
                note: ''
            };

            scope.openDatePicker = function ($event) {
                if ($event) {
                    $event.preventDefault();
                    $event.stopPropagation();
                }
                scope.datePicker.opened = true;
            };

            scope.onChargeChanged = function () {
                for (var i = 0; i < scope.insuranceCharges.length; i++) {
                    if (Number(scope.insuranceCharges[i].id) === Number(scope.formData.loanChargeId)) {
                        scope.formData.amount = scope.insuranceCharges[i].amount;
                        return;
                    }
                }
                scope.formData.amount = null;
            };

            scope.submit = function () {
                if (scope.isSubmitting) {
                    return;
                }
                if (scope.maxInsuranceAmount !== null && Number(scope.formData.amount) > scope.maxInsuranceAmount) {
                    scope.editDisbursementInsuranceForm.amount.$setValidity('max', false);
                    return;
                }
                scope.isSubmitting = true;

                var payload = {
                    loanChargeId: scope.formData.loanChargeId,
                    amount: scope.formData.amount,
                    transactionDate: dateFilter(scope.formData.transactionDate, dateFormat),
                    dateFormat: dateFormat,
                    locale: locale,
                    note: scope.formData.note
                };

                resourceFactory.loanTrxnsResource.editDisbursementInsurance({
                    loanId: loanId,
                    transactionId: transaction.id
                }, payload, function (data) {
                    scope.isSubmitting = false;
                    $uibModalInstance.close(data);
                }, function () {
                    scope.isSubmitting = false;
                });
            };

            scope.cancel = function () {
                $uibModalInstance.dismiss('cancel');
            };
        }
    });
    mifosX.ng.application.controller('EditDisbursementInsuranceModalController', ['$scope', '$uibModalInstance', 'ResourceFactory', 'dateFilter', 'loanId', 'transaction', 'insuranceCharges', 'loanPrincipal', 'dateFormat', 'locale', mifosX.controllers.EditDisbursementInsuranceModalController]).run(function ($log) {
        $log.info('EditDisbursementInsuranceModalController initialized');
    });
}(mifosX.controllers || {}));
