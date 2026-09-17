(function (module) {
    mifosX.controllers = _.extend(module, {
        NovuCampaignsController: function (scope, resourceFactory, dateFilter) {
            scope.campaigns = [];
            scope.logs = [];
            scope.events = [];
            scope.triggerTypes = ['DIRECT', 'SCHEDULED', 'TRIGGERED'];
            scope.recipientTypes = ['CLIENT', 'STAFF', 'BOTH'];
            scope.channelOptions = ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'TELEGRAM', 'SLACK'];
            scope.chatProviders = {
                WHATSAPP: 'whatsapp-business',
                TELEGRAM: 'telegram',
                SLACK: 'slack'
            };
            scope.templateVariables = ['clientName', 'firstName', 'lastName', 'loanAccountNumber', 'approvedPrincipal',
                'currency', 'transactionAmount', 'dueDate', 'amountDue', 'daysUntilDue'];
            scope.novuWorkflowBindings = {
                emailSubject: '{{payload.emailSubject}}',
                emailBody: '{{payload.emailBody}}',
                smsBody: '{{payload.smsBody}}',
                inAppBody: '{{payload.inAppBody}}',
                chatBody: '{{payload.chatBody}}'
            };
            scope.frequencyTypeOptions = [];
            scope.weekDays = [];
            scope.businessRuleOptions = [];
            scope.filteredBusinessRules = [];
            scope.repeatsEveryOptions = ['1', '2', '3'];
            scope.periodValue = 'day(s)';
            scope.reportParams = [];
            scope.reportDateParams = [];
            scope.reportTextParams = [];
            scope.reqFields = [];
            scope.reportColumnHeaders = [];
            scope.variableList = [];
            scope.smsReportParameters = [];
            scope.activeTemplateField = 'smsBody';
            scope.credentialForm = { subscriberId: '', providerId: 'whatsapp-business', credentialsJson: '{"phoneNumber": ""}' };

            function pad(value) {
                return value < 10 ? '0' + value : '' + value;
            }

            function toIsoLocalDateTime(value) {
                if (!value) {
                    return null;
                }
                var date = value instanceof Date ? value : parseApiDate(value);
                if (!date) {
                    return null;
                }
                return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' +
                    pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
            }

            function parseApiDate(value) {
                if (!value) {
                    return null;
                }
                if (value instanceof Date) {
                    return value;
                }
                if (typeof value === 'string') {
                    var parsed = new Date(value);
                    return isNaN(parsed.getTime()) ? null : parsed;
                }
                if (angular.isArray(value) && value.length >= 3) {
                    return new Date(value[0], value[1] - 1, value[2], value[3] || 0, value[4] || 0, value[5] || 0);
                }
                if (value.date && value.time) {
                    return new Date(value.date.year, value.date.month - 1, value.date.day,
                        value.time.hour || 0, value.time.minute || 0, value.time.second || 0);
                }
                return null;
            }

            scope.displayDate = function (value) {
                var date = parseApiDate(value);
                return date ? dateFilter(date, scope.dft || 'dd MMMM yyyy HH:mm:ss') : '';
            };

            scope.resetForm = function () {
                scope.editing = false;
                scope.customEvent = false;
                scope.selectedReport = null;
                scope.formData = { recipientType: 'CLIENT', triggerType: 'TRIGGERED', active: false, repeatsEvery: '1', repeatsOnDay: '1' };
                scope.selectedChannels = { IN_APP: true, EMAIL: true, SMS: true };
                scope.campaignDataTime = new Date();
                scope.reportParams = [];
                scope.reportDateParams = [];
                scope.reportTextParams = [];
                scope.reqFields = [];
                scope.reportColumnHeaders = [];
                scope.filterBusinessRules();
                scope.refreshVariableList();
            };

            scope.usesReportAudience = function () {
                return scope.formData.triggerType === 'DIRECT' || scope.formData.triggerType === 'SCHEDULED';
            };

            scope.hasChatChannel = function () {
                return !!(scope.selectedChannels.WHATSAPP || scope.selectedChannels.TELEGRAM || scope.selectedChannels.SLACK);
            };

            scope.filterBusinessRules = function () {
                var triggered = [];
                var nonTriggered = [];
                angular.forEach(scope.businessRuleOptions, function (businessRule) {
                    if (businessRule.reportSubType === 'Triggered') {
                        triggered.push(businessRule);
                    } else {
                        nonTriggered.push(businessRule);
                    }
                });
                scope.filteredBusinessRules = scope.formData.triggerType === 'TRIGGERED' ? triggered : nonTriggered;
            };

            scope.onTriggerTypeChange = function () {
                scope.filterBusinessRules();
                if (scope.formData.triggerType === 'DIRECT' && (!scope.formData.eventType || scope.formData.eventType === 'SCHEDULED')) {
                    scope.formData.eventType = 'DIRECT';
                    scope.customEvent = true;
                } else if (scope.formData.triggerType === 'SCHEDULED' && (!scope.formData.eventType || scope.formData.eventType === 'DIRECT')) {
                    scope.formData.eventType = 'SCHEDULED';
                    scope.customEvent = true;
                }
            };

            scope.selectedPeriod = function (period) {
                if (period == 1) {
                    scope.repeatsEveryOptions = ['1', '2', '3'];
                    scope.periodValue = 'day(s)';
                } else if (period == 2) {
                    scope.repeatsEveryOptions = ['1', '2', '3'];
                    scope.periodValue = 'week(s)';
                    scope.repeatsOnOptions = scope.weekDays;
                    scope.formData.repeatsOnDay = scope.formData.repeatsOnDay || '1';
                } else if (period == 3) {
                    scope.periodValue = 'month(s)';
                    scope.repeatsEveryOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
                } else if (period == 4) {
                    scope.periodValue = 'year(s)';
                    scope.repeatsEveryOptions = ['1', '2', '3', '4', '5'];
                }
            };

            function intializeParams(paramData, params) {
                params.reportSource = paramData.name;
                params.parameterType = true;
                resourceFactory.runReportsResource.getReport(params, function (data) {
                    var selectData = [];
                    for (var i in data.data) {
                        selectData.push({ id: data.data[i].row[0], name: data.data[i].row[1] });
                    }
                    if (paramData.selectAll == 'Y') {
                        selectData.push({ id: '-1', name: 'All' });
                    }
                    paramData.selectOptions = selectData;
                    var existed = false;
                    for (var j in scope.reportParams) {
                        if (scope.reportParams[j].name == paramData.name) {
                            scope.reportParams[j].selectOptions = selectData;
                            existed = true;
                        }
                    }
                    if (!existed) {
                        scope.reportParams.push(paramData);
                    }
                });
            }

            scope.reportSelected = function (reportName) {
                scope.reqFields = [];
                scope.reportParams = [];
                scope.reportDateParams = [];
                scope.reportTextParams = [];
                scope.reportColumnHeaders = [];
                if (!reportName) {
                    return;
                }
                resourceFactory.runReportsResource.getReport({ reportSource: 'FullParameterList', parameterType: true, R_reportListing: "'" + reportName + "'" }, function (data) {
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
                            inputName: 'R_' + data.data[i].row[1]
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

            scope.getDependencies = function (paramData) {
                for (var i = 0; i < scope.reqFields.length; i++) {
                    var temp = scope.reqFields[i];
                    if (temp.parentParameterName == paramData.name && temp.displayType == 'select') {
                        var parentParamValue = scope.formData[paramData.inputName];
                        if (parentParamValue != undefined) {
                            var params = {};
                            params[paramData.inputName] = parentParamValue;
                            intializeParams(temp, params);
                        }
                    } else if (temp.parentParameterName == paramData.name && temp.displayType == 'date') {
                        scope.reportDateParams.push(temp);
                    }
                }
                if (scope.selectedReport && scope.selectedReport.reportId) {
                    resourceFactory.reportsResource.get({ id: scope.selectedReport.reportId, fields: 'reportParameters' }, function (data) {
                        scope.smsReportParameters = data.reportParameters || [];
                    });
                }
            };

            scope.loadReportColumns = function () {
                if (!scope.selectedReport) {
                    return;
                }
                var params = { reportSource: scope.selectedReport.reportName };
                angular.forEach(scope.reqFields, function (field) {
                    if (field.displayType == 'none') {
                        params[field.inputName] = -1;
                    } else if (scope.formData[field.inputName] !== undefined) {
                        params[field.inputName] = scope.formData[field.inputName];
                    }
                });
                resourceFactory.runReportsResource.getReport(params, function (data) {
                    scope.reportColumnHeaders = data.columnHeaders || [];
                    scope.refreshVariableList();
                });
            };

            function buildParamValue() {
                var params = {};
                angular.forEach(scope.reqFields, function (field) {
                    var value = scope.formData[field.inputName];
                    if (field.displayType == 'none') {
                        value = -1;
                    } else if (field.displayType == 'date' && value) {
                        value = dateFilter(value, 'yyyy-MM-dd');
                    }
                    if (value !== undefined && value !== null && value !== '') {
                        params[field.variable] = String(value);
                    }
                });
                if (scope.selectedReport) {
                    params.reportName = scope.selectedReport.reportName;
                }
                return params;
            }

            function applyParamValue(paramValue) {
                var parsed = paramValue;
                if (typeof paramValue === 'string' && paramValue) {
                    try {
                        parsed = angular.fromJson(paramValue);
                    } catch (e) {
                        parsed = {};
                    }
                }
                if (!parsed || typeof parsed !== 'object') {
                    return;
                }
                angular.forEach(parsed, function (value, key) {
                    if (key !== 'reportName') {
                        scope.formData['R_' + key] = value;
                    }
                });
            }

            function constructRecurrence() {
                if (scope.formData.triggerType !== 'SCHEDULED' || !scope.formData.frequency) {
                    return null;
                }
                var freqMap = { 1: 'DAILY', 2: 'WEEKLY', 3: 'MONTHLY', 4: 'YEARLY' };
                var recurrence = 'FREQ=' + (freqMap[scope.formData.frequency] || 'DAILY');
                if (scope.formData.repeatsEvery && Number(scope.formData.repeatsEvery) > 1) {
                    recurrence += ';INTERVAL=' + scope.formData.repeatsEvery;
                }
                if (scope.formData.frequency == 2 && scope.formData.repeatsOnDay) {
                    var weekDay = _.find(scope.weekDays, function (day) {
                        return String(day.id) === String(scope.formData.repeatsOnDay);
                    });
                    if (weekDay && weekDay.value) {
                        recurrence += ';BYDAY=' + String(weekDay.value).substring(0, 2).toUpperCase();
                    }
                }
                return recurrence;
            }

            function parseRecurrence(recurrence) {
                scope.formData.frequency = 1;
                scope.formData.repeatsEvery = '1';
                if (!recurrence) {
                    scope.selectedPeriod(1);
                    return;
                }
                var parts = {};
                angular.forEach(recurrence.split(';'), function (part) {
                    var pair = part.split('=');
                    if (pair.length === 2) {
                        parts[pair[0]] = pair[1];
                    }
                });
                var freqIds = { DAILY: 1, WEEKLY: 2, MONTHLY: 3, YEARLY: 4 };
                scope.formData.frequency = freqIds[parts.FREQ] || 1;
                scope.formData.repeatsEvery = parts.INTERVAL || '1';
                scope.selectedPeriod(scope.formData.frequency);
                if (parts.BYDAY && scope.weekDays) {
                    var match = _.find(scope.weekDays, function (day) {
                        return String(day.value).toUpperCase().indexOf(parts.BYDAY) === 0 || String(day.code).toUpperCase().indexOf(parts.BYDAY) !== -1;
                    });
                    if (match) {
                        scope.formData.repeatsOnDay = String(match.id);
                    }
                }
            }

            scope.focusTemplateField = function (fieldName) {
                scope.activeTemplateField = fieldName;
            };

            scope.insertVariable = function (variableName) {
                var token = '${' + variableName + '}';
                var field = scope.activeTemplateField || 'smsBody';
                scope.formData[field] = (scope.formData[field] || '') + token;
            };

            scope.refreshVariableList = function () {
                var names = angular.copy(scope.templateVariables);
                angular.forEach(scope.reportColumnHeaders, function (header) {
                    if (header.columnName && names.indexOf(header.columnName) === -1) {
                        names.push(header.columnName);
                    }
                });
                scope.variableList = names;
            };

            scope.credentialPlaceholder = function () {
                if (scope.credentialForm.providerId === 'telegram') {
                    return '{"chatId": ""}';
                }
                if (scope.credentialForm.providerId === 'slack') {
                    return '{"webhookUrl": ""}';
                }
                return '{"phoneNumber": ""}';
            };

            scope.onProviderChange = function () {
                scope.credentialForm.credentialsJson = scope.credentialPlaceholder();
            };

            scope.load = function () {
                resourceFactory.novuCampaignTemplateResource.get({}, function (data) {
                    scope.triggerTypes = data.triggerTypes || scope.triggerTypes;
                    scope.recipientTypes = data.recipientTypes || scope.recipientTypes;
                    scope.channelOptions = data.channels || scope.channelOptions;
                    scope.events = data.loanEvents || [];
                    scope.chatProviders = data.chatProviders || scope.chatProviders;
                    scope.templateVariables = data.templateVariables || scope.templateVariables;
                    scope.novuWorkflowBindings = data.novuWorkflowBindings || scope.novuWorkflowBindings;
                    var options = data.businessRulesAndScheduleOptions || {};
                    scope.businessRuleOptions = options.businessRulesOptions || [];
                    scope.frequencyTypeOptions = options.frequencyTypeOptions || [];
                    scope.weekDays = options.weekDays || [];
                    scope.filterBusinessRules();
                    scope.refreshVariableList();
                });
                resourceFactory.novuCampaignResource.getAll({}, function (data) {
                    scope.campaigns = data;
                });
                resourceFactory.novuLogResource.get({ limit: 200 }, function (data) {
                    scope.logs = data.pageItems || [];
                });
            };

            scope.edit = function (campaign) {
                scope.resetForm();
                scope.editing = true;
                scope.formData.campaignName = campaign.campaignName;
                scope.formData.workflowId = campaign.workflowId;
                scope.formData.eventType = campaign.eventType;
                scope.formData.triggerType = campaign.triggerType || 'TRIGGERED';
                scope.formData.recipientType = campaign.recipientType;
                scope.formData.emailSubject = campaign.emailSubject;
                scope.formData.emailBody = campaign.emailBody;
                scope.formData.smsBody = campaign.smsBody;
                scope.formData.inAppBody = campaign.inAppBody;
                scope.formData.chatBody = campaign.chatBody;
                scope.formData.active = campaign.active;
                scope.formData.id = campaign.id;
                scope.customEvent = scope.events.indexOf(campaign.eventType) === -1;
                scope.selectedChannels = {};
                angular.forEach((campaign.channels || '').split(','), function (channel) {
                    if (channel.trim()) {
                        scope.selectedChannels[channel.trim()] = true;
                    }
                });
                scope.filterBusinessRules();
                if (campaign.reportName) {
                    scope.selectedReport = _.find(scope.businessRuleOptions, function (rule) {
                        return rule.reportName === campaign.reportName;
                    }) || { reportName: campaign.reportName };
                    scope.reportSelected(campaign.reportName);
                    applyParamValue(campaign.paramValue);
                }
                parseRecurrence(campaign.recurrence);
                var start = parseApiDate(campaign.recurrenceStartDate);
                if (start) {
                    scope.formData.recurrenceStartDate = start;
                    scope.campaignDataTime = start;
                }
            };

            scope.cancel = function () {
                scope.resetForm();
            };

            scope.submit = function () {
                var channels = scope.channelOptions.filter(function (channel) {
                    return scope.selectedChannels[channel];
                }).join(',');
                var payload = {
                    campaignName: scope.formData.campaignName,
                    workflowId: scope.formData.workflowId,
                    eventType: (scope.formData.eventType || scope.formData.triggerType || 'TRIGGERED').toUpperCase(),
                    triggerType: scope.formData.triggerType,
                    recipientType: scope.formData.recipientType,
                    channels: channels,
                    emailSubject: scope.formData.emailSubject,
                    emailBody: scope.formData.emailBody,
                    smsBody: scope.formData.smsBody,
                    inAppBody: scope.formData.inAppBody,
                    chatBody: scope.formData.chatBody,
                    active: !!scope.formData.active
                };
                if (scope.usesReportAudience()) {
                    payload.reportName = scope.selectedReport ? scope.selectedReport.reportName : scope.formData.reportName;
                    payload.paramValue = buildParamValue();
                }
                if (scope.formData.triggerType === 'SCHEDULED') {
                    var startDate = scope.formData.recurrenceStartDate;
                    if (startDate && scope.campaignDataTime) {
                        startDate = new Date(startDate);
                        startDate.setHours(scope.campaignDataTime.getHours());
                        startDate.setMinutes(scope.campaignDataTime.getMinutes());
                        startDate.setSeconds(scope.campaignDataTime.getSeconds());
                    }
                    payload.recurrenceStartDate = toIsoLocalDateTime(startDate);
                    payload.recurrence = constructRecurrence();
                }
                var success = function () {
                    scope.cancel();
                    scope.load();
                };
                if (scope.editing) {
                    resourceFactory.novuCampaignResource.update({ campaignId: scope.formData.id }, payload, success);
                } else {
                    resourceFactory.novuCampaignResource.save({}, payload, success);
                }
            };

            scope.remove = function (campaign) {
                if (confirm('Delete Novu campaign "' + campaign.campaignName + '"?')) {
                    resourceFactory.novuCampaignResource.delete({ campaignId: campaign.id }, {}, scope.load);
                }
            };

            scope.sendNow = function (campaign) {
                scope.sendingId = campaign.id;
                resourceFactory.novuCampaignTriggerResource.save({ campaignId: campaign.id }, {}, function (data) {
                    scope.sendingId = null;
                    scope.sendResult = data;
                    scope.load();
                }, function () {
                    scope.sendingId = null;
                });
            };

            scope.syncSubscribers = function () {
                scope.syncing = true;
                scope.syncResult = null;
                resourceFactory.novuSubscriberSyncResource.save({}, {}, function (data) {
                    scope.syncing = false;
                    scope.syncResult = data;
                }, function () {
                    scope.syncing = false;
                });
            };

            scope.saveCredentials = function () {
                var credentials;
                try {
                    credentials = angular.fromJson(scope.credentialForm.credentialsJson || '{}');
                } catch (e) {
                    scope.credentialError = 'Credentials must be valid JSON.';
                    return;
                }
                scope.credentialError = null;
                resourceFactory.novuSubscriberCredentialsResource.save({ subscriberId: scope.credentialForm.subscriberId }, {
                    providerId: scope.credentialForm.providerId,
                    credentials: credentials
                }, function (data) {
                    scope.credentialResult = data;
                });
            };

            scope.resetForm();
            scope.load();
        }
    });
    mifosX.ng.application.controller('NovuCampaignsController', ['$scope', 'ResourceFactory', 'dateFilter',
        mifosX.controllers.NovuCampaignsController]).run(function ($log) {
        $log.info('NovuCampaignsController initialized');
    });
}(mifosX.controllers || {}));
