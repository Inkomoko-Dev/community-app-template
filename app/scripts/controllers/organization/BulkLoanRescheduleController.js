(function (module) {
    mifosX.controllers = _.extend(module, {
        BulkLoanRescheduleController: function (scope, resourceFactory, routeParams, location, dateFilter, $q) {
            var defaultLimit = 50;

            var fallbackRepaymentFrequencyTypeOptions = [
                { id: 0, value: 'Days' },
                { id: 1, value: 'Weeks' },
                { id: 2, value: 'Months' },
                { id: 3, value: 'Years' }
            ];

            var normalizeNumber = function (value) {
                if (value === undefined || value === null || value === '') {
                    return value;
                }

                var parsed = Number(value);
                return isNaN(parsed) ? value : parsed;
            };

            var normalizeInteger = function (value) {
                if (value === undefined || value === null || value === '') {
                    return value;
                }

                return parseInt(value, 10);
            };

            var normalizeOptionList = function (options) {
                var normalized = [];

                angular.forEach(options || [], function (option) {
                    if (option === null || option === undefined) {
                        return;
                    }

                    if (angular.isObject(option)) {
                        normalized.push({
                            value: option.id !== undefined ? option.id :
                                (option.value !== undefined ? option.value :
                                    (option.code !== undefined ? option.code : option.name)),
                            label: option.name || option.label || option.displayName ||
                                option.value || option.code || option.id
                        });
                    } else {
                        normalized.push({
                            value: option,
                            label: option
                        });
                    }
                });

                return normalized;
            };

            var normalizeRateOptionList = function (options) {
                var normalized = [];

                angular.forEach(options || [], function (option) {
                    if (!option) {
                        return;
                    }

                    var rate = option.rate !== undefined ?
                        option.rate :
                        (option.value !== undefined ? option.value : option.id);

                    if (rate === undefined || rate === null || rate === '') {
                        return;
                    }

                    var label = rate;

                    if (option.rateType || option.valueType) {
                        label += ' (' +
                            (option.rateType || option.valueType).replace(/_/g, ' ') +
                            ')';
                    } else if (option.name) {
                        label += ' (' + option.name + ')';
                    }

                    normalized.push({
                        value: rate,
                        label: label
                    });
                });

                return normalized;
            };

            var normalizeStrategyOptionList = function (options) {
                var normalized = [];

                angular.forEach(options || [], function (option) {
                    if (!option) {
                        return;
                    }

                    if (angular.isObject(option)) {
                        normalized.push({
                            value: option.code !== undefined ? option.code :
                                (option.value !== undefined ? option.value :
                                    (option.id !== undefined ? option.id : option.name)),
                            label: option.value || option.name ||
                                option.label || option.code || option.id
                        });
                    } else {
                        normalized.push({
                            value: option,
                            label: option
                        });
                    }
                });

                return normalized;
            };

            var flattenOffices = function (offices) {
                var officeMap = {};
                var roots = [];
                var flattened = [];

                angular.forEach(offices || [], function (office) {
                    officeMap[office.id] = angular.extend({}, office, {
                        children: []
                    });
                });

                angular.forEach(offices || [], function (office) {
                    var node = officeMap[office.id];
                    var parentId = office.parentOfficeId !== undefined ?
                        office.parentOfficeId :
                        office.parentId;

                    if (parentId && officeMap[parentId]) {
                        officeMap[parentId].children.push(node);
                    } else {
                        roots.push(node);
                    }
                });

                var walk = function (node, path) {
                    var nextPath = path ?
                        path + ' / ' + node.name :
                        node.name;

                    node.displayName = nextPath;
                    flattened.push(node);

                    angular.forEach(node.children, function (child) {
                        walk(child, nextPath);
                    });
                };

                angular.forEach(roots, function (root) {
                    walk(root, '');
                });

                return {
                    roots: roots,
                    flattened: flattened
                };
            };

            var normalizeTemplateData = function (data, requestedOfficeId) {
                var filterOptions = data.filterOptions || {};
                var rescheduleDetailOptions = data.rescheduleDetailOptions || {};
                var userPermissions = data.userPermissions || {};

                var accessibleOfficeIds =
                    userPermissions.accessibleOffices || [];

                var officeSource = filterOptions.offices || [];

                if (accessibleOfficeIds.length) {
                    officeSource = officeSource.filter(function (office) {
                        return _.contains(
                            accessibleOfficeIds,
                            normalizeNumber(office.id)
                        );
                    });
                }

                var officeData = flattenOffices(officeSource);
                var selectedOfficeId = requestedOfficeId;

                if (selectedOfficeId &&
                    !_.some(officeData.flattened, function (office) {
                        return normalizeNumber(office.id) ===
                            normalizeNumber(selectedOfficeId);
                    })) {

                    selectedOfficeId =
                        officeData.flattened.length ?
                            officeData.flattened[0].id :
                            null;
                }

                if (!selectedOfficeId &&
                    officeData.flattened.length) {
                    selectedOfficeId = officeData.flattened[0].id;
                }

                return {
                    officeRoots: officeData.roots,
                    officeOptions: officeData.flattened,
                    selectedOfficeId: selectedOfficeId,

                    loanStatusOptions: normalizeOptionList(
                        filterOptions.loanStatuses ||
                        data.loanStatusOptions ||
                        data.loanStatuses
                    ),

                    installmentStrategyOptions:
                        normalizeStrategyOptionList(
                            rescheduleDetailOptions.rescheduleFromDateStrategies ||
                            filterOptions.installmentStrategies ||
                            data.installmentStrategyOptions ||
                            data.installmentStrategies || [
                                {
                                    code: 'FIRST_INSTALLMENT',
                                    value: 'First Installment Date'
                                },
                                {
                                    code: 'NEXT_UNPAID',
                                    value: 'Next Unpaid Installment Date'
                                }
                            ]
                        ),

                    currentInterestRateOptions:
                        normalizeRateOptionList(
                            filterOptions.currentInterestRates ||
                            data.currentInterestRates
                        ),

                    loanProductOptions: normalizeOptionList(
                        filterOptions.loanProducts ||
                        data.loanProductOptions ||
                        data.loanProducts
                    ),

                    loanOfficerOptions: normalizeOptionList(
                        filterOptions.loanOfficers ||
                        data.loanOfficerOptions ||
                        data.loanOfficers
                    ),

                    rescheduleReasonOptions:
                        normalizeOptionList(
                            rescheduleDetailOptions.rescheduleReasons ||
                            data.rescheduleReasons ||
                            data.rescheduleReasonOptions ||
                            []
                        ),

                    overdueChargeHandlingOptions:
                        normalizeOptionList(
                            rescheduleDetailOptions.overdueChargeHandlingOptions ||
                            data.overdueChargeHandlingOptions || [
                                {
                                    value: 'NONE',
                                    name: 'No changes'
                                },
                                {
                                    value: 'CARRY_FORWARD',
                                    name: 'Carry Charges Forward'
                                }
                            ]
                        ),

                    availableCarryForwardCharges:
                        normalizeOptionList(
                            rescheduleDetailOptions.availableCarryForwardCharges ||
                            data.availableCarryForwardCharges ||
                            []
                        ),

                    adjustFuturePayments:
                    rescheduleDetailOptions.adjustFuturePayments,

                    validationRules: data.validationRules || {},

                    userPermissions: userPermissions
                };
            };

            var normalizeMetrics = function (data) {
                var source = data &&
                    (data.summary ||
                        data.metrics ||
                        data.resultSummary ||
                        data);

                source = source || {};

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
                    found: count(source.found, source.foundCount, source.totalFound, source.totalLoansFound),

                    toProcess: count(source.toProcess, source.toProcessCount, source.processed, source.totalToProcess),

                    skipped: count(source.skipped, source.skippedCount),

                    succeeded: count(source.succeeded, source.successCount, source.successful),

                    failed: count(source.failed, source.failedCount, source.failureCount, source.totalFailed),

                    excluded: count(source.excluded, source.excludedCount, source.totalExcluded)
                };
            };

            var normalizeLoanRow = function (row) {
                var currentRate =
                    row.currentInterestRate ||
                    row.oldInterestRate ||
                    row.beforeInterestRate ||
                    row.currentRate;

                var newRate =
                    row.newInterestRate ||
                    row.afterInterestRate ||
                    row.updatedInterestRate ||
                    row.targetRate;

                return {
                    id: row.loanId ||
                        row.id ||
                        row.accountId,

                    accountNo: row.accountNo ||
                        row.loanAccountNo ||
                        row.accountNumber ||
                        row.account,

                    clientName: row.clientName ||
                        row.borrowerName ||
                        row.displayName ||
                        row.name,

                    currentInterestRate: currentRate,

                    newInterestRate: newRate,

                    interestRateChange:
                        row.interestRateChange ||
                        row.rateChange ||
                        (
                            currentRate !== undefined &&
                            newRate !== undefined
                                ?
                                Number(newRate) - Number(currentRate)
                                :
                                undefined
                        ),

                    status: row.status ||
                        row.resultStatus ||
                        row.outcome ||
                        row.loanStatus,

                    message: row.message ||
                        row.reason ||
                        row.resultMessage ||
                        row.errorMessage ||
                        row.note,

                    skipped: !!row.skipped ||
                        String(row.status || '').toUpperCase() === 'SKIPPED',

                    branchName: row.branchName ||
                        row.officeName ||
                        row.branch,

                    loanProduct: row.loanProduct ||
                        row.loanProductName ||
                        row.productName,

                    loanOfficer: row.loanOfficer ||
                        row.loanOfficerName,

                    outstanding: row.outstanding ||
                        row.outstandingBalance,

                    monthlyInstallment: row.monthlyInstallment ||
                        row.currentInstallment,

                    newMonthlyInstallment:
                        row.newMonthlyInstallment ||
                        row.newInstallment,

                    remaining: row.remaining ||
                        row.remainingInstallments
                };
            };

            var normalizeExecution = function (data) {
                var source = data || {};

                var rows =
                    source.loanResults ||
                    source.results ||
                    source.loanResultList ||
                    source.processedLoans ||
                    source.pageItems ||
                    source.items ||
                    [];

                if (!angular.isArray(rows)) {
                    rows = rows ? [rows] : [];
                }

                return {
                    id: source.executionId ||
                        source.id ||
                        source.resourceId ||
                        source.bulkRescheduleExecutionId,

                    status: source.status ||
                        source.executionStatus ||
                        source.state ||
                        source.commandStatus,

                    message: source.message ||
                        source.summaryMessage ||
                        source.userMessage ||
                        source.defaultUserMessage ||
                        '',

                    summary: source.summary ||
                        source.metrics ||
                        source.resultSummary ||
                        source,

                    metrics: normalizeMetrics(source),

                    loanResults: rows.map(normalizeLoanRow),

                    raw: source
                };
            };

            var setApiError = function (response) {
                scope.errorStatus =
                    response &&
                    (
                        response.data &&
                        (
                            response.data.defaultUserMessage ||
                            response.data.message
                        )
                    ) ||
                    response.statusText ||
                    'Unable to complete request';

                scope.errorDetails =
                    response &&
                    response.data &&
                    response.data.errors ?
                        response.data.errors :
                        [];
            };

            var clearApiError = function () {
                scope.errorStatus = '';
                scope.errorDetails = [];
            };

            var buildDateRange = function (startDate, endDate) {
                if (!startDate || !endDate) {
                    return null;
                }

                return [
                    dateFilter(startDate, 'yyyy-MM-dd'),
                    dateFilter(endDate, 'yyyy-MM-dd')
                ].join(',');
            };

            var buildReschedulingDetailsPayload = function () {
                var source =
                    scope.formData.reschedulingDetails || {};

                var details = {};

                var resolveOverdueChargeHandling = function (value) {
                    if (angular.isObject(value)) {
                        return value;
                    }

                    var templateOptions =
                        (
                            (scope.templateData || {})
                                .rescheduleDetailOptions || {}
                        ).overdueChargeHandlingOptions || [];

                    var match = _.find(
                        templateOptions,
                        function (option) {
                            return option &&
                                (
                                    option.id === value ||
                                    option.value === value ||
                                    option.code === value
                                );
                        }
                    );

                    return match || value;
                };

                var setDate = function (field, targetField) {
                    if (source[field]) {
                        details[targetField || field] =
                            dateFilter(source[field], scope.df);
                    }
                };

                var setValue = function (field, targetField) {
                    if (
                        source[field] !== undefined &&
                        source[field] !== null &&
                        source[field] !== ''
                    ) {
                        details[targetField || field] = source[field];
                    }
                };

                setValue('installmentStrategy');
                setValue('rescheduleReasonId');
                setDate('submittedOnDate');
                setValue('rescheduleReasonComment');
                setValue('repaymentEvery');
                setValue('repaymentFrequencyType');
                setValue('preserveLoanTermDuration');
                setDate('adjustedDueDate');
                setDate('endDate');
                setValue('emi');
                setValue('graceOnPrincipal');
                setValue('graceOnInterest');
                setValue('extraTerms');
                setValue('newPrincipalDueFixedAmount');
                setValue(
                    'newFixedPrincipalPercentagePerInstallment'
                );

                if (
                    scope.formData.newInterestRate !== undefined &&
                    scope.formData.newInterestRate !== null &&
                    scope.formData.newInterestRate !== ''
                ) {
                    details.newInterestRate =
                        normalizeNumber(
                            scope.formData.newInterestRate
                        );
                }

                if (
                    source.overdueChargeHandling &&
                    source.overdueChargeHandling !== 'NONE'
                ) {
                    details.overdueChargeHandling =
                        resolveOverdueChargeHandling(
                            source.overdueChargeHandling
                        );
                }

                if (source.carryForwardChargeId) {
                    details.carryForwardChargeId =
                        angular.isObject(
                            source.carryForwardChargeId
                        )
                            ?
                            (
                                source.carryForwardChargeId.value ||
                                source.carryForwardChargeId.id
                            )
                            :
                            source.carryForwardChargeId;
                }

                setDate('carryForwardChargeDueDate');

                return details;
            };

            var buildPreviewPayload = function () {
                var selectedExcludedLoans =
                    scope.formData.filters.excludedLoans || [];

                var filters = {};

                var reschedulingDetails =
                    buildReschedulingDetailsPayload();

                if (
                    scope.formData.filters.officeId !== null &&
                    scope.formData.filters.officeId !== undefined &&
                    scope.formData.filters.officeId !== ''
                ) {
                    filters.officeId =
                        normalizeNumber(
                            scope.formData.filters.officeId
                        );
                }

                if (scope.formData.filters.loanStatus) {
                    filters.loanStatus =
                        scope.formData.filters.loanStatus;
                }

                if (
                    scope.formData.filters.currentInterestRate !== null &&
                    scope.formData.filters.currentInterestRate !== undefined &&
                    scope.formData.filters.currentInterestRate !== ''
                ) {
                    filters.currentInterestRate =
                        normalizeNumber(
                            scope.formData.filters.currentInterestRate
                        );
                }

                if (
                    scope.formData.filters.loanProductIds &&
                    scope.formData.filters.loanProductIds.length
                ) {
                    filters.loanProductIds =
                        scope.formData.filters.loanProductIds.map(
                            function (id) {
                                return normalizeNumber(id);
                            }
                        );
                }

                if (
                    scope.formData.filters.loanOfficerIds &&
                    scope.formData.filters.loanOfficerIds.length
                ) {
                    filters.loanOfficerIds =
                        scope.formData.filters.loanOfficerIds.map(
                            function (id) {
                                return normalizeNumber(id);
                            }
                        );
                }

                if (selectedExcludedLoans.length) {
                    filters.excludedLoanIds =
                        selectedExcludedLoans.map(
                            function (loan) {
                                return normalizeNumber(loan.id);
                            }
                        );
                }

                reschedulingDetails.installmentStrategy =
                    scope.formData.reschedulingDetails
                        .installmentStrategy;

                return {
                    dryRun: true,
                    dateFormat: scope.df,
                    locale: scope.optlang &&
                        scope.optlang.code,
                    filters: filters,
                    reschedulingDetails: reschedulingDetails
                };
            };

            var loadPreview = function (executionId, resetPage) {
                if (!executionId) {
                    return;
                }

                if (resetPage) {
                    scope.previewQuery.page = 1;
                }

                clearApiError();
                scope.state.loadingPreview = true;

                var params = {
                    executionId: executionId,
                    limit: scope.previewQuery.pageSize,
                    offset:
                        (
                            scope.previewQuery.page - 1
                        ) *
                        scope.previewQuery.pageSize
                };

                resourceFactory.bulkLoanRescheduleExecutionResource
                    .get(
                        params,
                        function (data) {
                            var normalized =
                                normalizeExecution(data);

                            scope.previewData = normalized;
                            scope.execution = normalized;

                            scope.executionId =
                                normalized.id ||
                                executionId;

                            var total =
                                data &&
                                (
                                    data.totalFilteredRecords ||
                                    data.totalRecords ||
                                    data.total
                                );

                            scope.previewQuery.total =
                                total !== undefined ?
                                    Number(total) :
                                    normalized.loanResults.length;

                            scope.previewQuery.hasMore =
                                normalized.loanResults.length ===
                                scope.previewQuery.pageSize &&
                                (
                                    scope.previewQuery.page *
                                    scope.previewQuery.pageSize
                                ) <
                                scope.previewQuery.total;

                            scope.state.loadingPreview = false;
                            scope.step = scope.state.step = 2;
                        },
                        function (response) {
                            scope.state.loadingPreview = false;
                            setApiError(response);
                        }
                    );
            };

            var loadTemplateData = function (officeId) {
                scope.state.loadingTemplate = true;

                resourceFactory.bulkLoanRescheduleTemplateResource
                    .get(
                        { officeId: officeId },
                        function (data) {
                            var normalized =
                                normalizeTemplateData(
                                    data || {},
                                    officeId
                                );

                            scope.templateData = data || {};

                            scope.officeRoots =
                                normalized.officeRoots;

                            scope.officeOptions =
                                normalized.officeOptions;

                            scope.loanStatusOptions =
                                normalized.loanStatusOptions;

                            scope.installmentStrategyOptions =
                                normalized.installmentStrategyOptions;

                            scope.currentInterestRateOptions =
                                normalized.currentInterestRateOptions;

                            scope.loanProductOptions =
                                normalized.loanProductOptions;

                            scope.loanOfficerOptions =
                                normalized.loanOfficerOptions;

                            scope.rescheduleReasonOptions =
                                normalized.rescheduleReasonOptions;

                            scope.overdueChargeHandlingOptions =
                                normalized.overdueChargeHandlingOptions;

                            scope.availableCarryForwardCharges =
                                normalized.availableCarryForwardCharges;

                            scope.adjustFuturePayments =
                                normalized.adjustFuturePayments;

                            scope.validationRules =
                                normalized.validationRules;

                            scope.permissions =
                                normalized.userPermissions;

                            scope.canApprove =
                                scope.permissions.canApprove !== false;

                            scope.requiresApproval =
                                scope.validationRules
                                    .requiresApproval !== false;

                            scope.newInterestRateMinValue =
                                scope.validationRules
                                    .newInterestRateMinValue;

                            scope.newInterestRateMaxValue =
                                scope.validationRules
                                    .newInterestRateMaxValue;

                            scope.formData.filters.officeId =
                                normalized.selectedOfficeId;

                            scope.state.loadingTemplate = false;

                            if (scope.executionId) {
                                loadPreview(
                                    scope.executionId,
                                    true
                                );
                            }
                        },
                        function (response) {
                            scope.state.loadingTemplate = false;
                            setApiError(response);
                        }
                    );
            };

            var resetWorkflow = function () {
                scope.previewData = null;
                scope.execution = null;

                scope.executionId =
                    routeParams.executionId || null;

                scope.step =
                    scope.state.step =
                        routeParams.executionId ? 2 : 1;

                scope.previewQuery.page = 1;
                scope.previewQuery.total = 0;
                scope.previewQuery.hasMore = false;

                clearApiError();
            };

            scope.formData = {
                filters: {
                    officeId: null,
                    loanStatus: null,
                    currentInterestRate: null,
                    loanProductIds: [],
                    loanOfficerIds: [],
                    excludedLoans: []
                },

                reschedulingDetails: {
                    installmentStrategy: 'NEXT_UNPAID',
                    rescheduleReasonId: null,
                    submittedOnDate: new Date(),
                    rescheduleReasonComment: '',
                    repaymentEvery: null,
                    repaymentFrequencyType: null,
                    preserveLoanTermDuration: false,
                    changeRepaymentDate: false,
                    adjustedDueDate: null,
                    introduceGracePeriods: false,
                    graceOnPrincipal: null,
                    graceOnInterest: null,
                    extendRepaymentPeriod: false,
                    extraTerms: null,
                    adjustInterestRates: false,
                    newInterestRate: null,
                    changeEMI: false,
                    endDate: null,
                    emi: null,
                    changeFixedPrincipal: false,
                    newPrincipalDueFixedAmount: null,
                    changeFixedPrincipalPercentagePerInstallment: false,
                    newFixedPrincipalPercentagePerInstallment: null,
                    overdueChargeHandling: null,
                    carryForwardChargeId: null,
                    carryForwardChargeDueDate: null
                },

                newInterestRate: null
            };

            scope.officeOptions = [];
            scope.officeRoots = [];
            scope.templateData = {};
            scope.loanStatusOptions = [];

            scope.installmentStrategyOptions =
                normalizeStrategyOptionList([
                    {
                        code: 'FIRST_INSTALLMENT',
                        value: 'First Installment Date'
                    },
                    {
                        code: 'NEXT_UNPAID',
                        value: 'Next Unpaid Installment Date'
                    }
                ]);

            scope.repaymentFrequencyTypeOptions =
                fallbackRepaymentFrequencyTypeOptions.slice();

            scope.currentInterestRateOptions = [];
            scope.loanProductOptions = [];
            scope.loanOfficerOptions = [];
            scope.rescheduleReasonOptions = [];

            scope.overdueChargeHandlingOptions =
                normalizeOptionList([
                    {
                        value: 'NONE',
                        name: 'No changes'
                    },
                    {
                        value: 'CARRY_FORWARD',
                        name: 'Carry Charges Forward'
                    }
                ]);

            scope.availableCarryForwardCharges = [];

            scope.state = {
                step: routeParams.executionId ? 2 : 1,
                loadingTemplate: false,
                loadingPreview: false
            };

            scope.previewData = null;
            scope.execution = null;
            scope.executionId =
                routeParams.executionId || null;

            scope.step = scope.state.step;
            scope.validation = {};

            scope.loanSearch = {
                term: ''
            };

            scope.errorStatus = '';
            scope.errorDetails = [];

            scope.stepLabels = [
                'Filters',
                'Preview'
            ];

            scope.selectOffice = function (office) {
                if (!office) {
                    return;
                }

                scope.formData.filters.officeId =
                    office.id;

                scope.formData.filters.loanProductIds = [];
                scope.formData.filters.loanOfficerIds = [];
                scope.formData.filters.excludedLoans = [];

                scope.loanSearch.term = '';

                resetWorkflow();
                loadTemplateData(office.id);
            };

            scope.addExcludedLoan = function (loan) {
                if (!loan || !loan.id) {
                    return;
                }

                if (!_.some(
                    scope.formData.filters.excludedLoans,
                    function (item) {
                        return item.id === loan.id;
                    }
                )) {
                    scope.formData.filters.excludedLoans.push(
                        loan
                    );
                }

                scope.loanSearch.term = '';
            };

            scope.removeExcludedLoan = function (index) {
                scope.formData.filters.excludedLoans.splice(
                    index,
                    1
                );
            };

            scope.excludedLoanOptions = function (value) {
                var deferred = $q.defer();

                if (!value || value.length < 2) {
                    deferred.resolve([]);
                    return deferred.promise;
                }

                resourceFactory.loanResource.getAllLoans(
                    {
                        limit: 10,
                        sqlSearch: value
                    },
                    function (data) {
                        deferred.resolve(
                            (
                                data &&
                                data.pageItems
                            ) ?
                                data.pageItems :
                                []
                        );
                    }
                );

                return deferred.promise;
            };

            scope.validateFilters = function () {
                scope.validation = {};

                if (!scope.formData.filters.officeId) {
                    scope.validation.officeId = true;
                }

                return _.isEmpty(scope.validation);
            };

            scope.validateDetails = function () {
                scope.validation =
                    scope.validation || {};

                if (
                    !scope.formData.reschedulingDetails
                        .installmentStrategy
                ) {
                    scope.validation.installmentStrategy =
                        true;
                }

                if (
                    scope.formData.newInterestRate === null ||
                    scope.formData.newInterestRate === undefined ||
                    scope.formData.newInterestRate === ''
                ) {
                    scope.validation.newInterestRate = true;
                } else if (
                    scope.validationRules &&
                    scope.validationRules.newInterestRateMinValue !==
                    undefined &&
                    normalizeNumber(
                        scope.formData.newInterestRate
                    ) <
                    scope.validationRules
                        .newInterestRateMinValue
                ) {
                    scope.validation.newInterestRate = true;
                    scope.validation.newInterestRateRange = true;
                } else if (
                    scope.validationRules &&
                    scope.validationRules.newInterestRateMaxValue !==
                    undefined &&
                    normalizeNumber(
                        scope.formData.newInterestRate
                    ) >
                    scope.validationRules
                        .newInterestRateMaxValue
                ) {
                    scope.validation.newInterestRate = true;
                    scope.validation.newInterestRateRange = true;
                }

                return _.isEmpty(scope.validation);
            };

            scope.runPreview = function () {
                if (
                    !scope.validateFilters() ||
                    !scope.validateDetails()
                ) {
                    return;
                }

                clearApiError();
                scope.state.loadingPreview = true;

                resourceFactory.bulkLoanRescheduleResource
                    .preview(
                        buildPreviewPayload(),
                        function (data) {
                            var normalized =
                                normalizeExecution(data);

                            if (!normalized.id) {
                                scope.state.loadingPreview = false;

                                setApiError({
                                    data: {
                                        defaultUserMessage:
                                            'The bulk reschedule preview did not return an executionId.'
                                    }
                                });

                                return;
                            }

                            scope.executionId =
                                normalized.id;

                            scope.execution =
                                normalized;

                            scope.previewQuery.page = 1;

                            scope.previewQuery.total =
                                normalized.loanResults.length;

                            scope.previewQuery.hasMore = false;

                            loadPreview(
                                scope.executionId,
                                true
                            );
                        },
                        function (response) {
                            scope.state.loadingPreview = false;
                            setApiError(response);
                        }
                    );
            };

            scope.previousPreviewPage = function () {
                if (
                    scope.previewQuery.page <= 1 ||
                    scope.state.loadingPreview
                ) {
                    return;
                }

                scope.previewQuery.page -= 1;

                loadPreview(
                    scope.executionId,
                    false
                );
            };

            scope.nextPreviewPage = function () {
                if (
                    !scope.previewQuery.hasMore ||
                    scope.state.loadingPreview
                ) {
                    return;
                }

                scope.previewQuery.page += 1;

                loadPreview(
                    scope.executionId,
                    false
                );
            };

            scope.openExecution = function (execution) {
                var executionId =
                    execution &&
                    (
                        execution.id ||
                        execution.executionId ||
                        execution.resourceId
                    );

                if (!executionId) {
                    return;
                }

                location.path(
                    '/bulkreschedule/' +
                    executionId
                );
            };

            scope.backToWorkflow = function () {
                location.path(
                    '/bulkreschedule'
                );
            };

            scope.previewQuery = {
                page: 1,
                pageSize: defaultLimit,
                total: 0,
                hasMore: false
            };

            scope.previewPageLoans = function () {
                return (
                    scope.previewData &&
                    scope.previewData.loanResults
                )
                    ?
                    scope.previewData.loanResults
                    :
                    [];
            };

            scope.previewStart = function () {
                if (!scope.previewQuery.total) {
                    return 0;
                }

                return (
                    (
                        scope.previewQuery.page - 1
                    ) *
                    scope.previewQuery.pageSize
                ) + 1;
            };

            scope.previewEnd = function () {
                return Math.min(
                    scope.previewQuery.page *
                    scope.previewQuery.pageSize,
                    scope.previewQuery.total
                );
            };

            loadTemplateData(
                routeParams.officeId || 1
            );
        }
    });

    mifosX.ng.application.controller(
        'BulkLoanRescheduleController',
        [
            '$scope',
            'ResourceFactory',
            '$routeParams',
            '$location',
            'dateFilter',
            '$q',
            mifosX.controllers.BulkLoanRescheduleController
        ]
    ).run(function ($log) {
        $log.info(
            "BulkLoanRescheduleController initialized"
        );
    });
}(mifosX.controllers || {}));
