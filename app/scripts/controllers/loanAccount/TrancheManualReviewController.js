(function (module) {
    mifosX.controllers = _.extend(module, {
        TrancheManualReviewController: function (scope, resourceFactory, routeParams, location, $translate, $window) {
            var reviewStorageKey = 'trancheManualReviewReschedule';

            scope.loanId = routeParams.id;
            scope.formData = {
                decision: null,
                extensionDays: 14,
                reason: '',
                note: ''
            };
            scope.saving = false;
            scope.error = '';

            resourceFactory.loanResource.get({ loanId: scope.loanId }, function (data) {
                scope.loan = data;
            });
            resourceFactory.trancheMilestoneResource.get({ loanKey: scope.loanId }, function (data) {
                scope.milestone = data;
            });

            scope.cancel = function () {
                location.path('/viewloanaccount/' + scope.loanId).search('fromReview', null);
            };

            function trimmed(value) {
                return value === undefined || value === null ? '' : String(value).trim();
            }

            function fail(key) {
                scope.saving = false;
                scope.error = $translate.instant(key);
            }

            scope.submit = function () {
                if (scope.saving) {
                    return;
                }
                scope.error = '';
                var note = trimmed(scope.formData.note);
                var decision = scope.formData.decision;
                if (!decision) {
                    fail('validation.msg.tranche.review.decision.required');
                    return;
                }
                if (!note) {
                    fail('validation.msg.tranche.review.note.required');
                    return;
                }

                if (decision === 'EXTEND') {
                    var days = parseInt(scope.formData.extensionDays, 10);
                    if (isNaN(days) || days < 1 || days > 3660) {
                        fail('validation.msg.tranche.review.extension.days');
                        return;
                    }
                    scope.saving = true;
                    resourceFactory.trancheMilestoneExceptionResource.save({ loanKey: scope.loanId }, {
                        note: note,
                        extensionDays: days
                    }, function () {
                        scope.saving = false;
                        location.path('/viewloanaccount/' + scope.loanId);
                    }, function () {
                        scope.saving = false;
                    });
                    return;
                }

                if (decision === 'CANCEL') {
                    var reason = trimmed(scope.formData.reason);
                    if (!reason) {
                        fail('validation.msg.tranche.review.reason.required');
                        return;
                    }
                    scope.saving = true;
                    resourceFactory.trancheMilestoneCancelResource.save({ loanKey: scope.loanId }, {
                        note: note,
                        reason: reason
                    }, function () {
                        scope.saving = false;
                        location.path('/viewloanaccount/' + scope.loanId);
                    }, function () {
                        scope.saving = false;
                    });
                    return;
                }

                scope.saving = true;
                resourceFactory.loanResource.save({ loanId: scope.loanId, resourceType: 'notes' }, {
                    note: 'Manual review decision: RESCHEDULE. ' + note
                }, function () {
                    $window.sessionStorage.setItem(reviewStorageKey, JSON.stringify({
                        loanId: String(scope.loanId),
                        note: note
                    }));
                    scope.saving = false;
                    location.path('/loans/' + scope.loanId + '/reschedule').search('fromReview', '1');
                }, function () {
                    scope.saving = false;
                });
            };
        }
    });
    mifosX.ng.application.controller('TrancheManualReviewController', ['$scope', 'ResourceFactory', '$routeParams', '$location', '$translate', '$window', mifosX.controllers.TrancheManualReviewController]).run(function ($log) {
        $log.info("TrancheManualReviewController initialized");
    });
}(mifosX.controllers || {}));
