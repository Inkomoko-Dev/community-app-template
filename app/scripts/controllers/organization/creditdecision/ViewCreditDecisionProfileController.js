(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewCreditDecisionProfileController: function (scope, resourceFactory, routeParams, location, $uibModal, $translate, $timeout) {
            var profileId = routeParams.profileId;
            var TABS = ['data', 'policy', 'scope', 'test', 'versions', 'history'];
            var Policy = CreditDecisionPolicy;

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
            scope.policyRules = [];
            scope.policyGroups = [];
            scope.countries = [];
            scope.polSel = Policy.id(Policy.GLOBAL, Policy.EVERYONE);
            scope.polScopes = [];
            scope.polCurrent = null;
            scope.history = [];

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
                scope.edit = {
                    params: angular.copy(scope.version.params),
                    productIds: angular.copy(scope.version.productIds),
                    policy: Policy.fromRules(scope.version.rules)
                };
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
                loadHistory();
                var wanted = keepVersionNo || (scope.open && scope.open.versionNo) || (scope.active && scope.active.versionNo) || profile.versions[0].versionNo;
                select(wanted);
            }

            function loadHistory() {
                resourceFactory.creditDecisionHistoryResource.getAll({profileId: profileId}, function (rows) {
                    scope.history = rows;
                });
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
            resourceFactory.creditDecisionPolicyResource.get(function (data) {
                scope.policyRules = data.rules;
                scope.countries = data.countries;
                scope.policyGroups = _.map(_.uniq(_.pluck(data.rules, 'group')), function (name) {
                    return {name: name, rules: _.where(data.rules, {group: name})};
                });
                refresh();
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
                scope.policyCheck = Policy.validate(scope.edit.policy, scope.policyRules, scope.edit.productIds, currencyOf);
                scope.canSubmit = scope.validation.ok && scope.policyCheck.ok;
                scope.polScopes = policyScopes();
                scope.polCurrent = _.find(scope.polScopes, function (item) {
                    return item.id === scope.polSel;
                }) || scope.polScopes[0];
                scope.polSel = scope.polCurrent.id;
            }

            function currencyOf(productId) {
                var p = scope.productsById[productId];
                return p ? p.currencyCode : null;
            }

            // Everyone, then each country a cap can be set for, then each product this version covers.
            function policyScopes() {
                var list = [{id: Policy.id(Policy.GLOBAL, Policy.EVERYONE), scope: Policy.GLOBAL, scopeKey: Policy.EVERYONE}];
                _.each(scope.countries, function (c) {
                    list.push({id: Policy.id(Policy.COUNTRY, c.currency), scope: Policy.COUNTRY, scopeKey: c.currency, name: c.name});
                });
                _.each(scope.edit.productIds, function (productId) {
                    list.push({id: Policy.id(Policy.PRODUCT, String(productId)), scope: Policy.PRODUCT, scopeKey: String(productId), name: scope.productName(productId), currency: currencyOf(productId)});
                });
                _.each(list, function (item) {
                    item.count = Policy.overrideCount(scope.edit.policy, item.scope, item.scopeKey);
                });
                return list;
            }

            scope.polInherited = function (def) {
                var item = scope.polCurrent;
                if (!item || item.scope === Policy.GLOBAL) {
                    return '';
                }
                var inh = Policy.inherited(scope.edit.policy, item.scope, item.scopeKey, def.key, item.currency);
                return inh ? String(inh.value) : '';
            };

            scope.polInheritedFrom = function (def) {
                var item = scope.polCurrent;
                var inh = item && item.scope !== Policy.GLOBAL ? Policy.inherited(scope.edit.policy, item.scope, item.scopeKey, def.key, item.currency) : null;
                return inh ? $translate.instant('label.creditdecision.policy.from.' + inh.from, {key: inh.scopeKey}) : '';
            };

            scope.polValues = function () {
                var id = scope.polCurrent.id;
                scope.edit.policy[id] = scope.edit.policy[id] || {};
                return scope.edit.policy[id];
            };

            scope.polError = function (def) {
                var code = scope.policyCheck && scope.policyCheck.errors[scope.polCurrent.id + '|' + def.key];
                return code ? $translate.instant('label.creditdecision.policy.error.' + code) : '';
            };

            scope.polRequired = function (def) {
                return scope.polCurrent.scope === Policy.GLOBAL && scope.policyCheck && scope.policyCheck.errors['required|' + def.key] ?
                    $translate.instant('label.creditdecision.policy.error.required') : '';
            };

            scope.polScopeProblem = function () {
                var errors = (scope.policyCheck && scope.policyCheck.errors) || {};
                var id = scope.polCurrent.id;
                var code = errors['weights|' + id] || errors['order|' + id] || errors['product|' + id];
                return code ? $translate.instant('label.creditdecision.policy.error.' + code) : '';
            };

            scope.polWeights = function () {
                return Policy.weightSum(scope.polValues());
            };

            scope.policyProblemCount = function () {
                return scope.policyCheck ? Object.keys(scope.policyCheck.errors).length : 0;
            };

            scope.policyProblems = function () {
                var out = [];
                _.each((scope.policyCheck && scope.policyCheck.errors) || {}, function (code, where) {
                    var kind = where.split('|')[0];
                    var name = '';
                    if (kind === 'weights' || kind === 'order' || kind === 'product') {
                        var item = _.find(scope.polScopes, {id: where.slice(kind.length + 1)});
                        name = item ? scope.polScopeName(item) + ': ' : '';
                    } else if (kind === 'effective') {
                        name = scope.productName(where.split('|')[1]) + ': ';
                    } else if (kind === 'required') {
                        name = scope.ruleLabel(where.split('|')[1]) + ': ';
                    } else {
                        var parts = where.split('|');
                        var scopeItem = _.find(scope.polScopes, {id: parts[0] + '|' + parts[1]});
                        name = (scopeItem ? scope.polScopeName(scopeItem) + ' · ' : '') + scope.ruleLabel(parts[2]) + ': ';
                    }
                    out.push(name + $translate.instant('label.creditdecision.policy.error.' + code));
                });
                return out;
            };

            scope.polScopeName = function (item) {
                return item.scope === Policy.GLOBAL ? $translate.instant('label.creditdecision.policy.scope.everyone') :
                    item.scope === Policy.COUNTRY ? item.scopeKey + ' · ' + item.name : item.name;
            };

            scope.ruleLabel = function (key) {
                var def = Policy.defOf(scope.policyRules, key);
                return def ? def.label : key;
            };

            scope.$watch('edit', refresh, true);
            scope.$watch('polSel', refresh);
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

            function ruleWhere(c) {
                if (c.scope === Policy.GLOBAL) {
                    return $translate.instant('label.creditdecision.policy.scope.everyone');
                }
                return c.scope === Policy.COUNTRY ? c.scopeKey : scope.productName(c.scopeKey);
            }

            function changeText(c) {
                var name = c.kind === 'product' ? scope.productName(c.key) : scope.itemLabel(c.key);
                var args = {name: name, from: c.from, to: c.to};
                if (c.kind === 'policy') {
                    args.from = policyLabel(c.from);
                    args.to = policyLabel(c.to);
                }
                if (c.kind === 'rule') {
                    args = {name: scope.ruleLabel(c.key) + ' (' + ruleWhere(c) + ')', from: c.from, to: c.to};
                    return $translate.instant('label.creditdecision.diff.rule.' + c.type, args);
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
                if (base) {
                    changes = changes.concat(_.map(Policy.diff(base.rules, version.rules), function (d) {
                        return _.extend({kind: 'rule'}, d);
                    }));
                }
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
                api().saveDraft({profileId: profileId, versionNo: no}, {
                    params: scope.edit.params,
                    productIds: scope.edit.productIds,
                    rules: Policy.toRules(scope.edit.policy, scope.policyRules)
                }, function (data) {
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
                if (!scope.canSubmit) {
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

            function takeMode(data, noticeKey) {
                _.each(['mode', 'modeChangedBy', 'modeChangedOn', 'pendingMode', 'pendingBy', 'pendingOn'], function (field) {
                    scope.profile[field] = data[field];
                });
                loadHistory();
                notify(noticeKey);
            }

            // Off and Shadow apply at once. Live is asked for here and a second authorised person approves it.
            scope.setMode = function (mode) {
                if (mode === scope.profile.mode && !scope.profile.pendingMode) {
                    return;
                }
                resourceFactory.creditDecisionModeResource.update({profileId: profileId}, {mode: mode}, function (data) {
                    takeMode(data, data.pendingMode ? 'label.creditdecision.notice.liverequested' : 'label.creditdecision.notice.mode');
                });
            };

            scope.approveMode = function () {
                resourceFactory.creditDecisionModeResource.command({profileId: profileId, command: 'approve'}, {}, function (data) {
                    takeMode(data, 'label.creditdecision.notice.livenow');
                });
            };

            scope.cancelMode = function () {
                resourceFactory.creditDecisionModeResource.command({profileId: profileId, command: 'cancel'}, {}, function (data) {
                    takeMode(data, 'label.creditdecision.notice.livecancelled');
                });
            };

            // ---- history ----------------------------------------------------------------------------------

            scope.fieldText = function (field) {
                if (!field) {
                    return '';
                }
                var parts = field.split('.');
                if (parts[0] === 'rule' && parts.length >= 4) {
                    var where = parts[1] === Policy.GLOBAL ? $translate.instant('label.creditdecision.policy.scope.everyone') :
                        parts[1] === Policy.COUNTRY ? parts[2] : scope.productName(parts[2]);
                    return scope.ruleLabel(parts[3]) + ' (' + where + ')';
                }
                if (parts[0] === 'param' && parts.length === 3) {
                    return scope.itemLabel(parts[1]) + ' · ' + $translate.instant('label.creditdecision.history.field.' + parts[2]);
                }
                if (field === 'products') {
                    return $translate.instant('label.creditdecision.history.field.products');
                }
                return $translate.instant('label.creditdecision.history.field.' + field) === 'label.creditdecision.history.field.' + field ?
                    field : $translate.instant('label.creditdecision.history.field.' + field);
            };

            scope.valueText = function (field, value) {
                if (value === null || value === undefined) {
                    return '';
                }
                if (field === 'products') {
                    return _.map(String(value).split(', '), function (id) {
                        return scope.productName(+id);
                    }).join(', ');
                }
                return value;
            };
        }
    });
    mifosX.ng.application.controller('ViewCreditDecisionProfileController', ['$scope', 'ResourceFactory', '$routeParams', '$location', '$uibModal', '$translate', '$timeout', mifosX.controllers.ViewCreditDecisionProfileController]).run(function ($log) {
        $log.info('ViewCreditDecisionProfileController initialized');
    });
}(mifosX.controllers || {}));
