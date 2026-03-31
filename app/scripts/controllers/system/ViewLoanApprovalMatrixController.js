(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewLoanApprovalMatrixController: function (scope, resourceFactory, location ,WizardHandler, translate, routeParams) {
             scope.matrixDetails = [];
             scope.configurations = [];
             scope.decisionLevels = [];

            resourceFactory.getApprovalMatrixEngineTemplateResource.get({}, function (data) {
                scope.configurations = data;

                // Get active IC review levels from template (NEW backend format)
                if (data.activeIcReviewLevels && data.activeIcReviewLevels.length > 0) {
                    scope.decisionLevels = data.activeIcReviewLevels.map(function(level, index) {
                        var levelName = getLevelName(level.levelNumber);
                        var fieldName = getFieldName(level.levelNumber);
                        return {
                            index: index,
                            name: levelName,
                            fieldName: fieldName,
                            displayName: 'Level ' + levelName,
                            levelNumber: level.levelNumber
                        };
                    });
                }
                // Fallback to old format for backward compatibility
                else if (data.configuredLevels && data.configuredLevels.length > 0) {
                    scope.decisionLevels = data.configuredLevels.map(function(levelName, index) {
                        var levelNum = index + 1;
                        var fieldName = getFieldName(levelNum);
                        return {
                            index: index,
                            name: levelName,
                            fieldName: fieldName,
                            displayName: 'Level ' + levelName,
                            levelNumber: levelNum
                        };
                    });
                } else {
                    // Default to 5 levels
                    var defaultLevels = ['One', 'Two', 'Three', 'Four', 'Five'];
                    scope.decisionLevels = defaultLevels.map(function(levelName, index) {
                        var levelNum = index + 1;
                        var fieldName = getFieldName(levelNum);
                        return {
                            index: index,
                            name: levelName,
                            fieldName: fieldName,
                            displayName: 'Level ' + levelName,
                            levelNumber: levelNum
                        };
                    });
                }
            });

            // Helper function to get level name
            function getLevelName(num) {
                var names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                return names[num - 1] || 'Level' + num;
            }

            // Helper function to get field name for API - uses word names for all levels
            function getFieldName(num) {
                var names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                return names[num - 1] || num.toString();
            }

            resourceFactory.getAllApprovalMatrixEngineResource.getAll({}, function (data) {
                // Process each matrix to populate dynamic level data in flat format
                scope.matrixDetails = data.map(function(matrix) {
                    // If matrix has dynamicLevels, populate flat format fields
                    if (matrix.dynamicLevels && matrix.dynamicLevels.length > 0) {
                        matrix.dynamicLevels.forEach(function(level) {
                            var fieldName = getFieldName(level.levelNumber);
                            var prefix = 'level' + fieldName;

                            matrix[prefix + 'UnsecuredFirstCycleMaxAmount'] = level.unsecuredFirstCycleMaxAmount;
                            matrix[prefix + 'UnsecuredFirstCycleMinTerm'] = level.unsecuredFirstCycleMinTerm;
                            matrix[prefix + 'UnsecuredFirstCycleMaxTerm'] = level.unsecuredFirstCycleMaxTerm;
                            matrix[prefix + 'UnsecuredSecondCycleMaxAmount'] = level.unsecuredSecondCycleMaxAmount;
                            matrix[prefix + 'UnsecuredSecondCycleMinTerm'] = level.unsecuredSecondCycleMinTerm;
                            matrix[prefix + 'UnsecuredSecondCycleMaxTerm'] = level.unsecuredSecondCycleMaxTerm;
                            matrix[prefix + 'SecuredFirstCycleMaxAmount'] = level.securedFirstCycleMaxAmount;
                            matrix[prefix + 'SecuredFirstCycleMinTerm'] = level.securedFirstCycleMinTerm;
                            matrix[prefix + 'SecuredFirstCycleMaxTerm'] = level.securedFirstCycleMaxTerm;
                            matrix[prefix + 'SecuredSecondCycleMaxAmount'] = level.securedSecondCycleMaxAmount;
                            matrix[prefix + 'SecuredSecondCycleMinTerm'] = level.securedSecondCycleMinTerm;
                            matrix[prefix + 'SecuredSecondCycleMaxTerm'] = level.securedSecondCycleMaxTerm;
                        });

                        // Update decisionLevels based on the first matrix's dynamicLevels if not already set from template
                        if (scope.decisionLevels.length === 0 || scope.decisionLevels.length < matrix.dynamicLevels.length) {
                            scope.decisionLevels = matrix.dynamicLevels.map(function(level, index) {
                                var levelName = getLevelName(level.levelNumber);
                                var fieldName = getFieldName(level.levelNumber);
                                return {
                                    index: index,
                                    name: levelName,
                                    fieldName: fieldName,
                                    displayName: 'Level ' + levelName,
                                    levelNumber: level.levelNumber
                                };
                            });
                        }
                    }
                    return matrix;
                });
            });
            scope.routeTo=function(id)
            {
                location.path('/viewLoanApprovalMatrixDetailsDynamic/'+ id);
            };

        }
    });
    mifosX.ng.application.controller('ViewLoanApprovalMatrixController', ['$scope', 'ResourceFactory', '$location','WizardHandler', '$translate','$routeParams', mifosX.controllers.ViewLoanApprovalMatrixController]).run(function ($log) {
        $log.info("ViewLoanApprovalMatrixController initialized");
    });
}(mifosX.controllers || {}));
