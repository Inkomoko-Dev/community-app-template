(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewCreditDecisionProfileController: function (scope, resourceFactory, routeParams, location, $uibModal, $translate, $timeout) {
            var profileId = routeParams.profileId;
            var TABS = ['data', 'scope', 'test', 'versions'];

            scope.section = 'profiles';
            scope.tab = TABS.indexOf(location.search().tab) >= 0 ? location.search().tab : 'data';
            scope.samples = CreditDecisionRequest.SAMPLES;
            scope.picked = {sampleId: 0, q: '', pq: ''};
            scope.groups = [];
            scope.productGroups = [];
            scope.productsById = {};
            scope.policies = CreditDecisionRequest.POLICIES;
            scope.modes = ['OFF', 'SHADOW', 'LIVE'];
            scope.edit = {params: [], productIds: []};
            scope.paramMap = {};
            scope.dirty = false;
            scope.notice = null;

            // ---- loading ----------------------------------------------------------------------------------

            function byStatus(status) {
                return _.find(scope.profile.versions, function (v) {
                    return v.status === status;
                });
            }

            function loadProducts() {
                resourceFactory.creditDecisionProductsResource.getAll(function (products) {
                    scope.productGroups = CreditDecisionRequest.groupByCurrency(products);
                    scope.productsById = {};
                    _.each(products, function (p) {
                        scope.productsById[p.id] = p;
                    });
                    refreshChanges();
                });
            }

            function select(versionNo) {
                scope.version = _.find(scope.profile.versions, function (v) {
                    return v.versionNo === versionNo;
                }) || scope.profile.versions[0];
                scope.versionNo = scope.version.versionNo;
                scope.editable = scope.version.status === 'DRAFT';
                scope.edit = {params: angular.copy(scope.version.params), productIds: angular.copy(scope.version.productIds)};
                scope.paramMap = {};
                _.each(scope.edit.params, function (p) {
                    scope.paramMap[p.key] = p;
                });
                scope.dirty = false;
            }

            function setProfile(profile, keepVersionNo) {
                scope.profile = profile;
                scope.active = byStatus('ACTIVE');
                scope.pending = byStatus('PENDING');
                scope.draft = byStatus('DRAFT');
                scope.open = scope.pending || scope.draft;
                refreshChanges();
                var wanted = keepVersionNo || (scope.open && scope.open.versionNo) || (scope.active && scope.active.versionNo) || profile.versions[0].versionNo;
                select(wanted);
            }

            function load(keepVersionNo) {
                resourceFactory.creditDecisionProfileResource.get({profileId: profileId}, function (data) {
                    setProfile(data, keepVersionNo);
                });
            }

            resourceFactory.creditDecisionCatalogueResource.getAll(function (groups) {
                scope.groups = groups;
                refreshChanges();
            });
            loadProducts();
            load();

            function applied(data, versionNo, noticeKey) {
                setProfile(data, versionNo);
                loadProducts();
                notify(noticeKey);
            }

            function notify(key) {
                scope.notice = key ? $translate.instant(key) : null;
                if (key) {
                    $timeout(function () {
                        scope.notice = null;
                    }, 3500);
                }
            }

            // ---- tabs and version picker ------------------------------------------------------------------

            // The tab is kept in the scope, not the URL, so switching tabs never reloads the page and loses unsaved edits.
            scope.go = function (tab) {
                scope.tab = tab;
            };

            scope.pickVersion = function (versionNo) {
                select(+versionNo);
            };

            scope.viewVersion = function (versionNo) {
                select(versionNo);
                scope.go('data');
            };

            // ---- what is sent -----------------------------------------------------------------------------

            scope.markDirty = function () {
                scope.dirty = true;
            };

            scope.itemVisible = function (group, item) {
                var q = (scope.picked.q || '').trim().toLowerCase();
                return !q || (item.label + ' ' + item.description + ' ' + group.name).toLowerCase().indexOf(q) >= 0;
            };

            scope.groupVisible = function (group) {
                return _.some(group.items, function (item) {
                    return scope.itemVisible(group, item);
                });
            };

            scope.enabledIn = function (group) {
                return _.filter(group.items, function (item) {
                    return scope.paramMap[item.key] && scope.paramMap[item.key].enabled;
                }).length;
            };

            scope.sentCount = function () {
                return CreditDecisionRequest.sentCount(scope.edit.params);
            };

            // ---- which products ---------------------------------------------------------------------------

            scope.hasProduct = function (product) {
                return scope.edit.productIds.indexOf(product.id) >= 0;
            };

            scope.usedElsewhere = function (product) {
                return !!product.claimedByProfileId && product.claimedByProfileId !== scope.profile.id;
            };

            scope.toggleProduct = function (product) {
                if (!scope.editable || scope.usedElsewhere(product)) {
                    return;
                }
                var at = scope.edit.productIds.indexOf(product.id);
                if (at < 0) {
                    scope.edit.productIds.push(product.id);
                } else {
                    scope.edit.productIds.splice(at, 1);
                }
                scope.dirty = true;
            };

            scope.productsIn = function (group) {
                return _.filter(group.products, scope.hasProduct).length;
            };

            scope.productName = function (id) {
                var p = scope.productsById[id];
                return p ? p.name + ' (' + p.currencyCode + ')' : '#' + id;
            };

            scope.productsSummary = function (ids) {
                return _.map(ids, scope.productName).join(', ');
            };

            // ---- request preview --------------------------------------------------------------------------

            function refresh() {
                if (!scope.version) {
                    return;
                }
                var sample = scope.samples[scope.picked.sampleId] || scope.samples[0];
                scope.built = CreditDecisionRequest.build(scope.edit.params, sample, scope.profile.name + ' v' + scope.version.versionNo);
                scope.previewJson = JSON.stringify(scope.built.payload, null, 2);
                scope.validation = CreditDecisionRequest.validate(scope.edit.params, scope.edit.productIds);
            }

            scope.$watch('edit', refresh, true);
            scope.$watch('picked.sampleId', refresh);
            scope.$watch('version', refresh);

            scope.itemLabel = function (key) {
                var found = null;
                _.each(scope.groups, function (g) {
                    _.each(g.items, function (item) {
                        if (item.key === key) {
                            found = item.label;
                        }
                    });
                });
                return found || key;
            };

            scope.fieldError = function (key) {
                return scope.validation && scope.validation.errors[key];
            };

            // ---- changes, for the person approving --------------------------------------------------------

            function policyLabel(policy) {
                return $translate.instant('label.creditdecision.policy.' + policy);
            }

            function changeText(c) {
                var name = c.kind === 'product' ? scope.productName(c.key) : scope.itemLabel(c.key);
                var args = {name: name, from: c.from, to: c.to};
                if (c.kind === 'policy') {
                    args.from = policyLabel(c.from);
                    args.to = policyLabel(c.to);
                }
                return $translate.instant('label.creditdecision.diff.' + c.kind + (c.kind === 'product' || c.kind === 'param' ? c.type : ''), args);
            }

            // Computed once per load, never inside a template expression, so the list keeps a stable identity between digests.
            function refreshChanges() {
                scope.pendingChanges = scope.profile && scope.pending ? scope.changesFor(scope.pending) : null;
            }

            scope.sentCountOf = function (version) {
                return CreditDecisionRequest.sentCount(version.params);
            };

            scope.changesFor = function (version) {
                var base = scope.active && scope.active.versionNo !== version.versionNo ? scope.active : null;
                var changes = base ? CreditDecisionRequest.diff(base, version) : [];
                return {
                    base: base,
                    lines: _.map(changes, function (c) {
                        return {type: c.type, text: changeText(c)};
                    })
                };
            };

            // ---- actions ----------------------------------------------------------------------------------

            function api() {
                return resourceFactory.creditDecisionVersionResource;
            }

            function openModal(templateId, data, onOk) {
                $uibModal.open({
                    templateUrl: templateId,
                    controller: ['$scope', '$uibModalInstance', 'data', function ($scope, $uibModalInstance, modalData) {
                        $scope.data = modalData;
                        $scope.form = {reason: modalData.reason || ''};
                        $scope.attempted = false;
                        $scope.ok = function () {
                            $scope.attempted = true;
                            if (modalData.needsReason && !$scope.form.reason.trim()) {
                                return;
                            }
                            $uibModalInstance.close($scope.form.reason.trim());
                        };
                        $scope.cancel = function () {
                            $uibModalInstance.dismiss('cancel');
                        };
                    }],
                    resolve: {
                        data: function () {
                            return data;
                        }
                    }
                }).result.then(onOk, function () {
                });
            }

            function saveThen(next) {
                var no = scope.version.versionNo;
                api().saveDraft({profileId: profileId, versionNo: no}, {params: scope.edit.params, productIds: scope.edit.productIds}, function (data) {
                    setProfile(data, no);
                    loadProducts();
                    next(no);
                });
            }

            scope.saveDraft = function () {
                saveThen(function () {
                    notify('label.creditdecision.notice.saved');
                });
            };

            scope.newDraft = function (fromVersion) {
                api().newDraft({profileId: profileId}, fromVersion ? {fromVersion: fromVersion} : {}, function (data) {
                    applied(data, null, 'label.creditdecision.notice.draftcreated');
                    scope.go('data');
                });
            };

            scope.submit = function () {
                if (!scope.validation.ok) {
                    return;
                }
                saveThen(function (no) {
                    var changes = scope.changesFor(scope.version);
                    openModal('creditDecisionSubmit.html', {
                        versionNo: no,
                        changes: changes,
                        sentCount: scope.sentCount(),
                        productCount: scope.edit.productIds.length,
                        reason: scope.version.reason,
                        needsReason: true
                    }, function (reason) {
                        api().command({profileId: profileId, versionNo: no, command: 'submit'}, {reason: reason}, function (data) {
                            applied(data, no, 'label.creditdecision.notice.submitted');
                            scope.go('versions');
                        });
                    });
                });
            };

            scope.withdraw = function () {
                var no = scope.open.versionNo;
                api().command({profileId: profileId, versionNo: no, command: 'withdraw'}, {}, function (data) {
                    applied(data, no, 'label.creditdecision.notice.withdrawn');
                });
            };

            scope.approve = function () {
                var no = scope.pending.versionNo;
                openModal('creditDecisionApprove.html', {versionNo: no, changes: scope.changesFor(scope.pending), needsReason: false}, function () {
                    api().command({profileId: profileId, versionNo: no, command: 'approve'}, {}, function (data) {
                        applied(data, no, 'label.creditdecision.notice.approved');
                    });
                });
            };

            scope.reject = function () {
                var no = scope.pending.versionNo;
                openModal('creditDecisionReject.html', {versionNo: no, needsReason: true}, function (reason) {
                    api().command({profileId: profileId, versionNo: no, command: 'reject'}, {reason: reason}, function (data) {
                        applied(data, no, 'label.creditdecision.notice.rejected');
                    });
                });
            };

            scope.setMode = function (mode) {
                if (mode === scope.profile.mode) {
                    return;
                }
                resourceFactory.creditDecisionModeResource.update({profileId: profileId}, {mode: mode}, function (data) {
                    scope.profile.mode = data.mode;
                    notify('label.creditdecision.notice.mode');
                });
            };
        }
    });
    mifosX.ng.application.controller('ViewCreditDecisionProfileController', ['$scope', 'ResourceFactory', '$routeParams', '$location', '$uibModal', '$translate', '$timeout', mifosX.controllers.ViewCreditDecisionProfileController]).run(function ($log) {
        $log.info('ViewCreditDecisionProfileController initialized');
    });
}(mifosX.controllers || {}));
