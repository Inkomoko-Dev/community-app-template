(function (module) {
    mifosX.controllers = _.extend(module, {
        ExcessRefundBulkController: function (scope, resourceFactory, location) {
            scope.formData = {
                officeId: null,
                note: '',
                locale: 'en',
                dateFormat: 'dd MMMM yyyy',
                items: []
            };
            scope.newItem = {
                loanId: null,
                amount: null,
                paymentMode: 'MANUAL',
                beneficiary: {
                    channel: 'MOBILE_MONEY',
                    msisdn: '',
                    beneficiaryName: ''
                }
            };

            scope.addItem = function () {
                scope.formData.items.push(angular.copy(scope.newItem));
            };

            scope.submit = function () {
                resourceFactory.excessRefundBatchResource.save(scope.formData, function (data) {
                    location.path('/excessrefunds');
                });
            };
        }
    });
    mifosX.ng.application.controller('ExcessRefundBulkController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.ExcessRefundBulkController]).run(function ($log) {
        $log.info('ExcessRefundBulkController initialized');
    });
}(mifosX.controllers || {}));
