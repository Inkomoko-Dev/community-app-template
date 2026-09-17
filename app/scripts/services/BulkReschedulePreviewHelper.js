(function (module) {
    mifosX.services = _.extend(module, {
        BulkReschedulePreviewHelper: function () {
            this.columns = [
                { key: 'loanAccountNumber', label: 'label.bulkreschedule.loanaccount' },
                { key: 'clientName', label: 'label.bulkreschedule.client' },
                { key: 'officeName', label: 'label.bulkreschedule.office' },
                { key: 'loanProductName', label: 'label.bulkreschedule.loanproduct' },
                { key: 'loanOfficerName', label: 'label.bulkreschedule.loanofficer' },
                { key: 'loanStatus', label: 'label.bulkreschedule.loanstatus' },
                { key: 'resultStatus', label: 'label.bulkreschedule.result' },
                { key: 'currentInterestRate', label: 'label.bulkreschedule.currentrate' },
                { key: 'newInterestRate', label: 'label.bulkreschedule.newrate' },
                { key: 'interestRateMethod', label: 'label.bulkreschedule.ratemethod' },
                { key: 'totalOutstanding', label: 'label.bulkreschedule.outstanding' },
                { key: 'newTotalOutstanding', label: 'label.bulkreschedule.newoutstanding' },
                { key: 'currentTerm', label: 'label.bulkreschedule.currentterm' },
                { key: 'newTerm', label: 'label.bulkreschedule.newterm' },
                { key: 'nextScheduledInstallment', label: 'label.bulkreschedule.nextinstallment' },
                { key: 'rescheduleReason', label: 'label.bulkreschedule.reason.short' },
                { key: 'resultReason', label: 'label.bulkreschedule.excludereason' }
            ];
            this.newQuery = function (pageSize, extra) {
                return angular.extend({
                    page: 1,
                    pageSize: pageSize,
                    total: 0,
                    hasMore: false,
                    sortBy: 'loanAccountNumber',
                    sortOrder: 'ASC'
                }, extra || {});
            };
            this.toggleSort = function (query, column) {
                if (query.sortBy === column) {
                    query.sortOrder = query.sortOrder === 'ASC' ? 'DESC' : 'ASC';
                } else {
                    query.sortBy = column;
                    query.sortOrder = 'ASC';
                }
            };
            this.sortIcon = function (query, column) {
                if (query.sortBy !== column) { return 'fa-sort text-muted'; }
                return query.sortOrder === 'ASC' ? 'fa-sort-asc' : 'fa-sort-desc';
            };
        }
    });
    mifosX.ng.services.service('BulkReschedulePreviewHelper', [mifosX.services.BulkReschedulePreviewHelper]).run(function ($log) {
        $log.info('BulkReschedulePreviewHelper initialized');
    });
}(mifosX.services || {}));
