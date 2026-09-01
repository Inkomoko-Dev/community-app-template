(function (module) {
    mifosX.controllers = _.extend(module, {
        BulkLoanRescheduleDetailController: function (scope, resourceFactory, routeParams, location, http, API_VERSION, $rootScope, timeout, $translate) {
            var defaultLimit = 15;
            var pollPromise = null;
            scope.executionId = routeParams.executionId;
            scope.permissions = {};
            scope.canApprove = false;
            scope.canCreate = false;
            scope.state = { loading: false, approving: false, rejecting: false, submitting: false };
            scope.errorStatus = '';
            scope.request = null;
            scope.decision = { reason: '' };
            scope.approverOptions = [];
            scope.approvalRequest = { approverId: null, submissionNote: '' };
            scope.auditHistory = [];
            scope.canViewAudit = false;
            scope.previewQuery = { page: 1, pageSize: defaultLimit, total: 0, hasMore: false, status: '' };
            scope.statusLabel = function (status) {
                return $translate.instant('label.bulkreschedule.status.' + String(status || '').toLowerCase());
            };
            scope.actionLabel = function (action) {
                return $translate.instant('label.bulkreschedule.action.' + String(action || '').toLowerCase());
            };

            var setApiError = function (response) {
                scope.errorStatus = response && response.data &&
                    (response.data.defaultUserMessage || response.data.message) ||
                    response.statusText || $translate.instant('label.bulkreschedule.error.generic');
            };
            var normalizeDateTime = function (value) {
                if (angular.isArray(value) && value.length >= 3) {
                    return new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0);
                }
                return value;
            };
            var normalizeMetrics = function (data) {
                var s = data && (data.summary || data.metrics || data.resultSummary || data) || {};
                var count = function () {
                    for (var i = 0; i < arguments.length; i += 1) {
                        if (angular.isArray(arguments[i])) { return arguments[i].length; }
                        if (arguments[i] !== undefined && arguments[i] !== null && !isNaN(Number(arguments[i]))) {
                            return Number(arguments[i]);
                        }
                    }
                    return 0;
                };
                var found = count(s.found, s.totalFound, s.totalLoansFound);
                var excluded = count(s.excluded, s.totalExcluded);
                var failed = count(s.failed, s.totalFailed);
                return {
                    found: found,
                    affected: count(s.toProcess, s.totalToProcess, s.totalToBeProcessed,
                        Math.max(0, found - excluded - failed)),
                    succeeded: count(s.totalSucceeded),
                    excluded: excluded,
                    failed: failed
                };
            };
            var normalizeLoan = function (row) {
                row = row || {};
                return {
                    loanAccountNumber: row.loanAccountNumber || row.accountNo || row.loanAccountNo || row.accountNumber,
                    clientName: row.clientName || row.borrowerName || row.displayName,
                    accountNumber: row.accountNumber || row.accountNo,
                    officeName: row.officeName || row.branchName,
                    loanProductName: row.loanProductName || row.loanProduct,
                    loanOfficerName: row.loanOfficerName || row.loanOfficer,
                    loanStatus: row.loanStatus || row.status,
                    resultStatus: row.status,
                    currentInterestRate: row.currentInterestRate || row.currentRate,
                    newInterestRate: row.newInterestRate || row.targetRate,
                    interestRateMethod: row.interestRateMethod || row.interestRateType,
                    totalOutstanding: row.totalOutstanding || row.outstanding,
                    newTotalOutstanding: row.newTotalOutstanding || row.proposedOutstanding,
                    currentTerm: row.currentTerm || row.remaining,
                    newTerm: row.newTerm || row.proposedTerm,
                    nextScheduledInstallment: row.nextScheduledInstallment || row.monthlyInstallment,
                    rescheduleReason: row.rescheduleReason,
                    excludeReason: row.excludeReason || row.errorMessage || row.message,
                    resultReason: row.resultReason || row.excludeReason || row.errorMessage || row.message
                };
            };
            var normalizeExecution = function (data) {
                data = data || {};
                var status = data.status || data.executionStatus || data.state || 'PREVIEW';
                var rejected = String(status).toUpperCase() === 'REJECTED';
                return {
                    id: data.executionId || data.id || scope.executionId,
                    status: status,
                    approvalStatus: data.approvalStatus || status,
                    requestedBy: data.requestedBy || data.createdBy || data.createdByUsername ||
                        (data.user && data.user.username),
                    createdById: data.createdById || (data.user && data.user.id),
                    requestedOn: normalizeDateTime(data.requestedOn || data.createdAt || data.submittedOnDate),
                    approvedBy: data.approvedBy || data.approverName || data.approverUsername ||
                        (data.approver && (data.approver.username || data.approver.displayName)),
                    approverId: data.approverId || (data.approver && data.approver.id),
                    approvedAt: normalizeDateTime(data.approvedAt),
                    approvalNote: rejected ? null : data.approvalNote,
                    submissionNote: data.submissionNote,
                    totalProcessed: Number(data.totalProcessed || 0),
                    totalRemaining: Number(data.totalRemaining || 0),
                    executionStartedAt: normalizeDateTime(data.executionStartedAt),
                    executionCompletedAt: normalizeDateTime(data.executionCompletedAt),
                    recoveryAvailableAt: normalizeDateTime(data.recoveryAvailableAt),
                    recoveryAvailable: data.recoveryAvailable === true,
                    rejectionReason: data.rejectReason || data.rejectionReason || (rejected ? data.approvalNote : null),
                    metrics: normalizeMetrics(data),
                    raw: data
                };
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
            scope.isPendingApproval = function () {
                var status = scope.request && scope.request.status;
                return String(status || '').toUpperCase() === 'PENDING_APPROVAL';
            };
            scope.isExecutionActive = function () {
                var status = String(scope.request && scope.request.status || '').toUpperCase();
                return status === 'APPROVED' || status === 'EXECUTING';
            };
            scope.canRecoverExecution = function () {
                return scope.canOfferRecovery() && scope.request.recoveryAvailable;
            };
            scope.canOfferRecovery = function () {
                var currentUserId = scope.currentSession && scope.currentSession.user && scope.currentSession.user.userId;
                return scope.canApprove && scope.request && currentUserId &&
                    String(scope.request.status || '').toUpperCase() === 'EXECUTING' &&
                    Number(scope.request.approverId) === Number(currentUserId);
            };
            scope.executionProgress = function () {
                var total = scope.request ? scope.request.totalProcessed + scope.request.totalRemaining : 0;
                return total ? Math.min(100, Math.round((scope.request.totalProcessed / total) * 100)) : 0;
            };
            var schedulePoll = function () {
                if (pollPromise || !scope.isExecutionActive()) { return; }
                pollPromise = timeout(function () {
                    pollPromise = null;
                    loadPreview(false);
                }, 3000);
            };
            scope.isPreview = function () {
                return String(scope.request && scope.request.status || '').toUpperCase() === 'PREVIEW';
            };
            scope.canSubmitPreview = function () {
                var currentUserId = scope.currentSession && scope.currentSession.user && scope.currentSession.user.userId;
                return scope.isPreview() && (scope.canCreate ||
                    (currentUserId && Number(scope.request.createdById) === Number(currentUserId)));
            };
            scope.canCancelPreview = function () {
                return scope.isPreview() && scope.canCreate;
            };
            var loadPermissions = function () {
                resourceFactory.bulkLoanRescheduleTemplateResource.get({}, function (data) {
                    scope.permissions = data.userPermissions || {};
                    scope.canApprove = scope.permissions.canApprove === true;
                    scope.canCreate = scope.permissions.canInitiateBulkReschedule === true;
                }, function () { scope.canApprove = false; });
            };
            var loadPreview = function (resetPage) {
                if (resetPage) { scope.previewQuery.page = 1; }
                scope.state.loading = true;
                scope.errorStatus = '';
                resourceFactory.bulkLoanRescheduleExecutionResource.get({ executionId: scope.executionId }, function (execution) {
                    var existingRows = scope.request && scope.request.loanResults || [];
                    scope.request = normalizeExecution(execution);
                    scope.request.loanResults = existingRows;
                    resourceFactory.bulkLoanRescheduleExecutionResource.audit({ executionId: scope.executionId }, function (items) {
                        scope.auditHistory = (items || []).map(function (audit) {
                            audit.timestamp = normalizeDateTime(audit.timestamp);
                            return audit;
                        });
                        scope.canViewAudit = true;
                    }, function () {
                        scope.auditHistory = [];
                        scope.canViewAudit = false;
                    });
                    if (scope.isPreview()) {
                        resourceFactory.bulkLoanRescheduleExecutionResource.approvers({ executionId: scope.executionId }, function (approvers) {
                            scope.approverOptions = approvers || [];
                        });
                    }
                    resourceFactory.bulkLoanRescheduleExecutionResource.preview({
                    executionId: scope.executionId,
                    page: scope.previewQuery.page - 1,
                    size: scope.previewQuery.pageSize,
                    status: scope.previewQuery.status || undefined
                }, function (data) {
                    var rows = data.pageItems || [];
                    scope.request.loanResults = rows.map(normalizeLoan);
                    scope.previewQuery.total = Number(data.totalElements || 0);
                    scope.request.metrics.succeeded = Number(data.totalSucceeded || 0);
                    scope.previewQuery.hasMore =
                        (scope.previewQuery.page * scope.previewQuery.pageSize) < scope.previewQuery.total;
                    scope.state.loading = false;
                    schedulePoll();
                }, function (response) {
                    scope.state.loading = false;
                    setApiError(response);
                });
                }, function (response) {
                    scope.state.loading = false;
                    setApiError(response);
                });
            };
            scope.nextPage = function () {
                if (!scope.previewQuery.hasMore || scope.state.loading) { return; }
                scope.previewQuery.page += 1;
                loadPreview(false);
            };
            scope.previousPage = function () {
                if (scope.previewQuery.page <= 1 || scope.state.loading) { return; }
                scope.previewQuery.page -= 1;
                loadPreview(false);
            };
            scope.pageStart = function () {
                return scope.previewQuery.total ? ((scope.previewQuery.page - 1) * scope.previewQuery.pageSize) + 1 : 0;
            };
            scope.pageEnd = function () {
                return Math.min(scope.previewQuery.page * scope.previewQuery.pageSize, scope.previewQuery.total);
            };
            scope.approve = function () {
                if (!scope.canApprove || !scope.isPendingApproval() || scope.state.approving) { return; }
                if (!scope.decision.reason || !scope.decision.reason.trim()) {
                    scope.errorStatus = $translate.instant('label.bulkreschedule.error.approvalreason');
                    return;
                }
                if (!window.confirm($translate.instant('label.bulkreschedule.confirm.approve'))) { return; }
                scope.state.approving = true;
                resourceFactory.bulkLoanRescheduleCommandResource.approve(
                    { executionId: scope.executionId },
                    { approvalNote: scope.decision.reason.trim() },
                    function () { scope.state.approving = false; loadPreview(true); },
                    function (response) { scope.state.approving = false; setApiError(response); }
                );
            };
            scope.reject = function () {
                if (!scope.canApprove || !scope.isPendingApproval() || scope.state.rejecting) { return; }
                if (!scope.decision.reason || !scope.decision.reason.trim()) {
                    scope.errorStatus = $translate.instant('label.bulkreschedule.error.rejectionreason');
                    return;
                }
                scope.state.rejecting = true;
                resourceFactory.bulkLoanRescheduleCommandResource.reject(
                    { executionId: scope.executionId },
                    { rejectReason: scope.decision.reason.trim() },
                    function () { scope.state.rejecting = false; loadPreview(true); },
                    function (response) { scope.state.rejecting = false; setApiError(response); }
                );
            };
            scope.submitForApproval = function () {
                if (!scope.canSubmitPreview() || scope.state.submitting) { return; }
                if (!scope.approvalRequest.approverId) {
                    scope.errorStatus = $translate.instant('label.bulkreschedule.error.selectapprover');
                    return;
                }
                if (!scope.approvalRequest.submissionNote || !scope.approvalRequest.submissionNote.trim()) {
                    scope.errorStatus = $translate.instant('label.bulkreschedule.error.reason');
                    return;
                }
                scope.state.submitting = true;
                resourceFactory.bulkLoanRescheduleExecutionResource.submitForApproval(
                    { executionId: scope.executionId }, {
                        approverId: scope.approvalRequest.approverId,
                        submissionNote: scope.approvalRequest.submissionNote.trim()
                    },
                    function () { scope.state.submitting = false; loadPreview(true); },
                    function (response) { scope.state.submitting = false; setApiError(response); }
                );
            };
            scope.cancelPreview = function () {
                if (!scope.canCancelPreview() || scope.state.cancelling) { return; }
                if (!window.confirm($translate.instant('label.bulkreschedule.confirm.cancel'))) { return; }
                scope.state.cancelling = true;
                resourceFactory.bulkLoanRescheduleExecutionResource.cancel(
                    { executionId: scope.executionId },
                    function () {
                        scope.state.cancelling = false;
                        location.path('/bulkreschedule');
                    },
                    function (response) {
                        scope.state.cancelling = false;
                        setApiError(response);
                    }
                );
            };
            scope.backToList = function () { location.path('/bulkreschedule'); };
            scope.previewAgain = function () { loadPreview(true); };
            scope.filterPreview = function () { loadPreview(true); };
            scope.recoverExecution = function () {
                if (!scope.canRecoverExecution() || scope.state.recovering) { return; }
                if (!window.confirm($translate.instant('label.bulkreschedule.confirm.recover'))) { return; }
                scope.state.recovering = true;
                resourceFactory.bulkLoanRescheduleCommandResource.recover(
                    { executionId: scope.executionId }, {},
                    function () {
                        scope.state.recovering = false;
                        loadPreview(true);
                    },
                    function (response) {
                        scope.state.recovering = false;
                        setApiError(response);
                    }
                );
            };
            scope.$on('$destroy', function () {
                if (pollPromise) { timeout.cancel(pollPromise); }
            });
            scope.downloadResults = function () {
                if (scope.state.downloading) { return; }
                scope.state.downloading = true;
                var url = $rootScope.hostUrl + API_VERSION + '/bulk-reschedule/' + scope.executionId + '/results.csv';
                http.get(url, { responseType: 'arraybuffer' }).then(function (response) {
                    var blob = new Blob([response.data], { type: response.headers('Content-Type') || 'text/csv' });
                    var link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = 'bulk-reschedule-' + scope.executionId + '-results.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(link.href);
                    scope.state.downloading = false;
                }).catch(function (response) {
                    scope.state.downloading = false;
                    setApiError(response);
                });
            };
            loadPermissions();
            loadPreview(true);
        }
    });
    mifosX.ng.application.controller('BulkLoanRescheduleDetailController', [
        '$scope', 'ResourceFactory', '$routeParams', '$location', '$http', 'API_VERSION', '$rootScope', '$timeout', '$translate',
        mifosX.controllers.BulkLoanRescheduleDetailController
    ]).run(function ($log) {
        $log.info('BulkLoanRescheduleDetailController initialized');
    });
}(mifosX.controllers || {}));
