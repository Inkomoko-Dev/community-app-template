(function (module) {
    mifosX.controllers = _.extend(module, {
        ExcessRefundDetailController: function (scope, resourceFactory, routeParams, location, dateFilter) {
            scope.refundId = routeParams.refundId;
            scope.refund = {};
            scope.paymentForm = {
                paymentReference: '',
                paidOn: dateFilter(new Date(), 'dd MMMM yyyy'),
                dateFormat: 'dd MMMM yyyy',
                locale: 'en'
            };

            scope.load = function () {
                resourceFactory.excessRefundResource.get({ refundId: scope.refundId }, function (data) {
                    scope.refund = data;
                });
            };

            scope.runCommand = function (command, payload) {
                resourceFactory.excessRefundResource.command({ refundId: scope.refundId, command: command }, payload || {}, function () {
                    scope.load();
                });
            };

            scope.approve = function () { scope.runCommand('approve', {}); };
            scope.reject = function () { scope.runCommand('reject', { note: scope.rejectionNote }); };
            scope.cancel = function () { scope.runCommand('cancel', {}); };
            scope.recordPayment = function () { scope.runCommand('recordPayment', scope.paymentForm); };
            scope.sendToHub = function () { scope.runCommand('sendToPaymentHub', {}); };
            scope.post = function () { scope.runCommand('post', { locale: 'en', dateFormat: 'dd MMMM yyyy' }); };

            scope.load();
        }
    });
    mifosX.ng.application.controller('ExcessRefundDetailController', ['$scope', 'ResourceFactory', '$routeParams', '$location', 'dateFilter', mifosX.controllers.ExcessRefundDetailController]).run(function ($log) {
        $log.info('ExcessRefundDetailController initialized');
    });
}(mifosX.controllers || {}));
