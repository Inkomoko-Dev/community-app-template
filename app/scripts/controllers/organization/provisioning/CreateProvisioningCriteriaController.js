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

    var idsMatch = function (left, right) {
        return left !== null && angular.isDefined(left) && right !== null && angular.isDefined(right) && left.toString() === right.toString();
    };

    var normalizeCategoryId = function (definition, categories) {
        angular.forEach(categories, function (category) {
            if (idsMatch(category.id, definition.categoryId)) {
                definition.categoryId = category.id;
            }
        });
    };

    var applyCategoryMetadata = function (definition, categories) {
        normalizeCategoryId(definition, categories);
        definition.categoryName = null;
        definition.categoryCode = null;
        definition.displayOrder = null;
        definition.categoryActive = null;
        angular.forEach(categories, function (category) {
            if (idsMatch(category.id, definition.categoryId)) {
                definition.categoryName = category.categoryName;
                definition.categoryCode = category.categoryCode;
                definition.displayOrder = category.displayOrder;
                definition.categoryActive = category.active;
            }
        });
    };

    var parseOptionalInteger = function (value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        return parseInt(value, 10);
    };

    var buildDefinitionPayload = function (definitions, categories) {
        var payload = [];
        angular.forEach(definitions, function (definition) {
            applyCategoryMetadata(definition, categories);
            payload.push({
                categoryId: definition.categoryId,
                minAge: parseOptionalInteger(definition.minAge),
                maxAge: parseOptionalInteger(definition.maxAge),
                provisioningPercentage: definition.provisioningPercentage,
                liabilityAccount: definition.liabilityAccount,
                expenseAccount: definition.expenseAccount
            });
        });
        return payload;
    };

    mifosX.controllers = _.extend(module, {
        CreateProvisioningCriteriaController: function (scope, resourceFactory, location, dateFilter, translate) {
            scope.available = [];
            scope.selected = [];
            scope.selectedloanproducts = [];
            scope.template = [];
            scope.formData = {};
            scope.translate = translate;
            scope.categories = [];
            scope.definitions = [];

            scope.addLoanProduct = function () {
                angular.forEach(scope.available, function (loanProductId) {
                    for (var i = 0; i < scope.allloanproducts.length; i++) {
                        if (idsMatch(scope.allloanproducts[i].id, loanProductId)) {
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
                        if (idsMatch(scope.selectedloanproducts[i].id, loanProductId)) {
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
                var currentCategoryId = currentDefinition ? currentDefinition.categoryId : null;
                return scope.categories.filter(function (category) {
                    var selectedInOtherRow = scope.definitions.some(function (definition, index) {
                        return index !== rowIndex && idsMatch(definition.categoryId, category.id);
                    });
                    if (selectedInOtherRow) {
                        return false;
                    }
                    return category.active !== false || idsMatch(currentCategoryId, category.id);
                });
            };

            scope.canAddDefinition = function () {
                return scope.categories.some(function (category) {
                    if (category.active === false) {
                        return false;
                    }
                    return !scope.definitions.some(function (definition) {
                        return idsMatch(definition.categoryId, category.id);
                    });
                });
            };

            scope.addDefinition = function () {
                var nextDefinition = {
                    categoryId: null,
                    minAge: scope.definitions.length === 0 ? 0 : null,
                    maxAge: null,
                    provisioningPercentage: null,
                    liabilityAccount: null,
                    expenseAccount: null
                };

                if (scope.definitions.length > 0) {
                    var previousDefinition = scope.definitions[scope.definitions.length - 1];
                    if (previousDefinition.maxAge !== null && previousDefinition.maxAge !== undefined && previousDefinition.maxAge !== '') {
                        nextDefinition.minAge = parseInt(previousDefinition.maxAge, 10) + 1;
                    }
                }

                angular.forEach(scope.categories, function (category) {
                    if (nextDefinition.categoryId || category.active === false) {
                        return;
                    }
                    var alreadyUsed = scope.definitions.some(function (definition) {
                        return idsMatch(definition.categoryId, category.id);
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
                    if (angular.isDefined(previousMaxAge) && previousMaxAge !== null && previousMaxAge !== '') {
                        scope.definitions[index].minAge = parseInt(previousMaxAge, 10) + 1;
                    }
                }
            };

            scope.onMaxAgeChanged = function (index) {
                if (index >= scope.definitions.length - 1) {
                    return;
                }
                var maxAge = scope.definitions[index].maxAge;
                if (maxAge !== null && maxAge !== undefined && maxAge !== '') {
                    scope.definitions[index + 1].minAge = parseInt(maxAge, 10) + 1;
                }
            };

            scope.submit = function () {
                var payload = angular.copy(scope.formData);
                var provisioningDateFormat = scope.df || 'dd MMMM yyyy';
                payload.locale = scope.optlang.code;
                payload.loanProducts = scope.selectedloanproducts;
                payload.definitions = buildDefinitionPayload(scope.definitions, scope.categories);
                if (payload.effectiveFrom) {
                    payload.dateFormat = provisioningDateFormat;
                    payload.effectiveFrom = dateFilter(payload.effectiveFrom, provisioningDateFormat);
                }
                resourceFactory.provisioningcriteria.post(payload, function (data) {
                    location.path('/viewprovisioningcriteria/' + data.resourceId);
                });
            };

            resourceFactory.provisioningcriteria.template({ criteriaId: 'template' }, function (data) {
                scope.template = data;
                scope.categories = sortCategories(data.categories);
                scope.allloanproducts = (data.loanProducts || []).slice(0);
                scope.liabilityaccounts = filterAccountsByType(data.glAccounts, 'accountType.liability');
                scope.expenseaccounts = filterAccountsByType(data.glAccounts, 'accountType.expense');
                var templateDefs = data.definitions;
                if (angular.isArray(templateDefs) && templateDefs.length > 0) {
                    angular.forEach(templateDefs, function (definition) {
                        var row = angular.copy(definition);
                        if (row.maxAge === null || row.maxAge === undefined) {
                            row.maxAge = null;
                        }
                        if (!angular.isDefined(row.minAge) || row.minAge === null) {
                            row.minAge = '';
                        }
                        applyCategoryMetadata(row, scope.categories);
                        scope.definitions.push(row);
                    });
                }
                if (!scope.definitions.length && scope.categories.length) {
                    scope.addDefinition();
                }
            });
        }
    });
    mifosX.ng.application.controller('CreateProvisioningCriteriaController', ['$scope', 'ResourceFactory', '$location', 'dateFilter', '$translate', mifosX.controllers.CreateProvisioningCriteriaController]).run(function ($log) {
        $log.info('CreateProvisioningCriteriaController initialized');
    });
}(mifosX.controllers || {}));
