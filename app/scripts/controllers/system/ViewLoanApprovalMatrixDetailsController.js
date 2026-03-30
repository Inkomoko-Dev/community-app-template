(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewLoanApprovalMatrixDetailsController: function (scope, resourceFactory, location ,WizardHandler, translate, routeParams) {
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
                            displayName: 'Decision Level ' + levelName,
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
                            displayName: 'Decision Level ' + levelName,
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
                            displayName: 'Decision Level ' + levelName,
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

            resourceFactory.getAllApprovalMatrixDetailsEngineResource.get({approvalMatrixId: routeParams.approvalMatrixId}, function (data) {
                scope.matrixDetails = data;

                // If matrix has approval matrix levels (NEW backend format)
                if (data.approvalMatrixLevels && data.approvalMatrixLevels.length > 0) {
                    scope.decisionLevels = data.approvalMatrixLevels.map(function(level, index) {
                        var levelName = getLevelName(level.levelNumber);
                        var fieldName = getFieldName(level.levelNumber);
                        return {
                            index: index,
                            name: levelName,
                            fieldName: fieldName,
                            displayName: 'Decision Level ' + levelName,
                            levelNumber: level.levelNumber
                        };
                    });
                }
                // Fallback: If matrix has its own level configuration (old format)
                else if (data.numberOfLevels && data.levelNames) {
                    scope.decisionLevels = data.levelNames.map(function(levelName, index) {
                        var levelNum = index + 1;
                        var fieldName = getFieldName(levelNum);
                        return {
                            index: index,
                            name: levelName,
                            fieldName: fieldName,
                            displayName: 'Decision Level ' + levelName,
                            levelNumber: levelNum
                        };
                    });
                }
            });

            scope.deleteLoanApprovalMatrix = function () {
                resourceFactory.deleteApprovalMatrixDetailsEngineResource.delete({approvalMatrixId:routeParams.approvalMatrixId},function (data) {
                location.path('/viewLoanApprovalMatrixDynamic/');
            });

            };

        }
    });
    mifosX.ng.application.controller('ViewLoanApprovalMatrixDetailsController', ['$scope', 'ResourceFactory', '$location','WizardHandler', '$translate','$routeParams', mifosX.controllers.ViewLoanApprovalMatrixDetailsController]).run(function ($log) {
        $log.info("ViewLoanApprovalMatrixDetailsController initialized");
    });
}(mifosX.controllers || {}));
