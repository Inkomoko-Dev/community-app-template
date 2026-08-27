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

    mifosX.controllers = _.extend(module, {
        HistoricalPenaltyWaiverController: function (scope, routeParams, resourceFactory, location, dateFilter) {

            scope.loanId = routeParams.loanId;
            scope.chargeId = routeParams.chargeId;
            scope.step = 'input';
            scope.isSubmitting = false;
            scope.isPreviewing = false;
            scope.previewFailed = false;
            scope.dateFormat = 'dd MMMM yyyy';
            scope.dateOptions = { formatYear: 'yy', startingDay: 1 };
            scope.charge = null;
            scope.preview = null;
            scope.maxWaiverAmount = null;

            var previewSequence = 0;

            scope.formData = {
                waiverAmount: null,
                waiverEffectiveDate: null,
                reason: '',
                nextApproverUserId: null
            };

            resourceFactory.loanChargesResource.get({ loanId: scope.loanId, chargeId: scope.chargeId }, function (data) {
                scope.charge = data;
                // Default to waiving the whole penalty; the reviewer can reduce it before previewing.
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
                // Each preview replays the whole loan server-side, so only the newest response may win.
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
                }, function () {
                    if (sequence !== previewSequence) {
                        return;
                    }
                    scope.isPreviewing = false;
                    scope.previewFailed = true;
                });
            };

            scope.review = function () {
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
                    scope.step = 'preview';
                }, function () {
                    if (sequence !== previewSequence) {
                        return;
                    }
                    scope.isPreviewing = false;
                    scope.previewFailed = true;
                });
            };

            scope.back = function () {
                scope.step = 'input';
            };

            scope.canSubmit = function () {
                return scope.preview && scope.preview.correctionAllowed && !scope.isSubmitting
                    && scope.isAmountValid()
                    && !!scope.formData.reason
                    && (!scope.preview.requiresApproval || !!scope.formData.nextApproverUserId);
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
                    // Optimistic lock: the server rejects the request if the penalty has moved since the preview.
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
        ['$scope', '$routeParams', 'ResourceFactory', '$location', 'dateFilter', mifosX.controllers.HistoricalPenaltyWaiverController])
        .run(function ($log) {
            $log.info('HistoricalPenaltyWaiverController initialized');
        });
}(mifosX.controllers || {}));
