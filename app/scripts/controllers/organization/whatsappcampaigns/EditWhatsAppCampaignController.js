(function (module) {
    mifosX.controllers = _.extend(module, {
        EditWhatsAppCampaignController: function (scope, resourceFactory, location, dateFilter, routeParams) {

            scope.reportParams = [];
            scope.reportDateParams = [];
            scope.reqFields = [];
            scope.reportTextParams = [];
            scope.reportData = {};
            scope.reportData.columnHeaders = [];
            scope.formData = {};
            scope.today = new Date();
            scope.triggerTypeOptions = [];
            scope.campaignData = {};
            scope.campaignData.bodyVariableMapping = [];

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

            resourceFactory.whatsAppCampaignResource.get({campaignId: routeParams.campaignId}, function (data) {
                scope.campaignData.id = data.id;
                scope.campaignData.campaignName = data.campaignName;
                scope.campaignData.atTemplateName = data.atTemplateName;
                scope.campaignData.languageCode = data.languageCode;
                scope.campaignData.bodyVariableMapping = data.bodyVariableMappingList ? data.bodyVariableMappingList.slice() : [];
                scope.campaignData.campaignMessage = data.message || data.campaignMessage;
                scope.campaignData.triggerType = data.triggerType.id;
                scope.campaignData.campaignType = data.campaignType.id;
                scope.campaignData.campaignTypeLabel = data.campaignType.value;
                scope.campaignData.report = data.runReportId;
                scope.campaignData.reportName = data.reportName;
                scope.campaignData.recipientType = data.recipientType || 'CLIENT';
                scope.reportSelected(scope.campaignData.reportName);
                scope.paramValues = angular.fromJson(data.paramValue);
                if (data.recurrenceStartDate) {
                    scope.simpleDate = new Date(data.recurrenceStartDate);
                    var simpleTime = new Date(scope.simpleDate.getTime());
                    scope.campaignData.recurrenceStartDate = dateFilter(scope.simpleDate, scope.df);
                    scope.campaignData.time = new Date(0, 0, 0, simpleTime.getHours(), simpleTime.getMinutes(), simpleTime.getSeconds());
                }
                prepopulateReportParams();
            });

            function prepopulateReportParams() {
                if (!_.isUndefined(scope.paramValues)) {
                    var obj = scope.paramValues;
                    for (var key in obj) {
                        scope.formData["R_" + key] = String(obj[key]);
                    }
                }
            }

            function intializeParams(paramData, params) {
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
                resourceFactory.reportsResource.get({id: scope.campaignData.report, fields: 'reportParameters'}, function (data) {
                    scope.whatsAppReportParameters = data.reportParameters || [];
                    scope.getColumnHeaders();
                });
            };

            scope.getColumnHeaders = function () {
                scope.formData.reportSource = scope.campaignData.reportName;
                resourceFactory.runReportsResource.getReport(scope.formData, function (data) {
                    scope.reportData.columnHeaders = data.columnHeaders;
                });
            };

            resourceFactory.whatsAppCampaignTemplateResource.get(function (data) {
                scope.triggerTypeOptions = data.triggerTypeOptions;
                scope.businessRuleOptions = data.businessRulesOptions;
                scope.recipientTypeOptions = data.recipientTypeOptions || [];
            });

            scope.submit = function () {
                var scheduledDateTime;
                if (scope.campaignData.triggerType === 2) {
                    scheduledDateTime = new Date(scope.campaignData.recurrenceStartDate);
                    scheduledDateTime.setHours(scope.campaignData.time.getHours());
                    scheduledDateTime.setMinutes(scope.campaignData.time.getMinutes());
                    scheduledDateTime.setSeconds(scope.campaignData.time.getSeconds());
                    scheduledDateTime = dateFilter(scheduledDateTime, scope.dft);
                }

                scope.submissionData = {
                    triggerType: scope.campaignData.triggerType,
                    campaignName: scope.campaignData.campaignName,
                    campaignType: scope.campaignData.campaignType,
                    atTemplateName: scope.campaignData.atTemplateName,
                    languageCode: scope.campaignData.languageCode,
                    bodyVariableMapping: scope.campaignData.bodyVariableMapping,
                    message: scope.campaignData.campaignMessage || "",
                    dateFormat: scope.df,
                    locale: scope.optlang.code,
                    recurrenceStartDate: scheduledDateTime,
                    dateTimeFormat: scope.dft,
                    runReportId: scope.campaignData.report,
                    recipientType: scope.campaignData.recipientType,
                    paramValue: scope.paramValues
                };

                resourceFactory.whatsAppCampaignResource.update({campaignId: routeParams.campaignId}, scope.submissionData, function () {
                    location.path('/viewwhatsappcampaign/' + routeParams.campaignId);
                });
            };
        }
    });
    mifosX.ng.application.controller('EditWhatsAppCampaignController', ['$scope', 'ResourceFactory', '$location', 'dateFilter', '$routeParams', mifosX.controllers.EditWhatsAppCampaignController]).run(function ($log) {
        $log.info("EditWhatsAppCampaignController initialized");
    });
}(mifosX.controllers || {}));
