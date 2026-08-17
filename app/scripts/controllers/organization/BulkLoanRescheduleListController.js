(function (module) {
    mifosX.controllers = _.extend(module, {
        BulkLoanRescheduleListController: function (scope, resourceFactory, location, dateFilter, $translate) {
            var defaultLimit = 15;

            scope.permissions = {};
            scope.canCreate = true;
            scope.state = { loading: false, loadingPermissions: false };
            scope.errorStatus = '';
            scope.errorDetails = [];
            scope.filters = { search: '', status: '', officeId: null, assignedToMe: false, startDate: null, endDate: null, limit: defaultLimit, offset: 0 };
            scope.requests = [];
            scope.total = 0;
            scope.hasMore = false;
            scope.officeOptions = [];
            scope.statusOptions = ['PREVIEW', 'PENDING_APPROVAL', 'APPROVED', 'EXECUTING', 'COMPLETED', 'PARTIAL_SUCCESS', 'REJECTED', 'ROLLING_BACK', 'ROLLED_BACK', 'FAILED'];
            scope.statusLabel = function (status) {
                return $translate.instant('label.bulkreschedule.status.' + String(status || '').toLowerCase());
            };

            var setApiError = function (response) {
                scope.errorStatus = response && response.data &&
                    (response.data.defaultUserMessage || response.data.message) ||
                    response.statusText || $translate.instant('label.bulkreschedule.error.generic');
                scope.errorDetails = response && response.data && response.data.errors ? response.data.errors : [];
            };

            var flattenOffices = function (offices) {
                var officeMap = {}, roots = [], flattened = [];
                angular.forEach(offices || [], function (office) {
                    officeMap[office.id] = angular.extend({}, office, { children: [] });
                });
                angular.forEach(offices || [], function (office) {
                    var node = officeMap[office.id];
                    var parentId = office.parentOfficeId !== undefined ? office.parentOfficeId : office.parentId;
                    if (parentId && officeMap[parentId]) {
                        officeMap[parentId].children.push(node);
                    } else {
                        roots.push(node);
                    }
                });
                var walk = function (node, path) {
                    var nextPath = path ? path + ' / ' + node.name : node.name;
                    node.displayName = nextPath;
                    flattened.push(node);
                    angular.forEach(node.children, function (child) { walk(child, nextPath); });
                };
                angular.forEach(roots, function (root) { walk(root, ''); });
                return flattened;
            };

            var normalizeRequest = function (item) {
                item = item || {};
                var filters = item.filters || item.criteria || {};
                var details = item.reschedulingDetails || item.details || {};
                return {
                    id: item.executionId || item.id || item.resourceId,
                    status: item.status || item.executionStatus || item.state || 'PREVIEW',
                    officeId: item.officeId || filters.officeId,
                    officeName: item.officeName || item.branchName || filters.officeName || '',
                    requestedBy: item.requestedBy || item.createdBy || item.createdByUsername ||
                        (item.user && (item.user.username || item.user.displayName)) || '',
                    requestedOn: item.requestedOn || item.createdAt || item.submittedOnDate,
                    totalLoansFound: item.totalLoansFound || item.totalFound ||
                        (item.summary && (item.summary.totalLoansFound || item.summary.found)) || 0,
                    currentInterestRate: filters.currentInterestRate || item.currentInterestRate,
                    newInterestRate: details.newInterestRate || item.newInterestRate,
                    loanStatus: filters.loanStatus || item.loanStatus,
                    loanProducts: filters.loanProductNames || item.loanProductNames || [],
                    raw: item
                };
            };

            scope.criteriaSummary = function (request) {
                var parts = [];
                if (request.currentInterestRate !== undefined && request.currentInterestRate !== null && request.currentInterestRate !== '') {
                    parts.push($translate.instant('label.bulkreschedule.rate') + ': ' + request.currentInterestRate + '% → ' +
                        (request.newInterestRate !== undefined ? request.newInterestRate + '%' : '—'));
                }
                if (request.loanStatus) { parts.push($translate.instant('label.bulkreschedule.status') + ': ' + request.loanStatus); }
                if (request.loanProducts && request.loanProducts.length) {
                    parts.push($translate.instant('label.bulkreschedule.products') + ': ' + request.loanProducts.join(', '));
                }
                return parts.join(' · ') || $translate.instant('label.bulkreschedule.request');
            };

            scope.statusClass = function (status) {
                switch (String(status || '').toUpperCase()) {
                    case 'APPROVED':
                    case 'EXECUTED':
                    case 'COMPLETED': return 'label-success';
                    case 'PENDING_APPROVAL': return 'label-warning';
                    case 'REJECTED':
                    case 'FAILED': return 'label-danger';
                    default: return 'label-info';
                }
            };

            var loadPermissions = function () {
                scope.state.loadingPermissions = true;
                resourceFactory.bulkLoanRescheduleTemplateResource.get({}, function (data) {
                    scope.permissions = data.userPermissions || {};
                    scope.canCreate = scope.permissions.canInitiateBulkReschedule === true;
                    scope.officeOptions = flattenOffices((data.filterOptions && data.filterOptions.offices) || []);
                    scope.state.loadingPermissions = false;
                }, function () {
                    scope.state.loadingPermissions = false;
                });
            };

            scope.loadRequests = function (resetOffset) {
                if (resetOffset) { scope.filters.offset = 0; }
                scope.errorStatus = '';
                scope.state.loading = true;
                var params = { limit: scope.filters.limit, offset: scope.filters.offset };
                if (scope.filters.status) { params.status = scope.filters.status; }
                if (scope.filters.assignedToMe) { params.assignedToMe = true; }
                if (scope.filters.officeId) { params.officeId = scope.filters.officeId; }
                if (scope.filters.search) { params.search = scope.filters.search; }
                if (scope.filters.startDate && scope.filters.endDate) {
                    params.dateRange = [
                        dateFilter(scope.filters.startDate, 'yyyy-MM-dd'),
                        dateFilter(scope.filters.endDate, 'yyyy-MM-dd')
                    ].join(',');
                }
                resourceFactory.bulkLoanRescheduleResource.getAll(params, function (data) {
                    var rows = data && data.pageItems ? data.pageItems :
                        (data && data.items ? data.items : (angular.isArray(data) ? data : []));
                    scope.requests = rows.map(normalizeRequest);
                    scope.total = data && (data.totalCount !== undefined ? data.totalCount :
                        (data.totalFilteredRecords || data.totalRecords || data.total));
                    scope.total = scope.total !== undefined ? Number(scope.total) : scope.requests.length;
                    scope.hasMore = scope.requests.length === scope.filters.limit &&
                        (scope.filters.offset + scope.requests.length < scope.total || scope.total === scope.requests.length);
                    scope.state.loading = false;
                }, function (response) {
                    scope.state.loading = false;
                    setApiError(response);
                });
            };

            scope.resetFilters = function () {
                scope.filters.search = '';
                scope.filters.status = '';
                scope.filters.officeId = null;
                scope.filters.assignedToMe = false;
                scope.filters.startDate = null;
                scope.filters.endDate = null;
                scope.loadRequests(true);
            };
            scope.nextPage = function () {
                if (!scope.hasMore || scope.state.loading) { return; }
                scope.filters.offset += scope.filters.limit;
                scope.loadRequests(false);
            };
            scope.previousPage = function () {
                if (scope.filters.offset <= 0 || scope.state.loading) { return; }
                scope.filters.offset = Math.max(0, scope.filters.offset - scope.filters.limit);
                scope.loadRequests(false);
            };
            scope.pageStart = function () { return scope.total ? scope.filters.offset + 1 : 0; };
            scope.pageEnd = function () { return Math.min(scope.filters.offset + scope.requests.length, scope.total); };
            scope.createNew = function () { location.path('/bulkreschedule/create'); };
            scope.openRequest = function (request) {
                if (request && request.id) { location.path('/bulkreschedule/' + request.id); }
            };

            loadPermissions();
            scope.loadRequests(true);
        }
    });

    mifosX.ng.application.controller('BulkLoanRescheduleListController', [
        '$scope', 'ResourceFactory', '$location', 'dateFilter', '$translate',
        mifosX.controllers.BulkLoanRescheduleListController
    ]).run(function ($log) {
        $log.info('BulkLoanRescheduleListController initialized');
    });
}(mifosX.controllers || {}));
