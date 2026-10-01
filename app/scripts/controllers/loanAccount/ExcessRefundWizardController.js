(function (module) {
    mifosX.controllers = _.extend(module, {
        ExcessRefundWizardController: function (scope, resourceFactory, location, dateFilter) {
            scope.step = 1;
            scope.formData = {
                loanId: null,
                amount: null,
                paymentMode: 'MANUAL',
                paymentTypeId: null,
                locale: 'en',
                dateFormat: 'dd MMMM yyyy',
                beneficiary: {
                    channel: 'MOBILE_MONEY',
                    msisdn: '',
                    accountNumber: '',
                    bankCode: '',
                    bankName: '',
                    beneficiaryName: ''
                }
            };
            scope.template = null;

            scope.loadTemplate = function () {
                if (!scope.formData.loanId) {
                    return;
                }
                resourceFactory.excessRefundTemplateResource.get({ loanId: scope.formData.loanId }, function (data) {
                    scope.template = data;
                    scope.formData.amount = data.totalOverpaid;
                    scope.step = 2;
                });
            };

            scope.next = function () {
                if (scope.step < 6) {
                    scope.step = scope.step + 1;
                }
            };
            scope.back = function () {
                if (scope.step > 1) {
                    scope.step = scope.step - 1;
                }
            };

            scope.submit = function () {
                resourceFactory.excessRefundResource.save(scope.formData, function (data) {
                    location.path('/excessrefunds/' + data.resourceId);
                });
            };
        }
    });
    mifosX.ng.application.controller('ExcessRefundWizardController', ['$scope', 'ResourceFactory', '$location', 'dateFilter', mifosX.controllers.ExcessRefundWizardController]).run(function ($log) {
        $log.info('ExcessRefundWizardController initialized');
    });
}(mifosX.controllers || {}));
