(function (module) {
    mifosX.controllers = _.extend(module, {
        UpdateLoanApprovalMatrixController: function (scope, resourceFactory, location ,WizardHandler, translate, routeParams) {
            scope.formData = {};
            scope.showOrHideValue = "show";
            scope.matrixDetails = {};
            scope.decisionLevels = [];
            scope.numberOfLevels = 5;
            scope.levelNames = ['One', 'Two', 'Three', 'Four', 'Five'];
            scope.maxLevels = 10; // Maximum allowed levels

            // Get level name based on number (One, Two, Three, ..., Ten)
            scope.getLevelName = function(num) {
                var names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                return names[num - 1] || 'Level' + num;
            };

            // Get field name for API - uses word names for all levels (One, Two, ..., Ten)
            scope.getFieldName = function(levelNumber) {
                var names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                return names[levelNumber - 1] || levelNumber.toString();
            };

            // Initialize decision levels structure
            scope.initializeDecisionLevels = function() {
                scope.decisionLevels = [];
                for (var i = 0; i < scope.numberOfLevels; i++) {
                    var levelNumber = i + 1;
                    var levelName = scope.getLevelName(levelNumber);
                    var fieldName = scope.getFieldName(levelNumber);
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
                if (scope.numberOfLevels >= scope.maxLevels) {
                    return; // Don't add more than max levels
                }
                var newLevelNumber = scope.numberOfLevels + 1;
                var levelName = scope.getLevelName(newLevelNumber);
                var fieldName = scope.getFieldName(newLevelNumber);

                scope.numberOfLevels++;
                scope.levelNames.push(levelName);
                scope.decisionLevels.push({
                    index: scope.numberOfLevels - 1,
                    name: levelName,
                    fieldName: fieldName,
                    displayName: 'Decision Level ' + levelName,
                    levelNumber: newLevelNumber
                });

                // Initialize form data for the new level with default values
                var prefix = 'level' + fieldName;
                scope.formData[prefix + 'UnsecuredFirstCycleMaxAmount'] = 0;
                scope.formData[prefix + 'UnsecuredFirstCycleMinTerm'] = 1;
                scope.formData[prefix + 'UnsecuredFirstCycleMaxTerm'] = 12;
                scope.formData[prefix + 'UnsecuredSecondCycleMaxAmount'] = 0;
                scope.formData[prefix + 'UnsecuredSecondCycleMinTerm'] = 1;
                scope.formData[prefix + 'UnsecuredSecondCycleMaxTerm'] = 12;
                scope.formData[prefix + 'SecuredFirstCycleMaxAmount'] = 0;
                scope.formData[prefix + 'SecuredFirstCycleMinTerm'] = 1;
                scope.formData[prefix + 'SecuredFirstCycleMaxTerm'] = 12;
                scope.formData[prefix + 'SecuredSecondCycleMaxAmount'] = 0;
                scope.formData[prefix + 'SecuredSecondCycleMinTerm'] = 1;
                scope.formData[prefix + 'SecuredSecondCycleMaxTerm'] = 12;
            };

            // Remove level
            scope.removeLevel = function(index) {
                if (scope.numberOfLevels > 1) {
                    var levelToRemove = scope.decisionLevels[index];
                    var prefix = 'level' + levelToRemove.fieldName;

                    // Remove form data for this level
                    delete scope.formData[prefix + 'UnsecuredFirstCycleMaxAmount'];
                    delete scope.formData[prefix + 'UnsecuredFirstCycleMinTerm'];
                    delete scope.formData[prefix + 'UnsecuredFirstCycleMaxTerm'];
                    delete scope.formData[prefix + 'UnsecuredSecondCycleMaxAmount'];
                    delete scope.formData[prefix + 'UnsecuredSecondCycleMinTerm'];
                    delete scope.formData[prefix + 'UnsecuredSecondCycleMaxTerm'];
                    delete scope.formData[prefix + 'SecuredFirstCycleMaxAmount'];
                    delete scope.formData[prefix + 'SecuredFirstCycleMinTerm'];
                    delete scope.formData[prefix + 'SecuredFirstCycleMaxTerm'];
                    delete scope.formData[prefix + 'SecuredSecondCycleMaxAmount'];
                    delete scope.formData[prefix + 'SecuredSecondCycleMinTerm'];
                    delete scope.formData[prefix + 'SecuredSecondCycleMaxTerm'];

                    scope.decisionLevels.splice(index, 1);
                    scope.levelNames.splice(index, 1);
                    scope.numberOfLevels--;

                    // Re-index remaining levels
                    for (var i = 0; i < scope.decisionLevels.length; i++) {
                        scope.decisionLevels[i].index = i;
                    }
                }
            };

            // Load template data
            resourceFactory.getApprovalMatrixEngineTemplateResource.get({}, function (data) {
                scope.matrixDetails = data;
            });

            // Load existing matrix data
            resourceFactory.getAllApprovalMatrixDetailsEngineResource.get({approvalMatrixId: routeParams.approvalMatrixId}, function (data) {
                scope.formData.currency = data.currencyData.code;

                // Determine number of levels from existing data or backend config
                var detectedLevels = 5; // Default

                // Check for NEW backend format with dynamicLevels array
                if (data.dynamicLevels && data.dynamicLevels.length > 0) {
                    detectedLevels = data.dynamicLevels.length;
                }
                // Check for levels 6-10 data to detect additional levels (using word names)
                else {
                    var levelWords = ['Six', 'Seven', 'Eight', 'Nine', 'Ten'];
                    for (var lvl = 6; lvl <= 10; lvl++) {
                        var levelWord = levelWords[lvl - 6];
                        var checkField = 'level' + levelWord + 'UnsecuredFirstCycleMaxAmount';
                        if (data[checkField] !== undefined && data[checkField] !== null) {
                            detectedLevels = lvl;
                        }
                    }
                }

                scope.numberOfLevels = detectedLevels;
                scope.levelNames = [];
                for (var n = 1; n <= detectedLevels; n++) {
                    scope.levelNames.push(scope.getLevelName(n));
                }

                // Initialize decision levels
                scope.initializeDecisionLevels();

                // Populate form data for all detected levels
                if (data.dynamicLevels && data.dynamicLevels.length > 0) {
                    // Use dynamicLevels array (NEW backend format)
                    data.dynamicLevels.forEach(function(dynamicLevel) {
                        var levelNumber = dynamicLevel.levelNumber;
                        var fieldName = scope.getFieldName(levelNumber);
                        var prefix = 'level' + fieldName;

                        scope.formData[prefix + 'UnsecuredFirstCycleMaxAmount'] = dynamicLevel.unsecuredFirstCycleMaxAmount || 0;
                        scope.formData[prefix + 'UnsecuredFirstCycleMinTerm'] = dynamicLevel.unsecuredFirstCycleMinTerm || 1;
                        scope.formData[prefix + 'UnsecuredFirstCycleMaxTerm'] = dynamicLevel.unsecuredFirstCycleMaxTerm || 12;
                        scope.formData[prefix + 'UnsecuredSecondCycleMaxAmount'] = dynamicLevel.unsecuredSecondCycleMaxAmount || 0;
                        scope.formData[prefix + 'UnsecuredSecondCycleMinTerm'] = dynamicLevel.unsecuredSecondCycleMinTerm || 1;
                        scope.formData[prefix + 'UnsecuredSecondCycleMaxTerm'] = dynamicLevel.unsecuredSecondCycleMaxTerm || 12;
                        scope.formData[prefix + 'SecuredFirstCycleMaxAmount'] = dynamicLevel.securedFirstCycleMaxAmount || 0;
                        scope.formData[prefix + 'SecuredFirstCycleMinTerm'] = dynamicLevel.securedFirstCycleMinTerm || 1;
                        scope.formData[prefix + 'SecuredFirstCycleMaxTerm'] = dynamicLevel.securedFirstCycleMaxTerm || 12;
                        scope.formData[prefix + 'SecuredSecondCycleMaxAmount'] = dynamicLevel.securedSecondCycleMaxAmount || 0;
                        scope.formData[prefix + 'SecuredSecondCycleMinTerm'] = dynamicLevel.securedSecondCycleMinTerm || 1;
                        scope.formData[prefix + 'SecuredSecondCycleMaxTerm'] = dynamicLevel.securedSecondCycleMaxTerm || 12;
                    });
                } else {
                    // Fallback to flat format (old backend format)
                    scope.decisionLevels.forEach(function(level) {
                        var prefix = 'level' + level.fieldName;
                        scope.formData[prefix + 'UnsecuredFirstCycleMaxAmount'] = data[prefix + 'UnsecuredFirstCycleMaxAmount'] || 0;
                        scope.formData[prefix + 'UnsecuredFirstCycleMinTerm'] = data[prefix + 'UnsecuredFirstCycleMinTerm'] || 1;
                        scope.formData[prefix + 'UnsecuredFirstCycleMaxTerm'] = data[prefix + 'UnsecuredFirstCycleMaxTerm'] || 12;
                        scope.formData[prefix + 'UnsecuredSecondCycleMaxAmount'] = data[prefix + 'UnsecuredSecondCycleMaxAmount'] || 0;
                        scope.formData[prefix + 'UnsecuredSecondCycleMinTerm'] = data[prefix + 'UnsecuredSecondCycleMinTerm'] || 1;
                        scope.formData[prefix + 'UnsecuredSecondCycleMaxTerm'] = data[prefix + 'UnsecuredSecondCycleMaxTerm'] || 12;
                        scope.formData[prefix + 'SecuredFirstCycleMaxAmount'] = data[prefix + 'SecuredFirstCycleMaxAmount'] || 0;
                        scope.formData[prefix + 'SecuredFirstCycleMinTerm'] = data[prefix + 'SecuredFirstCycleMinTerm'] || 1;
                        scope.formData[prefix + 'SecuredFirstCycleMaxTerm'] = data[prefix + 'SecuredFirstCycleMaxTerm'] || 12;
                        scope.formData[prefix + 'SecuredSecondCycleMaxAmount'] = data[prefix + 'SecuredSecondCycleMaxAmount'] || 0;
                        scope.formData[prefix + 'SecuredSecondCycleMinTerm'] = data[prefix + 'SecuredSecondCycleMinTerm'] || 1;
                        scope.formData[prefix + 'SecuredSecondCycleMaxTerm'] = data[prefix + 'SecuredSecondCycleMaxTerm'] || 12;
                    });
                }
            });

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
                location.path('/viewLoanApprovalMatrixDetailsDynamic/' + routeParams.approvalMatrixId);
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

                resourceFactory.updateApprovalMatrixDetailsEngineResource.put({approvalMatrixId:routeParams.approvalMatrixId},this.formData, function (data) {
                    location.path('/viewLoanApprovalMatrixDetailsDynamic/' + routeParams.approvalMatrixId);
                });
            };


        }
    });
    mifosX.ng.application.controller('UpdateLoanApprovalMatrixController', ['$scope', 'ResourceFactory', '$location','WizardHandler', '$translate','$routeParams', mifosX.controllers.UpdateLoanApprovalMatrixController]).run(function ($log) {
        $log.info("UpdateLoanApprovalMatrixController initialized");
    });
}(mifosX.controllers || {}));
