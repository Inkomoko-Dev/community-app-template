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

            // Helper function to get field name for API
            function getFieldName(num) {
                var names = ['One', 'Two', 'Three', 'Four', 'Five'];
                // For levels 1-5, use text names; for 6+, use numeric
                return num <= 5 ? names[num - 1] : num.toString();
            }

            resourceFactory.getAllApprovalMatrixEngineResource.getAll({}, function (data) {
                scope.matrixDetails = data;
            });
            scope.routeTo=function(id)
            {
                location.path('/viewLoanApprovalMatrixDetailsDynamic/'+ id);
            }

        }
    });
    mifosX.ng.application.controller('ViewLoanApprovalMatrixController', ['$scope', 'ResourceFactory', '$location','WizardHandler', '$translate','$routeParams', mifosX.controllers.ViewLoanApprovalMatrixController]).run(function ($log) {
        $log.info("ViewLoanApprovalMatrixController initialized");
    });
}(mifosX.controllers || {}));
