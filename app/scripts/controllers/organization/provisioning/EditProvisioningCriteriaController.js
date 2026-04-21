(function (module) {
    var sortCategories = function (categories) {
        return (categories || []).slice(0).sort(function (left, right) {
            var leftOrder = angular.isDefined(left.displayOrder) && left.displayOrder !== null ? left.displayOrder : 0;
            var rightOrder = angular.isDefined(right.displayOrder) && right.displayOrder !== null ? right.displayOrder : 0;
            if (leftOrder !== rightOrder) {
                return leftOrder - rightOrder;
            }
            return (left.categoryName || '').localeCompare(right.categoryName || '');
        });
    };

    var filterAccountsByType = function (accounts, typeCode) {
        return (accounts || []).filter(function (account) {
            return account.type && account.type.code === typeCode;
        });
    };

    var applyCategoryMetadata = function (definition, categories) {
        definition.categoryName = null;
        definition.categoryCode = null;
        definition.displayOrder = null;
        definition.categoryActive = null;
        angular.forEach(categories, function (category) {
            if (category.id === definition.categoryId) {
                definition.categoryName = category.categoryName;
                definition.categoryCode = category.categoryCode;
                definition.displayOrder = category.displayOrder;
                definition.categoryActive = category.active;
            }
        });
    };

    var buildDefinitionPayload = function (definitions, categories) {
        var payload = [];
        angular.forEach(definitions, function (definition) {
            applyCategoryMetadata(definition, categories);
            payload.push({
                categoryId: definition.categoryId,
                minAge: angular.isDefined(definition.minAge) && definition.minAge !== '' ? parseInt(definition.minAge, 10) : null,
                maxAge: angular.isDefined(definition.maxAge) && definition.maxAge !== '' ? parseInt(definition.maxAge, 10) : null,
                provisioningPercentage: definition.provisioningPercentage,
                liabilityAccount: definition.liabilityAccount,
                expenseAccount: definition.expenseAccount
            });
        });
        return payload;
    };

    mifosX.controllers = _.extend(module, {
        EditProvisioningCriteriaController: function (scope, resourceFactory, routeParams, location, dateFilter, translate) {
            scope.available = [];
            scope.selected = [];
            scope.template = [];
            scope.formData = {};
            scope.translate = translate;
            scope.categories = [];
            scope.definitions = [];
            scope.originalDefinitionsSnapshot = '[]';

            scope.addLoanProduct = function () {
                angular.forEach(scope.available, function (loanProductId) {
                    for (var i = 0; i < scope.allloanproducts.length; i++) {
                        if (scope.allloanproducts[i].id === loanProductId) {
                            scope.selectedloanproducts.push(scope.allloanproducts[i]);
                            scope.allloanproducts.splice(i, 1);
                            break;
                        }
                    }
                });
                scope.available = [];
            };

            scope.removeLoanProduct = function () {
                angular.forEach(scope.selected, function (loanProductId) {
                    for (var i = 0; i < scope.selectedloanproducts.length; i++) {
                        if (scope.selectedloanproducts[i].id === loanProductId) {
                            scope.allloanproducts.push(scope.selectedloanproducts[i]);
                            scope.selectedloanproducts.splice(i, 1);
                            break;
                        }
                    }
                });
                scope.selected = [];
            };

            scope.availableCategoriesForRow = function (rowIndex) {
                var currentDefinition = scope.definitions[rowIndex];
                return scope.categories.filter(function (category) {
                    var selectedInOtherRow = scope.definitions.some(function (definition, index) {
                        return index !== rowIndex && definition.categoryId === category.id;
                    });
                    if (selectedInOtherRow) {
                        return false;
                    }
                    return category.active !== false || currentDefinition.categoryId === category.id;
                });
            };

            scope.canAddDefinition = function () {
                return scope.categories.some(function (category) {
                    if (category.active === false) {
                        return false;
                    }
                    return !scope.definitions.some(function (definition) {
                        return definition.categoryId === category.id;
                    });
                });
            };

            scope.addDefinition = function () {
                var nextDefinition = {
                    categoryId: null,
                    minAge: scope.definitions.length === 0 ? 0 : null,
                    maxAge: '',
                    provisioningPercentage: null,
                    liabilityAccount: null,
                    expenseAccount: null
                };

                if (scope.definitions.length > 0) {
                    var previousDefinition = scope.definitions[scope.definitions.length - 1];
                    if (angular.isDefined(previousDefinition.maxAge) && previousDefinition.maxAge !== '') {
                        nextDefinition.minAge = parseInt(previousDefinition.maxAge, 10) + 1;
                    }
                }

                angular.forEach(scope.categories, function (category) {
                    if (nextDefinition.categoryId || category.active === false) {
                        return;
                    }
                    var alreadyUsed = scope.definitions.some(function (definition) {
                        return definition.categoryId === category.id;
                    });
                    if (!alreadyUsed) {
                        nextDefinition.categoryId = category.id;
                    }
                });

                applyCategoryMetadata(nextDefinition, scope.categories);
                scope.definitions.push(nextDefinition);
            };

            scope.removeDefinition = function (index) {
                if (scope.definitions.length === 1) {
                    return;
                }
                scope.definitions.splice(index, 1);
                if (scope.definitions.length > 0 && (scope.definitions[0].minAge === null || scope.definitions[0].minAge === '')) {
                    scope.definitions[0].minAge = 0;
                }
            };

            scope.isLastDefinition = function (index) {
                return index === scope.definitions.length - 1;
            };

            scope.onCategoryChanged = function (definition) {
                applyCategoryMetadata(definition, scope.categories);
            };

            scope.doFocus = function (index) {
                if (index > 0 && !scope.definitions[index].minAge) {
                    var previousMaxAge = scope.definitions[index - 1].maxAge;
                    if (angular.isDefined(previousMaxAge) && previousMaxAge !== '') {
                        scope.definitions[index].minAge = parseInt(previousMaxAge, 10) + 1;
                    }
                }
            };

            scope.onMaxAgeChanged = function (index) {
                if (index >= scope.definitions.length - 1) {
                    return;
                }
                if (angular.isDefined(scope.definitions[index].maxAge) && scope.definitions[index].maxAge !== '') {
                    scope.definitions[index + 1].minAge = parseInt(scope.definitions[index].maxAge, 10) + 1;
                }
            };

            scope.submit = function () {
                var provisioningDateFormat = scope.df || 'dd MMMM yyyy';
                var payload = {
                    locale: scope.optlang.code,
                    criteriaName: scope.formData.criteriaName,
                    loanProducts: scope.selectedloanproducts
                };
                var definitionsPayload = buildDefinitionPayload(scope.definitions, scope.categories);
                if (angular.toJson(definitionsPayload) !== scope.originalDefinitionsSnapshot) {
                    payload.definitions = definitionsPayload;
                    if (scope.formData.effectiveFrom) {
                        payload.dateFormat = provisioningDateFormat;
                        payload.effectiveFrom = dateFilter(scope.formData.effectiveFrom, provisioningDateFormat);
                    }
                }

                resourceFactory.provisioningcriteria.put({ criteriaId: routeParams.criteriaId }, payload, function (data) {
                    location.path('/viewprovisioningcriteria/' + data.resourceId);
                });
            };

            resourceFactory.provisioningcriteria.get({ criteriaId: routeParams.criteriaId, template: 'true' }, function (data) {
                scope.template = data;
                scope.categories = sortCategories(data.categories);
                scope.selectedloanproducts = data.selectedLoanProducts || [];
                scope.allloanproducts = data.loanProducts || [];
                scope.liabilityaccounts = filterAccountsByType(data.glAccounts, 'accountType.liability');
                scope.expenseaccounts = filterAccountsByType(data.glAccounts, 'accountType.expense');
                scope.formData.criteriaName = data.criteriaName;
                scope.criteriaId = data.criteriaId;
                scope.versionNo = data.versionNo;
                scope.currentEffectiveFrom = data.effectiveFrom;

                angular.forEach((data.definitions || []).slice(0).sort(function (left, right) {
                    var leftOrder = angular.isDefined(left.displayOrder) && left.displayOrder !== null ? left.displayOrder : 0;
                    var rightOrder = angular.isDefined(right.displayOrder) && right.displayOrder !== null ? right.displayOrder : 0;
                    if (leftOrder !== rightOrder) {
                        return leftOrder - rightOrder;
                    }
                    return left.minAge - right.minAge;
                }), function (definition, index) {
                    var normalized = angular.copy(definition);
                    if (normalized.maxAge === null) {
                        normalized.maxAge = '';
                    }
                    if (!angular.isDefined(normalized.minAge) || normalized.minAge === null) {
                        normalized.minAge = index === 0 ? 0 : null;
                    }
                    applyCategoryMetadata(normalized, scope.categories);
                    scope.definitions.push(normalized);
                });

                if (!scope.definitions.length && scope.categories.length) {
                    scope.addDefinition();
                }

                scope.originalDefinitionsSnapshot = angular.toJson(buildDefinitionPayload(scope.definitions, scope.categories));
            });
        }
    });
    mifosX.ng.application.controller('EditProvisioningCriteriaController', ['$scope', 'ResourceFactory', '$routeParams', '$location', 'dateFilter', '$translate', mifosX.controllers.EditProvisioningCriteriaController]).run(function ($log) {
        $log.info('EditProvisioningCriteriaController initialized');
    });
}(mifosX.controllers || {}));
