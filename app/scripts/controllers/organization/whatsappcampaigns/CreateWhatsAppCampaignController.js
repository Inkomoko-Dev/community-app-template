(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateWhatsAppCampaignController: function (scope, WizardHandler, resourceFactory, location, dateFilter) {

            scope.reportParams = [];
            scope.reportDateParams = [];
            scope.reqFields = [];
            scope.reportTextParams = [];
            scope.reportData = {};
            scope.reportData.columnHeaders = [];
            scope.submissionData = {};
            scope.minDate = new Date();
            scope.formData = {};
            scope.today = new Date();
            scope.isButtonDisabled = false;
            scope.triggerTypeOptions = [];
            scope.businessRules = [];
            scope.campaignData = {};
            scope.campaignData.bodyVariableMapping = [];
            scope.previewData = {};
            scope.filteredBusinessRules = [];
            var triggeredBusinessRule = [];
            var nonTriggeredBusinessRule = [];
            scope.simpleDate = new Date();
            var simpleTime = new Date(scope.simpleDate.getTime());
            scope.campaignData.time = new Date(0, 0, 0, simpleTime.getHours(), simpleTime.getMinutes(), simpleTime.getSeconds());

            scope.addBodyVariableMapping = function (columnName) {
                scope.campaignData.bodyVariableMapping.push(columnName);
            };

            scope.removeBodyVariableMapping = function (index) {
                scope.campaignData.bodyVariableMapping.splice(index, 1);
            };

            scope.reportSelected = function (reportName) {
                scope.reqFields = [];
                scope.reportParams = [];
                scope.reportDateParams = [];
                scope.reportTextParams = [];

                resourceFactory.runReportsResource.getReport({reportSource: 'FullParameterList', parameterType: true, R_reportListing: "'" + reportName + "'"}, function (data) {
                    for (var i in data.data) {
                        var temp = {
                            name: data.data[i].row[0],
                            variable: data.data[i].row[1],
                            label: data.data[i].row[2],
                            displayType: data.data[i].row[3],
                            formatType: data.data[i].row[4],
                            defaultVal: data.data[i].row[5],
                            selectOne: data.data[i].row[6],
                            selectAll: data.data[i].row[7],
                            parentParameterName: data.data[i].row[8],
                            inputName: "R_" + data.data[i].row[1]
                        };
                        scope.reqFields.push(temp);
                        if (temp.displayType == 'select' && temp.parentParameterName == null) {
                            intializeParams(temp, {});
                        } else if (temp.displayType == 'date') {
                            scope.reportDateParams.push(temp);
                        } else if (temp.displayType == 'text') {
                            scope.reportTextParams.push(temp);
                        }
                    }
                });
            };

            scope.getBusinessRule = function () {
                if (!_.isUndefined(scope.campaignData.triggerType.value) && scope.campaignData.triggerType.value === 'Triggered') {
                    scope.filteredBusinessRules = triggeredBusinessRule;
                } else {
                    scope.filteredBusinessRules = nonTriggeredBusinessRule;
                }
            };

            scope.filterBusinessRule = function () {
                triggeredBusinessRule = [];
                nonTriggeredBusinessRule = [];
                angular.forEach(scope.businessRuleOptions, function (businessRule) {
                    if (!_.isNull(businessRule.reportSubType) && !_.isUndefined(businessRule.reportSubType) && businessRule.reportSubType === 'Triggered') {
                        triggeredBusinessRule.push(businessRule);
                    } else {
                        nonTriggeredBusinessRule.push(businessRule);
                    }
                });
            };

            function intializeParams(paramData, params) {
                scope.errorStatus = undefined;
                scope.errorDetails = [];
                params.reportSource = paramData.name;
                params.parameterType = true;
                var successFunction = getSuccuessFunction(paramData);
                resourceFactory.runReportsResource.getReport(params, successFunction);
            }

            function getSuccuessFunction(paramData) {
                var successFunction = function (data) {
                    var selectData = [];
                    var isExistedRecord = false;
                    for (var i in data.data) {
                        selectData.push({id: data.data[i].row[0], name: data.data[i].row[1]});
                    }
                    for (var j in scope.reportParams) {
                        if (scope.reportParams[j].name == paramData.name) {
                            scope.reportParams[j].selectOptions = selectData;
                            isExistedRecord = true;
                        }
                    }
                    if (!isExistedRecord) {
                        if (paramData.selectAll == 'Y') {
                            selectData.push({id: "-1", name: "All"});
                        }
                        paramData.selectOptions = selectData;
                        scope.reportParams.push(paramData);
                    }
                };
                return successFunction;
            }

            scope.getDependencies = function (paramData) {
                for (var i = 0; i < scope.reqFields.length; i++) {
                    var temp = scope.reqFields[i];
                    if (temp.parentParameterName == paramData.name) {
                        if (temp.displayType == 'select') {
                            var parentParamValue = this.formData[paramData.inputName];
                            if (parentParamValue != undefined) {
                                eval("var params={};params." + paramData.inputName + "='" + parentParamValue + "';");
                                intializeParams(temp, params);
                            }
                        } else if (temp.displayType == 'date') {
                            scope.reportDateParams.push(temp);
                        }
                    }
                }
                resourceFactory.reportsResource.get({id: scope.campaignData.report.reportId, fields: 'reportParameters'}, function (data) {
                    scope.whatsAppReportParameters = data.reportParameters || [];
                });
            };

            scope.getColumnHeaders = function () {
                parameterValidationErrors();
                if (scope.errorDetails.length === 0) {
                    scope.formData.reportSource = scope.campaignData.report.reportName;

                    for (var i = 0; i < scope.reqFields.length; i++) {
                        var tempParam = scope.reqFields[i];
                        if (tempParam.displayType == 'none') {
                            scope.formData[tempParam.inputName] = -1;
                        }
                    }
                    resourceFactory.runReportsResource.getReport(scope.formData, function (data) {
                        scope.reportData.columnHeaders = data.columnHeaders;
                    });
                }
            };

            function buildPreviewParms() {
                var paramCount = 1;
                var reportParams = "{";
                for (var i = 0; i < scope.reqFields.length; i++) {
                    var reqField = scope.reqFields[i];
                    for (var j = 0; j < scope.whatsAppReportParameters.length; j++) {
                        var tempParam = scope.whatsAppReportParameters[j];
                        if (reqField.name == tempParam.parameterName) {
                            var paramName = reqField.variable;
                            if (paramCount > 1) reportParams += ",";
                            reportParams += '\"' + paramName + '\"' + ":" + scope.formData[scope.reqFields[i].inputName];
                            paramCount = paramCount + 1;
                        }
                    }
                }
                reportParams += "}";
                return reportParams;
            }

            scope.previewMessage = function () {
                scope.paramValues = angular.fromJson(buildPreviewParms());
                scope.paramValues.reportName = scope.formData.reportSource;
                scope.previewData = {
                    runReportId: scope.campaignData.report.reportId,
                    atTemplateName: scope.campaignData.atTemplateName,
                    languageCode: scope.campaignData.languageCode,
                    bodyVariableMapping: scope.campaignData.bodyVariableMapping,
                    paramValue: scope.paramValues
                };
                resourceFactory.whatsAppCampaignResource.preview({additionalParam: 'preview'}, scope.previewData, function (data) {
                    scope.previewMessageText = data.previewMessage;
                    scope.previewBodyValues = data.bodyValues;
                });
            };

            function parameterValidationErrors() {
                var tmpStartDate = "";
                var tmpEndDate = "";
                scope.errorDetails = [];
                for (var i in scope.reqFields) {
                    var paramDetails = scope.reqFields[i];
                    switch (paramDetails.displayType) {
                        case "select":
                            var selectedVal = scope.formData[paramDetails.inputName];
                            if (selectedVal == undefined || selectedVal == 0) {
                                var fieldId = '#' + paramDetails.inputName;
                                $(fieldId).addClass("validationerror");
                                var errorObj = new Object();
                                errorObj.field = paramDetails.inputName;
                                errorObj.code = 'error.message.report.parameter.required';
                                errorObj.args = {params: []};
                                errorObj.args.params.push({value: paramDetails.label});
                                scope.errorDetails.push(errorObj);
                            }
                            break;
                        case "date":
                            var tmpDate = scope.formData[paramDetails.inputName];
                            if (tmpDate == undefined || !(tmpDate > "")) {
                                var fieldId = '#' + paramDetails.inputName;
                                $(fieldId).addClass("validationerror");
                                var errorObj = new Object();
                                errorObj.field = paramDetails.inputName;
                                errorObj.code = 'error.message.report.parameter.required';
                                errorObj.args = {params: []};
                                errorObj.args.params.push({value: paramDetails.label});
                                scope.errorDetails.push(errorObj);
                            }
                            break;
                        case "text":
                            var textVal = scope.formData[paramDetails.inputName];
                            if (textVal == undefined) {
                                var fieldId = '#' + paramDetails.inputName;
                                $(fieldId).addClass("validationerror");
                                var errorObj = new Object();
                                errorObj.field = paramDetails.inputName;
                                errorObj.code = 'error.message.report.parameter.required';
                                errorObj.args = {params: []};
                                errorObj.args.params.push({value: paramDetails.label});
                                scope.errorDetails.push(errorObj);
                            }
                            break;
                    }
                    if (paramDetails.variable == "startDate") tmpStartDate = scope.formData[paramDetails.inputName];
                    if (paramDetails.variable == "endDate") tmpEndDate = scope.formData[paramDetails.inputName];
                }

                if (tmpStartDate > "" && tmpEndDate > "") {
                    if (tmpStartDate > tmpEndDate) {
                        var errorObj = new Object();
                        errorObj.code = 'error.message.report.incorrect.values.for.date.fields';
                        errorObj.args = {params: []};
                        scope.errorDetails.push(errorObj);
                    }
                }
            }

            resourceFactory.whatsAppCampaignTemplateResource.get(function (data) {
                scope.triggerTypeOptions = data.triggerTypeOptions;
                scope.businessRuleOptions = data.businessRulesOptions || [];
                scope.frequencyTypeOptions = data.frequencyTypeOptions;
                scope.weekDays = data.weekDays;
                scope.filterBusinessRule();
                // Re-apply filter if the user already chose a trigger before options arrived.
                if (scope.campaignData.triggerType) {
                    scope.getBusinessRule();
                }
            });

            scope.selectedPeriod = function (period) {
                if (period == 1) {
                    scope.repeatsEveryOptions = ["1", "2", "3"];
                    scope.periodValue = "day(s)";
                }
                if (period == 2) {
                    scope.periodValue = "week(s)";
                    scope.repeatsEveryOptions = ["1", "2", "3"];
                    scope.campaignData.repeatsOnDay = '1';
                    scope.repeatsOnOptions = scope.weekDays;
                }
                if (period == 3) {
                    scope.periodValue = "month(s)";
                    scope.repeatsEveryOptions = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
                }
                if (period == 4) {
                    scope.periodValue = "year(s)";
                    scope.repeatsEveryOptions = ["1", "2", "3", "4", "5"];
                }
            };

            scope.noOfTabs = 4;
            scope.step = '-';

            scope.submit = function () {
                setDisableTimeout();

                if (WizardHandler.wizard().currentStepNumber() != scope.noOfTabs) {
                    if (WizardHandler.wizard().currentStepNumber() == 2) {
                        scope.getColumnHeaders();
                    }
                    if (WizardHandler.wizard().currentStepNumber() == 3) {
                        scope.previewMessage();
                    }
                    WizardHandler.wizard().next();
                    return;
                }

                if (!scope.paramValues) {
                    scope.paramValues = angular.fromJson(buildPreviewParms());
                    scope.paramValues.reportName = scope.formData.reportSource;
                }

                var scheduledDateTime;
                if (scope.campaignData.triggerType.value === 'Scheduled') {
                    scheduledDateTime = scope.campaignData.recurrenceStartDate;
                    scheduledDateTime.setHours(scope.campaignData.time.getHours());
                    scheduledDateTime.setMinutes(scope.campaignData.time.getMinutes());
                    scheduledDateTime.setSeconds(scope.campaignData.time.getSeconds());
                    scheduledDateTime = dateFilter(scheduledDateTime, scope.dft);
                }

                scope.submissionData = {
                    triggerType: scope.campaignData.triggerType.id,
                    campaignName: scope.campaignData.campaignName,
                    campaignType: 3,
                    atTemplateName: scope.campaignData.atTemplateName,
                    languageCode: scope.campaignData.languageCode,
                    bodyVariableMapping: scope.campaignData.bodyVariableMapping,
                    message: scope.campaignData.campaignMessage || "",
                    dateFormat: scope.df,
                    locale: scope.optlang.code,
                    submittedOnDate: dateFilter(new Date(), scope.df),
                    recurrenceStartDate: scheduledDateTime,
                    dateTimeFormat: scope.dft,
                    frequency: scope.campaignData.frequency,
                    interval: scope.campaignData.repeatsEvery,
                    repeatsOnDay: scope.campaignData.repeatsOnDay,
                    runReportId: scope.campaignData.report.reportId,
                    paramValue: scope.paramValues
                };

                resourceFactory.whatsAppCampaignResource.save(scope.submissionData, function (data) {
                    location.path('/viewwhatsappcampaign/' + data.resourceId);
                });
            };

            var setDisableTimeout = function () {
                scope.isButtonDisabled = true;
                setTimeout(function () {
                    scope.isButtonDisabled = false;
                }, 5000);
            };
        }
    });
    mifosX.ng.application.controller('CreateWhatsAppCampaignController', ['$scope', 'WizardHandler', 'ResourceFactory', '$location', 'dateFilter', mifosX.controllers.CreateWhatsAppCampaignController]).run(function ($log) {
        $log.info("CreateWhatsAppCampaignController initialized");
    });
}(mifosX.controllers || {}));
