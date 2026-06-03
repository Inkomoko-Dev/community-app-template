(function (module) {
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

            scope.formData = {
                amount: null,
                transactionDate: new Date(),
                paymentTypeId: null,
                notes: ''
            };

            // Load charge details to show current values
            resourceFactory.loanChargesResource.get(
                { loanId: scope.loanId, chargeId: scope.chargeId },
                function (data) {
                    scope.charge = data;
                    scope.formData.amount = data.amount;
                }
            );

            // Load income gls
            resourceFactory.glAccountsResource.getAll({ type: 4, usage: 1, disabled: false }, function (data) {
                scope.incomeGlAccounts = data;
                scope.$applyAsync(function () {
                    angular.element('#glAccountId').trigger('chosen:updated');
                });
            });

            resourceFactory.paymentTypeResource.getAll(function (data) {
                scope.paymentTypes = data || [];
                scope.$applyAsync(function () {
                    angular.element('#paymentTypeId').trigger('chosen:updated');
                });
            });

            scope.openDatePicker = function () {
                scope.datePicker.opened = true;
            };

            scope.submit = function () {
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
                    function (data) {
                        scope.isSubmitting = false;
                        location.path('/viewloanaccount/' + scope.loanId);
                    },
                    function (error) {
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
        $log.info("AdjustLoanInsuranceChargeController initialized");
    });

}(mifosX.controllers || {}));
