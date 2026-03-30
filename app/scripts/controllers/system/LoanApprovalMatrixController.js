(function (module) {
    mifosX.controllers = _.extend(module, {
        LoanApprovalMatrixController: function (scope, resourceFactory, location ,WizardHandler, translate, routeParams) {
            scope.formData = {};
            scope.showOrHideValue = "show";
            scope.matrixDetails = {};
            scope.decisionLevels = [];
            scope.loanTypes = ['UnsecuredFirstCycle', 'UnsecuredSecondCycle', 'SecuredFirstCycle', 'SecuredSecondCycle'];

            // Initialize with default 5 levels, but this can be configured
            scope.numberOfLevels = 5;
            scope.levelNames = ['One', 'Two', 'Three', 'Four', 'Five'];

            resourceFactory.getApprovalMatrixEngineTemplateResource.get({}, function (data) {
                scope.matrixDetails = data;
                scope.formData.currency = scope.matrixDetails.currencyOptions[0].code;

                // Check if template has active IC review levels (NEW backend format)
                if (data.activeIcReviewLevels && data.activeIcReviewLevels.length > 0) {
                    scope.numberOfLevels = data.activeIcReviewLevels.length;
                    scope.levelNames = data.activeIcReviewLevels.map(function(level) {
                        return scope.getLevelName(level.levelNumber);
                    });
                }
                // Fallback to old format for backward compatibility
                else if (data.configuredLevels && data.configuredLevels.length > 0) {
                    scope.numberOfLevels = data.configuredLevels.length;
                    scope.levelNames = data.configuredLevels;
                }

                // Initialize decision levels array
                scope.initializeDecisionLevels();
            });

            // Initialize decision levels structure
            scope.initializeDecisionLevels = function() {
                scope.decisionLevels = [];
                for (var i = 0; i < scope.numberOfLevels; i++) {
                    var levelNumber = i + 1;
                    var levelName = scope.getLevelName(levelNumber);
                    // Use word names for all levels (One, Two, ..., Ten)
                    var fieldName = levelName;
                    scope.decisionLevels.push({
                        index: i,
                        name: levelName,
                        fieldName: fieldName,
                        displayName: 'Decision Level ' + levelName,
                        levelNumber: levelNumber
                    });
                }
            };

            // Add new level
            scope.addNewLevel = function() {
                var newLevelNumber = scope.numberOfLevels + 1;
                var levelName = scope.getLevelName(newLevelNumber);
                // Use word names for all levels (One, Two, ..., Ten)
                var fieldName = levelName;

                scope.numberOfLevels++;
                scope.levelNames.push(levelName);
                scope.decisionLevels.push({
                    index: scope.numberOfLevels - 1,
                    name: levelName,
                    fieldName: fieldName,
                    displayName: 'Decision Level ' + levelName,
                    levelNumber: newLevelNumber
                });
            };

            // Remove level
            scope.removeLevel = function(index) {
                if (scope.numberOfLevels > 1) {
                    scope.decisionLevels.splice(index, 1);
                    scope.levelNames.splice(index, 1);
                    scope.numberOfLevels--;

                    // Re-index remaining levels
                    for (var i = 0; i < scope.decisionLevels.length; i++) {
                        scope.decisionLevels[i].index = i;
                    }
                }
            };

            // Get level name based on number
            scope.getLevelName = function(num) {
                var names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                return names[num - 1] || 'Level' + num;
            };

            scope.$watch('formData',function(newVal){
                scope.matrixDetails = angular.extend(scope.matrixDetails,newVal);
            },true);

            scope.formValue = function(array,model,findattr,retAttr){
                findattr = findattr ? findattr : 'id';
                retAttr = retAttr ? retAttr : 'value';
                console.log(findattr,retAttr,model);
                return _.find(array, function (obj) {
                   return obj[findattr] === model;
                })[retAttr];
            };

            scope.goNext = function(form){
                WizardHandler.wizard().checkValid(form);
                scope.isClicked = true;
            };

            // Handle next navigation for dynamic level forms
            scope.goNextLevel = function($event) {
                // Get the form from the event target
                var form = $event.target;
                if (form && form.checkValidity && form.checkValidity()) {
                    WizardHandler.wizard().next();
                } else {
                    // Trigger HTML5 validation display
                    if (form && form.reportValidity) {
                        form.reportValidity();
                    }
                }
                scope.isClicked = true;
            };

            // Validate level form before allowing step exit (for wizard step clicks)
            scope.validateLevelForm = function(levelIndex) {
                // Allow navigation - validation will be done on form submit
                return true;
            };

            scope.cancel = function () {
                location.path('/viewLoanApprovalMatrixDynamic/');
            };

            // Get preview data for a specific level and loan type
            scope.getPreviewData = function(level, loanType) {
                var prefix = 'level' + level.fieldName;
                var suffix = loanType;

                return {
                    maxAmount: scope.formData[prefix + suffix + 'MaxAmount'] || 0,
                    minTerm: scope.formData[prefix + suffix + 'MinTerm'] || 0,
                    maxTerm: scope.formData[prefix + suffix + 'MaxTerm'] || 0
                };
            };

            // Check if any data has been entered for preview
            scope.hasPreviewData = function() {
                return scope.decisionLevels && scope.decisionLevels.length > 0;
            };

            scope.submit = function () {
                this.formData.locale = scope.optlang.code;
                this.formData.numberOfLevels = scope.numberOfLevels;
                this.formData.levelNames = scope.levelNames;

                resourceFactory.addApprovalMatrixEngineResource.save(this.formData, function (data) {
                    location.path('/viewLoanApprovalMatrixDynamic/');
                });
            };


        }
    });
    mifosX.ng.application.controller('LoanApprovalMatrixController', ['$scope', 'ResourceFactory', '$location','WizardHandler', '$translate','$routeParams', mifosX.controllers.LoanApprovalMatrixController]).run(function ($log) {
        $log.info("LoanApprovalMatrixController initialized");
    });
}(mifosX.controllers || {}));
