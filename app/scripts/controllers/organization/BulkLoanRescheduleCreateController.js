(function (module) {
    mifosX.controllers = _.extend(module, {
        BulkLoanRescheduleCreateController: function (scope, resourceFactory, location, dateFilter, $q, $translate) {
            var defaultLimit = 15;
            var normalizeNumber = function (value) {
                if (value === undefined || value === null || value === '') { return value; }
                var parsed = Number(value);
                return isNaN(parsed) ? value : parsed;
            };
            var normalizeOptionList = function (options) {
                var normalized = [];
                angular.forEach(options || [], function (option) {
                    if (option === null || option === undefined) { return; }
                    if (angular.isObject(option)) {
                        normalized.push({
                            value: option.id !== undefined ? option.id :
                                (option.value !== undefined ? option.value :
                                    (option.code !== undefined ? option.code : option.name)),
                            label: option.name || option.label || option.displayName || option.value || option.code || option.id
                        });
                    } else {
                        normalized.push({ value: option, label: option });
                    }
                });
                return normalized;
            };
            var normalizeStrategyOptionList = function (options) {
                var normalized = [];
                angular.forEach(options || [], function (option) {
                    if (!option) { return; }
                    normalized.push({
                        value: angular.isObject(option) ?
                            (option.code !== undefined ? option.code :
                                (option.value !== undefined ? option.value :
                                    (option.id !== undefined ? option.id : option.name))) : option,
                        label: angular.isObject(option) ?
                            (option.value || option.name || option.label || option.code || option.id) : option
                    });
                });
                return normalized;
            };
            var flattenOffices = function (offices) {
                var officeMap = {}, roots = [], flattened = [];
                angular.forEach(offices || [], function (office) {
                    officeMap[office.id] = angular.extend({}, office, { children: [] });
                });
                angular.forEach(offices || [], function (office) {
                    var node = officeMap[office.id];
                    var parentId = office.parentOfficeId !== undefined ? office.parentOfficeId : office.parentId;
                    if (parentId && officeMap[parentId]) { officeMap[parentId].children.push(node); }
                    else { roots.push(node); }
                });
                var walk = function (node, path) {
                    var nextPath = path ? path + ' / ' + node.name : node.name;
                    // Office hierarchy is enforced by the backend; the selector should show
                    // each office as a simple option rather than as a breadcrumb path.
                    node.displayName = node.name;
                    flattened.push(node);
                    angular.forEach(node.children, function (child) { walk(child, nextPath); });
                };
                angular.forEach(roots, function (root) { walk(root, ''); });
                return flattened;
            };
            var normalizeMetrics = function (data) {
                var s = data && (data.summary || data.metrics || data.resultSummary || data) || {};
                var count = function () {
                    for (var i = 0; i < arguments.length; i += 1) {
                        if (angular.isArray(arguments[i])) { return arguments[i].length; }
                        if (arguments[i] !== undefined && arguments[i] !== null && Number(arguments[i])) {
                            return Number(arguments[i]);
                        }
                    }
                    return 0;
                };
                return {
                    found: count(s.found, s.foundCount, s.totalFound, s.totalLoansFound),
                    affected: count(s.toProcess, s.toProcessCount, s.processed, s.totalToProcess, s.totalSucceeded),
                    excluded: count(s.excluded, s.excludedCount, s.totalExcluded),
                    failed: count(s.failed, s.failedCount, s.failureCount, s.totalFailed)
                };
            };
            var normalizeLoanRow = function (row) {
                row = row || {};
                return {
                    loanAccountNumber: row.loanAccountNumber || row.accountNo || row.loanAccountNo || row.accountNumber,
                    clientName: row.clientName || row.borrowerName || row.displayName,
                    accountNumber: row.accountNumber || row.accountNo,
                    officeId: row.officeId,
                    officeName: row.officeName || row.branchName || row.branch,
                    loanProductName: row.loanProductName || row.loanProduct || row.productName,
                    loanOfficerId: row.loanOfficerId,
                    loanOfficerName: row.loanOfficerName || row.loanOfficer,
                    loanStatus: row.loanStatus || row.status,
                    resultStatus: row.status,
                    currentInterestRate: row.currentInterestRate || row.oldInterestRate || row.currentRate,
                    newInterestRate: row.newInterestRate || row.updatedInterestRate || row.targetRate,
                    interestRateMethod: row.interestRateMethod || row.interestRateType,
                    totalOutstanding: row.totalOutstanding || row.outstanding || row.outstandingBalance,
                    newTotalOutstanding: row.newTotalOutstanding || row.proposedOutstanding,
                    currentTerm: row.currentTerm || row.remaining,
                    newTerm: row.newTerm || row.proposedTerm,
                    nextScheduledInstallment: row.nextScheduledInstallment || row.monthlyInstallment,
                    rescheduleReason: row.rescheduleReason,
                    excludeReason: row.excludeReason || row.errorMessage || row.message || row.reason,
                    resultReason: row.resultReason || row.excludeReason || row.errorMessage || row.message || row.reason
                };
            };
            var normalizePreview = function (data) {
                var source = data || {};
                var rows = source.pageItems || source.items || source.loanResults || source.results || [];
                if (!angular.isArray(rows)) { rows = rows ? [rows] : []; }
                return {
                    id: source.executionId || source.id || source.resourceId,
                    status: source.status || source.executionStatus || source.state || 'PREVIEW',
                    metrics: normalizeMetrics(source),
                    loanResults: rows.map(normalizeLoanRow),
                    raw: source
                };
            };
            var setApiError = function (response) {
                scope.errorStatus = response && response.data &&
                    (response.data.defaultUserMessage || response.data.message) ||
                    response.statusText || $translate.instant('label.bulkreschedule.error.generic');
                scope.errorDetails = response && response.data && response.data.errors ? response.data.errors : [];
            };
            var clearApiError = function () { scope.errorStatus = ''; scope.errorDetails = []; };

            scope.state = { loadingTemplate: false, loadingPreview: false };
            scope.step = 1;
            scope.executionId = null;
            scope.previewData = null;
            scope.permissions = {};
            scope.validationRules = {};
            scope.errorStatus = '';
            scope.errorDetails = [];
            scope.previewQuery = { page: 1, pageSize: defaultLimit, total: 0, hasMore: false };
            scope.approverOptions = [];
            scope.approvalRequest = { approverId: null, submissionNote: '' };
            scope.formData = {
                filters: { officeId: null, loanStatus: null, currentInterestRate: null, loanProductIds: [], loanOfficerIds: [],
                    excludedLoans: [], rescheduleFromDateStrategy: 'NEXT_UNPAID' },
                reschedulingDetails: {
                    rescheduleReasonId: null, submittedOnDate: new Date(),
                    rescheduleReasonComment: '', repaymentEvery: null, repaymentFrequencyType: null,
                    preserveLoanTermDuration: false, adjustedDueDate: null, endDate: null, emi: null,
                    graceOnPrincipal: null, graceOnInterest: null, extraTerms: null,
                    newPrincipalDueFixedAmount: null, newFixedPrincipalPercentagePerInstallment: null,
                    overdueChargeHandling: null, carryForwardChargeId: null, carryForwardChargeDueDate: null
                },
                newInterestRate: null
            };
            scope.officeOptions = [];
            scope.loanStatusOptions = [];
            scope.loanProductOptions = [];
            scope.loanOfficerOptions = [];
            scope.rescheduleReasonOptions = [];
            scope.overdueChargeHandlingOptions = [];
            scope.availableCarryForwardCharges = [];
            scope.installmentStrategyOptions = normalizeStrategyOptionList([
                { code: 'FIRST_INSTALLMENT', value: $translate.instant('label.bulkreschedule.firstinstallment') },
                { code: 'NEXT_UNPAID', value: $translate.instant('label.bulkreschedule.nextunpaid') }
            ]);
            scope.repaymentFrequencyTypeOptions = [
                { id: 0, value: $translate.instant('label.bulkreschedule.days') },
                { id: 1, value: $translate.instant('label.bulkreschedule.weeks') },
                { id: 2, value: $translate.instant('label.bulkreschedule.months') },
                { id: 3, value: $translate.instant('label.bulkreschedule.years') }
            ];
            scope.loanSearch = { term: '' };

            var loadTemplate = function (officeId) {
                scope.state.loadingTemplate = true;
                resourceFactory.bulkLoanRescheduleTemplateResource.get(officeId ? { officeId: officeId } : {}, function (data) {
                    var filterOptions = data.filterOptions || {};
                    var details = data.rescheduleDetailOptions || {};
                    scope.permissions = data.userPermissions || {};
                    scope.validationRules = data.validationRules || {};
                    scope.officeOptions = flattenOffices(filterOptions.offices || []);
                    scope.loanStatusOptions = normalizeOptionList(filterOptions.loanStatuses || data.loanStatuses || []);
                    scope.loanProductOptions = normalizeOptionList(filterOptions.loanProducts || data.loanProducts || []);
                    scope.loanOfficerOptions = normalizeOptionList(filterOptions.loanOfficers || data.loanOfficers || []);
                    scope.rescheduleReasonOptions = normalizeOptionList(details.rescheduleReasons || data.rescheduleReasons || []);
                    scope.overdueChargeHandlingOptions = details.overdueChargeHandlingOptions || [];
                    scope.availableCarryForwardCharges = details.availableCarryForwardCharges || [];
                    scope.installmentStrategyOptions = normalizeStrategyOptionList(details.rescheduleFromDateStrategies || scope.installmentStrategyOptions);
                    if (!scope.formData.filters.officeId && scope.officeOptions.length) {
                        scope.formData.filters.officeId = scope.officeOptions[0].id;
                    }
                    scope.state.loadingTemplate = false;
                }, function (response) {
                    scope.state.loadingTemplate = false;
                    setApiError(response);
                });
            };
            scope.selectOffice = function () {
                scope.formData.filters.loanProductIds = [];
                scope.formData.filters.loanOfficerIds = [];
                scope.formData.filters.excludedLoans = [];
                loadTemplate(scope.formData.filters.officeId);
            };
            scope.excludedLoanOptions = function (value) {
                var deferred = $q.defer();
                if (!value || value.length < 2) { deferred.resolve([]); return deferred.promise; }
                var allowedOfficeIds = [Number(scope.formData.filters.officeId)];
                var addChildren = function (parentId) {
                    angular.forEach(scope.officeOptions, function (office) {
                        var officeParentId = office.parentOfficeId !== undefined ? office.parentOfficeId : office.parentId;
                        if (Number(officeParentId) === Number(parentId) && allowedOfficeIds.indexOf(Number(office.id)) === -1) {
                            allowedOfficeIds.push(Number(office.id));
                            addChildren(office.id);
                        }
                    });
                };
                addChildren(scope.formData.filters.officeId);
                resourceFactory.loanResource.getAllLoans({
                    limit: 10,
                    sqlSearch: value,
                    officeId: scope.formData.filters.officeId
                }, function (data) {
                    var rows = data && data.pageItems ? data.pageItems : [];
                    deferred.resolve(rows.filter(function (loan) {
                        return loan.officeId && allowedOfficeIds.indexOf(Number(loan.officeId)) !== -1;
                    }));
                });
                return deferred.promise;
            };
            scope.addExcludedLoan = function (loan) {
                if (!loan) { return; }
                var id = loan.id || loan.loanId;
                if (!_.some(scope.formData.filters.excludedLoans, function (item) { return (item.id || item.loanId) === id; })) {
                    scope.formData.filters.excludedLoans.push(loan);
                }
                scope.loanSearch.term = '';
            };
            scope.removeExcludedLoan = function (index) { scope.formData.filters.excludedLoans.splice(index, 1); };

            var buildPayload = function () {
                var filters = {}, details = angular.copy(scope.formData.reschedulingDetails);
                if (scope.formData.filters.officeId) { filters.officeId = normalizeNumber(scope.formData.filters.officeId); }
                if (scope.formData.filters.loanStatus) { filters.loanStatus = scope.formData.filters.loanStatus; }
                filters.rescheduleFromDateStrategy = scope.formData.filters.rescheduleFromDateStrategy;
                if (scope.formData.filters.currentInterestRate !== null && scope.formData.filters.currentInterestRate !== undefined && scope.formData.filters.currentInterestRate !== '') {
                    filters.currentInterestRate = normalizeNumber(scope.formData.filters.currentInterestRate);
                }
                if (scope.formData.filters.loanProductIds.length) { filters.loanProductIds = scope.formData.filters.loanProductIds.map(normalizeNumber); }
                if (scope.formData.filters.loanOfficerIds.length) { filters.loanOfficerIds = scope.formData.filters.loanOfficerIds.map(normalizeNumber); }
                if (scope.formData.filters.excludedLoans.length) {
                    filters.excludedLoanIds = scope.formData.filters.excludedLoans.map(function (loan) { return normalizeNumber(loan.id || loan.loanId); });
                }
                angular.forEach(['submittedOnDate', 'adjustedDueDate', 'endDate', 'carryForwardChargeDueDate'], function (field) {
                    if (details[field]) { details[field] = dateFilter(details[field], 'yyyy-MM-dd'); } else { delete details[field]; }
                });
                if (scope.formData.newInterestRate !== null && scope.formData.newInterestRate !== undefined && scope.formData.newInterestRate !== '') {
                    details.newInterestRate = normalizeNumber(scope.formData.newInterestRate);
                }
                angular.forEach(details, function (value, key) {
                    if (value === null || value === undefined || value === '') { delete details[key]; }
                });
                var payload = {
                    dryRun: true,
                    dateFormat: 'yyyy-MM-dd',
                    locale: (scope.optlang && scope.optlang.code) || 'en',
                    filters: filters,
                    reschedulingDetails: details
                };
                if (scope.executionId) {
                    payload.executionId = normalizeNumber(scope.executionId);
                }
                return payload;
            };
            scope.validateConfiguration = function () {
                scope.validation = {};
                if (!scope.formData.filters.officeId) { scope.validation.officeId = true; }
                if (!scope.formData.filters.rescheduleFromDateStrategy) { scope.validation.rescheduleFromDateStrategy = true; }
                if (!scope.formData.reschedulingDetails.rescheduleReasonId) { scope.validation.rescheduleReasonId = true; }
                if (!scope.formData.reschedulingDetails.submittedOnDate) { scope.validation.submittedOnDate = true; }
                if (scope.formData.newInterestRate === null || scope.formData.newInterestRate === undefined || scope.formData.newInterestRate === '') {
                    scope.validation.newInterestRate = true;
                }
                if (!scope.formData.reschedulingDetails.overdueChargeHandling) {
                    scope.validation.overdueChargeHandling = true;
                }
                if ((scope.formData.reschedulingDetails.endDate && !scope.formData.reschedulingDetails.emi) ||
                        (!scope.formData.reschedulingDetails.endDate && scope.formData.reschedulingDetails.emi)) {
                    scope.validation.emiPair = true;
                }
                if ((scope.formData.reschedulingDetails.repaymentEvery && scope.formData.reschedulingDetails.repaymentFrequencyType === null) ||
                        (!scope.formData.reschedulingDetails.repaymentEvery && scope.formData.reschedulingDetails.repaymentFrequencyType !== null)) {
                    scope.validation.repaymentFrequency = true;
                }
                if (scope.formData.reschedulingDetails.overdueChargeHandling &&
                        scope.formData.reschedulingDetails.overdueChargeHandling.name === 'Carry Charges Forward' &&
                        (!scope.formData.reschedulingDetails.carryForwardChargeId ||
                            !scope.formData.reschedulingDetails.carryForwardChargeDueDate)) {
                    scope.validation.carryForwardCharge = true;
                }
                return _.isEmpty(scope.validation);
            };
            var loadPreview = function (resetPage) {
                if (!scope.executionId) { return; }
                if (resetPage) { scope.previewQuery.page = 1; }
                clearApiError();
                scope.state.loadingPreview = true;
                resourceFactory.bulkLoanRescheduleExecutionResource.preview({
                    executionId: scope.executionId,
                    page: scope.previewQuery.page - 1,
                    size: scope.previewQuery.pageSize
                }, function (data) {
                    scope.previewData = normalizePreview(data);
                    scope.executionId = scope.previewData.id || scope.executionId;
                    var total = data && data.totalElements;
                    scope.previewQuery.total = total !== undefined ? Number(total) : scope.previewData.metrics.found || scope.previewData.loanResults.length;
                    scope.previewQuery.hasMore = (scope.previewQuery.page * scope.previewQuery.pageSize) < scope.previewQuery.total;
                    resourceFactory.bulkLoanRescheduleExecutionResource.get({ executionId: scope.executionId }, function (execution) {
                        scope.previewData.status = execution.status;
                        scope.previewData.metrics = normalizeMetrics(execution);
                        resourceFactory.bulkLoanRescheduleExecutionResource.approvers({ executionId: scope.executionId }, function (approvers) {
                            scope.approverOptions = approvers || [];
                        });
                        scope.state.loadingPreview = false;
                        scope.step = 2;
                    }, function (response) {
                        scope.state.loadingPreview = false;
                        setApiError(response);
                    });
                }, function (response) {
                    scope.state.loadingPreview = false;
                    setApiError(response);
                });
            };
            scope.runPreview = function () {
                if (!scope.validateConfiguration()) { return; }
                clearApiError();
                scope.state.loadingPreview = true;
                resourceFactory.bulkLoanRescheduleResource.preview(buildPayload(), function (data) {
                    var normalized = normalizePreview(data);
                    scope.executionId = normalized.id;
                    if (!scope.executionId) {
                        scope.state.loadingPreview = false;
                        setApiError({ data: { defaultUserMessage: $translate.instant('label.bulkreschedule.error.noexecutionid') } });
                        return;
                    }
                    loadPreview(true);
                }, function (response) {
                    scope.state.loadingPreview = false;
                    setApiError(response);
                });
            };
            scope.previousPreviewPage = function () {
                if (scope.previewQuery.page <= 1 || scope.state.loadingPreview) { return; }
                scope.previewQuery.page -= 1;
                loadPreview(false);
            };
            scope.nextPreviewPage = function () {
                if (!scope.previewQuery.hasMore || scope.state.loadingPreview) { return; }
                scope.previewQuery.page += 1;
                loadPreview(false);
            };
            scope.pageStart = function () {
                return scope.previewQuery.total ? ((scope.previewQuery.page - 1) * scope.previewQuery.pageSize) + 1 : 0;
            };
            scope.pageEnd = function () {
                return Math.min(scope.previewQuery.page * scope.previewQuery.pageSize, scope.previewQuery.total);
            };
            scope.backToConfigure = function () { scope.step = 1; };
            scope.submitForApproval = function () {
                if (!scope.executionId || scope.state.submitting) { return; }
                if (!scope.approvalRequest.approverId) {
                    setApiError({ data: { defaultUserMessage: $translate.instant('label.bulkreschedule.error.selectapprover') } });
                    return;
                }
                if (!scope.approvalRequest.submissionNote || !scope.approvalRequest.submissionNote.trim()) {
                    setApiError({ data: { defaultUserMessage: $translate.instant('label.bulkreschedule.error.reason') } });
                    return;
                }
                scope.state.submitting = true;
                resourceFactory.bulkLoanRescheduleExecutionResource.submitForApproval(
                    { executionId: scope.executionId }, {
                        approverId: scope.approvalRequest.approverId,
                        submissionNote: scope.approvalRequest.submissionNote.trim()
                    },
                    function () {
                        scope.state.submitting = false;
                        location.path('/bulkreschedule/' + scope.executionId);
                    },
                    function (response) {
                        scope.state.submitting = false;
                        setApiError(response);
                    }
                );
            };
            scope.cancel = function () { location.path('/bulkreschedule'); };
            loadTemplate();
        }
    });
    mifosX.ng.application.controller('BulkLoanRescheduleCreateController', [
        '$scope', 'ResourceFactory', '$location', 'dateFilter', '$q', '$translate',
        mifosX.controllers.BulkLoanRescheduleCreateController
    ]).run(function ($log) {
        $log.info('BulkLoanRescheduleCreateController initialized');
    });
}(mifosX.controllers || {}));
