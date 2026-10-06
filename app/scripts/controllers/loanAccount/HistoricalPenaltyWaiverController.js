/* global mifosX, _ */
(function (module) {
    'use strict';
    function normalizeDate(value) {
        if (!value) {
            return null;
        }
        if (angular.isDate(value)) {
            return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        }
        if (angular.isArray(value) && value.length >= 3) {
            return new Date(value[0], value[1] - 1, value[2]);
        }
        if (typeof value === 'string') {
            var dateParts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (dateParts) {
                return new Date(Number(dateParts[1]), Number(dateParts[2]) - 1, Number(dateParts[3]));
            }
        }
        var parsedDate = new Date(value);
        if (isNaN(parsedDate.getTime())) {
            return null;
        }
        return new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
    }

    function sameDay(a, b) {
        var left = normalizeDate(a);
        var right = normalizeDate(b);
        return !!left && !!right && left.getTime() === right.getTime();
    }

    var CHANGE_TYPE_KEYS = { UNCHANGED: 'unchanged', REVERSED_AND_REPLACED: 'reallocated', NEW: 'new' };

    mifosX.controllers = _.extend(module, {
        HistoricalPenaltyWaiverController: function (scope, routeParams, resourceFactory, location, dateFilter, numberFilter, translate) {

            scope.loanId = routeParams.loanId;
            scope.chargeId = routeParams.chargeId;
            scope.isSubmitting = false;
            scope.isPreviewing = false;
            scope.previewFailed = false;
            scope.dateFormat = 'dd MMMM yyyy';
            scope.dateOptions = { formatYear: 'yy', startingDay: 1 };
            scope.loan = null;
            scope.officeName = null;
            scope.currencyCode = '';
            scope.charge = null;
            scope.preview = null;
            scope.maxWaiverAmount = null;
            scope.showTransactions = true;
            scope.txnFilter = { showUnchanged: false };

            var previewSequence = 0;

            scope.formData = {
                waiverAmount: null,
                waiverEffectiveDate: null,
                reason: '',
                nextApproverUserId: null
            };

            resourceFactory.LoanAccountResource.getLoanAccountDetails({ loanId: scope.loanId }, function (data) {
                scope.loan = data;
                scope.officeName = data.officeName || data.clientOfficeName || null;
                if (data.currency) {
                    scope.currencyCode = data.currency.code;
                }
            });

            resourceFactory.loanChargesResource.get({ loanId: scope.loanId, chargeId: scope.chargeId }, function (data) {
                scope.charge = data;
                if (data.currency && !scope.currencyCode) {
                    scope.currencyCode = data.currency.code;
                }
                scope.maxWaiverAmount = Number(data.amountPaid || 0) + Number(data.amountOutstanding || 0);
                scope.formData.waiverAmount = scope.maxWaiverAmount;
                scope.loadPreview();
            });

            scope.isAmountValid = function () {
                var amount = Number(scope.formData.waiverAmount);
                if (!isFinite(amount) || amount <= 0) {
                    return false;
                }
                return scope.maxWaiverAmount === null || amount <= scope.maxWaiverAmount;
            };

            scope.isPartial = function () {
                return scope.maxWaiverAmount !== null && Number(scope.formData.waiverAmount) < scope.maxWaiverAmount;
            };

            scope.remainingPaid = function () {
                return scope.maxWaiverAmount - Number(scope.formData.waiverAmount);
            };

            scope.useFullAmount = function () {
                scope.formData.waiverAmount = scope.maxWaiverAmount;
                scope.loadPreview();
            };

            scope.hasAge = function () {
                return !!scope.preview && scope.preview.chargeAgeInDays !== null && scope.preview.chargeAgeInDays !== undefined;
            };

            scope.isSuggestedDate = function () {
                return !!scope.preview && sameDay(scope.formData.waiverEffectiveDate, scope.preview.suggestedEffectiveDate);
            };

            scope.useSuggestedDate = function () {
                scope.formData.waiverEffectiveDate = normalizeDate(scope.preview.suggestedEffectiveDate);
            };

            function previewParams() {
                var params = { loanId: scope.loanId, chargeId: scope.chargeId, locale: 'en', dateFormat: scope.dateFormat };
                if (scope.formData.waiverAmount) {
                    params.waiverAmount = scope.formData.waiverAmount;
                }
                var effectiveDate = normalizeDate(scope.formData.waiverEffectiveDate);
                if (effectiveDate) {
                    params.waiverEffectiveDate = dateFilter(effectiveDate, scope.dateFormat);
                }
                return params;
            }

            scope.loadPreview = function () {
                if (!scope.isAmountValid()) {
                    return;
                }
                var sequence = ++previewSequence;
                scope.isPreviewing = true;
                scope.previewFailed = false;
                resourceFactory.historicalPenaltyWaiverPreviewResource.get(previewParams(), function (data) {
                    if (sequence !== previewSequence) {
                        return;
                    }
                    scope.preview = data;
                    scope.isPreviewing = false;
                    if (!scope.formData.waiverEffectiveDate && data.suggestedEffectiveDate) {
                        scope.formData.waiverEffectiveDate = normalizeDate(data.suggestedEffectiveDate);
                    }
                    if (scope.formData.nextApproverUserId && !scope.selectedApprover()) {
                        scope.formData.nextApproverUserId = null;
                    }
                }, function () {
                    if (sequence !== previewSequence) {
                        return;
                    }
                    scope.isPreviewing = false;
                    scope.previewFailed = true;
                });
            };

            scope.$watch('formData.waiverEffectiveDate', function (newValue, oldValue) {
                if (newValue === oldValue || !newValue || !scope.preview) {
                    return;
                }
                if (sameDay(newValue, scope.preview.waiverEffectiveDate)) {
                    return;
                }
                scope.loadPreview();
            });

            scope.approvalReasons = function () {
                var preview = scope.preview;
                if (!preview || !preview.requiresApproval) {
                    return [];
                }
                var reasons = [];
                var trigger = preview.approvalTrigger;
                if (trigger === 'AGE' || trigger === 'BOTH') {
                    reasons.push(preview.approvalAgeThresholdDays
                        ? translate.instant('label.hpw.trigger.age.limit', { days: preview.chargeAgeInDays, limit: preview.approvalAgeThresholdDays })
                        : translate.instant('label.hpw.trigger.age', { days: preview.chargeAgeInDays }));
                }
                if (trigger === 'AMOUNT' || trigger === 'BOTH') {
                    reasons.push(preview.approvalAmountThreshold
                        ? translate.instant('label.hpw.trigger.amount.limit', { limit: numberFilter(preview.approvalAmountThreshold, 2) + ' ' + scope.currencyCode })
                        : translate.instant('label.hpw.trigger.amount'));
                }
                return reasons;
            };

            function fullName(user) {
                var name = [user.firstname, user.lastname].filter(Boolean).join(' ');
                return name || user.username;
            }

            function roleNames(user) {
                return _.pluck(user.selectedRoles || [], 'name').join(', ');
            }

            scope.approverLabel = function (user) {
                var roles = roleNames(user);
                return roles ? fullName(user) + ' — ' + roles : fullName(user);
            };

            scope.approverDetail = function (user) {
                return [roleNames(user), user.officeName].filter(Boolean).join(' · ');
            };

            scope.selectedApprover = function () {
                if (!scope.preview || !scope.formData.nextApproverUserId) {
                    return null;
                }
                return _.find(scope.preview.approverOptions || [], function (user) {
                    return user.id === scope.formData.nextApproverUserId;
                }) || null;
            };

            scope.heldUntilName = function () {
                var approver = scope.selectedApprover();
                return approver ? fullName(approver) : translate.instant('label.hpw.anapprover');
            };

            scope.isBlocked = function () {
                return !!scope.preview && scope.preview.requiresApproval && (scope.preview.approverOptions || []).length === 0;
            };

            scope.balanceReduction = function () {
                if (!scope.preview) {
                    return 0;
                }
                return Number(scope.preview.totalOutstandingBefore || 0) - Number(scope.preview.totalOutstandingAfter || 0);
            };

            scope.paidAfter = function () {
                return Number(scope.preview.chargeAmountPaidBefore || 0) - Number(scope.preview.waiverAmount || 0);
            };

            scope.changedTransactions = function () {
                return _.filter(scope.preview ? scope.preview.transactions || [] : [], function (txn) {
                    return txn.changeType !== 'UNCHANGED';
                });
            };

            scope.unchangedCount = function () {
                return (scope.preview ? scope.preview.transactions || [] : []).length - scope.changedTransactions().length;
            };

            scope.visibleTransactions = function () {
                return scope.txnFilter.showUnchanged ? scope.preview.transactions : scope.changedTransactions();
            };

            scope.toggleTransactions = function () {
                scope.showTransactions = !scope.showTransactions;
            };

            scope.changeTypeKey = function (txn) {
                return CHANGE_TYPE_KEYS[txn.changeType] || 'unchanged';
            };

            scope.differs = function (txn, component) {
                return txn.changeType !== 'NEW' && Number(txn[component + 'After']) !== Number(txn[component + 'Before']);
            };

            scope.canSubmit = function () {
                return !!scope.preview && scope.preview.correctionAllowed && !scope.isSubmitting && !scope.isPreviewing
                    && !scope.previewFailed
                    && scope.isAmountValid()
                    && !!scope.formData.reason
                    && !!scope.formData.waiverEffectiveDate
                    && (!scope.preview.requiresApproval || !!scope.selectedApprover());
            };

            scope.submit = function () {
                if (!scope.canSubmit()) {
                    return;
                }
                scope.isSubmitting = true;

                var effectiveDate = normalizeDate(scope.formData.waiverEffectiveDate);
                var payload = {
                    locale: 'en',
                    dateFormat: scope.dateFormat,
                    waiverEffectiveDate: dateFilter(effectiveDate, scope.dateFormat),
                    expectedPaidAmount: scope.preview.chargeAmountPaidBefore,
                    reason: scope.formData.reason
                };
                if (scope.preview.partialWaiver) {
                    payload.waiverAmount = scope.formData.waiverAmount;
                }
                if (scope.preview.requiresApproval) {
                    payload.nextApproverUserId = scope.formData.nextApproverUserId;
                }

                resourceFactory.loanChargesResource.historicalWaive({ loanId: scope.loanId, chargeId: scope.chargeId }, payload,
                    function () {
                        location.path('/viewloanaccount/' + scope.loanId);
                    }, function () {
                        scope.isSubmitting = false;
                    });
            };

            scope.cancel = function () {
                location.path('/viewloanaccount/' + scope.loanId);
            };
        }
    });
    mifosX.ng.application.controller('HistoricalPenaltyWaiverController',
        ['$scope', '$routeParams', 'ResourceFactory', '$location', 'dateFilter', 'numberFilter', '$translate',
            mifosX.controllers.HistoricalPenaltyWaiverController])
        .run(function ($log) {
            $log.info('HistoricalPenaltyWaiverController initialized');
        });
}(mifosX.controllers || {}));
