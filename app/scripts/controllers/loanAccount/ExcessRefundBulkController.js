(function (module) {
    mifosX.controllers = _.extend(module, {
        ExcessRefundBulkController: function (scope, resourceFactory, location, routeParams) {
            scope.batchId = routeParams.batchId || null;
            scope.formData = {
                officeId: null,
                note: '',
                locale: 'en',
                dateFormat: 'dd MMMM yyyy',
                items: []
            };
            scope.newItem = {
                accountNo: '',
                loanId: null,
                amount: null,
                paymentTypeId: null,
                paymentMode: 'MANUAL',
                beneficiary: {
                    channel: 'MOBILE_MONEY',
                    msisdn: '',
                    beneficiaryName: ''
                }
            };
            scope.batchResult = null;
            scope.pendingLines = [];
            scope.selectAll = false;
            scope.resolving = false;
            scope.resolveError = '';

            scope.addItem = function () {
                scope.resolveError = '';
                if (!scope.newItem.accountNo) {
                    scope.resolveError = 'Loan account number is required.';
                    return;
                }
                scope.resolving = true;
                resourceFactory.excessRefundTemplateByAccountResource.get({ accountNo: scope.newItem.accountNo }, function (data) {
                    var line = angular.copy(scope.newItem);
                    line.loanId = data.loanId;
                    line.accountNo = data.accountNo;
                    if (!line.amount && data.totalOverpaid) {
                        line.amount = data.totalOverpaid;
                    }
                    if (!line.beneficiary.beneficiaryName && data.clientDisplayName) {
                        line.beneficiary.beneficiaryName = data.clientDisplayName;
                    }
                    if (!line.beneficiary.msisdn && data.clientPhoneNumber) {
                        line.beneficiary.msisdn = data.clientPhoneNumber;
                    }
                    scope.formData.items.push(line);
                    scope.newItem.accountNo = '';
                    scope.newItem.amount = null;
                    scope.resolving = false;
                }, function () {
                    scope.resolveError = 'Could not resolve loan account number.';
                    scope.resolving = false;
                });
            };

            scope.submit = function () {
                resourceFactory.excessRefundBatchResource.save(scope.formData, function (data) {
                    scope.batchResult = data;
                    if (data.resourceId) {
                        location.path('/excessrefunds/bulk/' + data.resourceId);
                    } else if (!data.lineErrors || data.lineErrors.length === 0) {
                        location.path('/excessrefunds');
                    }
                });
            };

            scope.loadPendingLines = function () {
                if (!scope.batchId) {
                    return;
                }
                resourceFactory.excessRefundResource.getAll({ batchId: scope.batchId }, function (data) {
                    scope.pendingLines = (data || []).filter(function (row) {
                        return row.status === 100;
                    }).map(function (row) {
                        row.selected = false;
                        return row;
                    });
                });
            };

            scope.toggleSelectAll = function () {
                angular.forEach(scope.pendingLines, function (line) {
                    line.selected = scope.selectAll;
                });
            };

            scope.selectedIds = function () {
                return scope.pendingLines.filter(function (line) {
                    return line.selected;
                }).map(function (line) {
                    return line.id;
                });
            };

            scope.approveSelected = function () {
                var ids = scope.selectedIds();
                if (!ids.length) {
                    return;
                }
                resourceFactory.excessRefundBatchResource.command({
                    batchId: scope.batchId,
                    command: 'approve'
                }, { refundIds: ids, locale: 'en' }, function () {
                    scope.loadPendingLines();
                });
            };

            scope.rejectSelected = function () {
                var ids = scope.selectedIds();
                if (!ids.length) {
                    return;
                }
                resourceFactory.excessRefundBatchResource.command({
                    batchId: scope.batchId,
                    command: 'reject'
                }, { refundIds: ids, locale: 'en', note: scope.formData.note || 'Bulk reject' }, function () {
                    scope.loadPendingLines();
                });
            };

            scope.loadPendingLines();
        }
    });
    mifosX.ng.application.controller('ExcessRefundBulkController', ['$scope', 'ResourceFactory', '$location', '$routeParams', mifosX.controllers.ExcessRefundBulkController]).run(function ($log) {
        $log.info('ExcessRefundBulkController initialized');
    });
}(mifosX.controllers || {}));
