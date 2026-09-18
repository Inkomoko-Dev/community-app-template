(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateNovuCampaignController: function (scope, WizardHandler, resourceFactory, location, dateFilter, routeParams) {
            scope.reportParams = [];
            scope.reportDateParams = [];
            scope.reportTextParams = [];
            scope.reqFields = [];
            scope.reportData = { columnHeaders: [] };
            scope.formData = {};
            scope.minDate = new Date();
            scope.triggerTypeOptions = [
                { id: 'TRIGGERED', value: 'When a loan event happens' },
                { id: 'DIRECT', value: 'Send now' },
                { id: 'SCHEDULED', value: 'On a schedule' }
            ];
            scope.recipientTypeOptions = [
                { id: 'CLIENT', value: 'Clients' },
                { id: 'STAFF', value: 'Loan officers / staff' },
                { id: 'BOTH', value: 'Clients and staff' }
            ];
            scope.channelOptions = [
                { id: 'SMS', label: 'SMS' },
                { id: 'IN_APP', label: 'In-app' },
                { id: 'EMAIL', label: 'Email' },
                { id: 'WHATSAPP', label: 'WhatsApp' },
                { id: 'TELEGRAM', label: 'Telegram' },
                { id: 'SLACK', label: 'Slack' }
            ];
            scope.loanEventOptions = [
                { id: 'LOAN_CREATED', label: 'Loan created' },
                { id: 'LOAN_APPROVED', label: 'Loan approved' },
                { id: 'LOAN_DISBURSED', label: 'Loan disbursed' },
                { id: 'LOAN_REJECTED', label: 'Loan rejected' },
                { id: 'LOAN_REPAYMENT', label: 'Loan repayment' },
                { id: 'LOAN_CLOSED', label: 'Loan closed' }
            ];
            scope.eventTemplateVariables = ['clientName', 'firstName', 'lastName', 'loanAccountNumber', 'approvedPrincipal',
                'disbursedAmount', 'currency', 'transactionAmount', 'eventType'];
            scope.reportTemplateVariables = ['clientName', 'firstName', 'lastName', 'loanAccountNumber', 'dueDate', 'amountDue',
                'daysUntilDue'];
            scope.suggestedMessages = {
                LOAN_CREATED: 'Hello ${clientName}, your loan application ${loanAccountNumber} has been created.',
                LOAN_APPROVED: 'Hello ${clientName}, your loan ${loanAccountNumber} has been approved.',
                LOAN_DISBURSED: 'Hello ${clientName}, your loan ${loanAccountNumber} has been disbursed.',
                LOAN_REJECTED: 'Hello ${clientName}, your loan application ${loanAccountNumber} was not approved.',
                LOAN_REPAYMENT: 'Hello ${clientName}, we received your repayment of ${transactionAmount} for loan ${loanAccountNumber}.',
                LOAN_CLOSED: 'Hello ${clientName}, your loan ${loanAccountNumber} is now closed.'
            };
            scope.autoWorkflow = true;
            scope.autoMessage = true;
            scope.businessRuleOptions = [];
            scope.filteredBusinessRules = [];
            scope.frequencyTypeOptions = [];
            scope.weekDays = [];
            scope.repeatsEveryOptions = ['1', '2', '3'];
            scope.periodValue = 'day(s)';
            scope.smsReportParameters = [];
            scope.noOfTabs = 3;
            scope.step = '-';
            scope.editing = !!routeParams.campaignId;
            scope.campaignData = {
                campaignName: '',
                workflowId: '',
                triggerType: '',
                recipientType: 'CLIENT',
                eventType: '',
                campaignMessage: '',
                emailSubject: '',
                active: true,
                repeatsEvery: '1',
                repeatsOnDay: '1'
            };
            scope.selectedChannels = { SMS: true };
            scope.simpleDate = new Date();
            scope.campaignData.time = new Date(0, 0, 0, scope.simpleDate.getHours(), scope.simpleDate.getMinutes(), scope.simpleDate.getSeconds());

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
                return null;
            }

            scope.usesReportAudience = function () {
                return scope.campaignData.triggerType === 'DIRECT' || scope.campaignData.triggerType === 'SCHEDULED';
            };

            scope.selectedChannelList = function () {
                return scope.channelOptions.filter(function (channel) {
                    return scope.selectedChannels[channel.id || channel];
                }).map(function (channel) {
                    return channel.id || channel;
                });
            };

            scope.availableTemplateVariables = function () {
                if (scope.reportData.columnHeaders && scope.reportData.columnHeaders.length) {
                    return scope.reportData.columnHeaders.map(function (header) {
                        return header.columnName;
                    });
                }
                return scope.usesReportAudience() ? scope.reportTemplateVariables : scope.eventTemplateVariables;
            };

            scope.refreshVariableList = function () {
                scope.variableList = scope.availableTemplateVariables();
            };

            scope.useSuggestedMessage = function () {
                var suggested = scope.suggestedMessages[scope.campaignData.eventType];
                if (suggested) {
                    scope.campaignData.campaignMessage = suggested;
                    scope.autoMessage = true;
                }
            };

            scope.hasEmailChannel = function () {
                return !!scope.selectedChannels.EMAIL;
            };

            function toArray(value) {
                if (!value) {
                    return [];
                }
                if (angular.isArray(value)) {
                    return value;
                }
                var items = [];
                angular.forEach(value, function (item, key) {
                    if (key !== '$promise' && key !== '$resolved' && key !== '$cancelRequest') {
                        items.push(item);
                    }
                });
                return items;
            }

            scope.filterBusinessRules = function () {
                scope.filteredBusinessRules = scope.businessRuleOptions;
            };

            scope.onReportChange = function () {
                scope.campaignData.report = _.find(scope.filteredBusinessRules, function (rule) {
                    return rule.reportName === scope.campaignData.reportName;
                });
                if (scope.campaignData.report) {
                    scope.reportSelected(scope.campaignData.report.reportName);
                }
            };

            scope.syncWorkflowId = function () {
                if (!scope.autoWorkflow && scope.campaignData.workflowId) {
                    return;
                }
                if (scope.campaignData.triggerType === 'TRIGGERED' && scope.campaignData.eventType) {
                    scope.campaignData.workflowId = scope.campaignData.eventType.toLowerCase().replace(/_/g, '-');
                    scope.autoWorkflow = true;
                    return;
                }
                if (scope.campaignData.campaignName) {
                    scope.campaignData.workflowId = scope.campaignData.campaignName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                    scope.autoWorkflow = true;
                }
            };

            scope.getBusinessRule = function () {
                scope.filterBusinessRules();
                scope.refreshVariableList();
                scope.syncWorkflowId();
                if (scope.campaignData.triggerType === 'DIRECT') {
                    scope.campaignData.eventType = 'DIRECT';
                } else if (scope.campaignData.triggerType === 'SCHEDULED') {
                    scope.campaignData.eventType = 'SCHEDULED';
                } else if (scope.campaignData.eventType === 'DIRECT' || scope.campaignData.eventType === 'SCHEDULED') {
                    scope.campaignData.eventType = '';
                }
            };

            scope.onEventChange = function () {
                scope.autoWorkflow = true;
                scope.syncWorkflowId();
                if (scope.autoMessage || !scope.campaignData.campaignMessage) {
                    scope.useSuggestedMessage();
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
                    scope.campaignData.repeatsOnDay = scope.campaignData.repeatsOnDay || '1';
                } else if (period == 3) {
                    scope.periodValue = 'month(s)';
                    scope.repeatsEveryOptions = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
                } else if (period == 4) {
                    scope.periodValue = 'year(s)';
                    scope.repeatsEveryOptions = ['1', '2', '3', '4', '5'];
                }
            };

            scope.buildMessageTemplate = function (paramName) {
                scope.campaignData.campaignMessage += ' ${' + paramName + '}';
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
                scope.reportData.columnHeaders = [];
                if (!reportName) {
                    return;
                }
                resourceFactory.runReportsResource.getReport({
                    reportSource: 'FullParameterList',
                    parameterType: true,
                    R_reportListing: "'" + reportName + "'"
                }, function (data) {
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
                if (scope.campaignData.report && scope.campaignData.report.reportId) {
                    resourceFactory.reportsResource.get({ id: scope.campaignData.report.reportId, fields: 'reportParameters' }, function (data) {
                        scope.smsReportParameters = data.reportParameters || [];
                    });
                }
            };

            scope.getColumnHeaders = function () {
                if (!scope.campaignData.report) {
                    return;
                }
                var params = { reportSource: scope.campaignData.report.reportName };
                angular.forEach(scope.reqFields, function (field) {
                    if (field.displayType == 'none') {
                        params[field.inputName] = -1;
                    } else if (scope.formData[field.inputName] !== undefined) {
                        params[field.inputName] = scope.formData[field.inputName];
                    }
                });
                resourceFactory.runReportsResource.getReport(params, function (data) {
                    scope.reportData.columnHeaders = data.columnHeaders || [];
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
                if (scope.campaignData.report) {
                    params.reportName = scope.campaignData.report.reportName;
                }
                return params;
            }

            function constructRecurrence() {
                if (scope.campaignData.triggerType !== 'SCHEDULED' || !scope.campaignData.frequency) {
                    return null;
                }
                var freqMap = { 1: 'DAILY', 2: 'WEEKLY', 3: 'MONTHLY', 4: 'YEARLY' };
                var recurrence = 'FREQ=' + (freqMap[scope.campaignData.frequency] || 'DAILY');
                if (scope.campaignData.repeatsEvery && Number(scope.campaignData.repeatsEvery) > 1) {
                    recurrence += ';INTERVAL=' + scope.campaignData.repeatsEvery;
                }
                if (scope.campaignData.frequency == 2 && scope.campaignData.repeatsOnDay) {
                    var weekDay = _.find(scope.weekDays, function (day) {
                        return String(day.id) === String(scope.campaignData.repeatsOnDay);
                    });
                    if (weekDay && weekDay.value) {
                        recurrence += ';BYDAY=' + String(weekDay.value).substring(0, 2).toUpperCase();
                    }
                }
                return recurrence;
            }

            function parseRecurrence(recurrence) {
                if (!recurrence) {
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
                scope.campaignData.frequency = freqIds[parts.FREQ] || 1;
                scope.campaignData.repeatsEvery = parts.INTERVAL || '1';
                scope.selectedPeriod(scope.campaignData.frequency);
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

            function buildPayload() {
                var channels = scope.selectedChannelList();
                var message = scope.campaignData.campaignMessage;
                var payload = {
                    campaignName: scope.campaignData.campaignName,
                    workflowId: scope.campaignData.workflowId,
                    eventType: (scope.campaignData.eventType || scope.campaignData.triggerType || 'TRIGGERED').toUpperCase(),
                    triggerType: scope.campaignData.triggerType,
                    recipientType: scope.campaignData.recipientType,
                    channels: channels.join(','),
                    emailSubject: scope.hasEmailChannel() ? scope.campaignData.emailSubject : null,
                    emailBody: scope.selectedChannels.EMAIL ? message : null,
                    smsBody: scope.selectedChannels.SMS ? message : null,
                    inAppBody: scope.selectedChannels.IN_APP ? message : null,
                    chatBody: (scope.selectedChannels.WHATSAPP || scope.selectedChannels.TELEGRAM || scope.selectedChannels.SLACK) ? message : null,
                    active: !!scope.campaignData.active
                };
                if (scope.usesReportAudience()) {
                    payload.reportName = (scope.campaignData.report && scope.campaignData.report.reportName) || scope.campaignData.reportName;
                    payload.paramValue = buildParamValue();
                }
                if (scope.campaignData.triggerType === 'SCHEDULED') {
                    var startDate = scope.campaignData.recurrenceStartDate ? new Date(scope.campaignData.recurrenceStartDate) : null;
                    if (startDate && scope.campaignData.time) {
                        startDate.setHours(scope.campaignData.time.getHours());
                        startDate.setMinutes(scope.campaignData.time.getMinutes());
                        startDate.setSeconds(scope.campaignData.time.getSeconds());
                    }
                    payload.recurrenceStartDate = toIsoLocalDateTime(startDate);
                    payload.recurrence = constructRecurrence();
                }
                return payload;
            }

            function populateCampaign(campaign) {
                scope.campaignData.id = campaign.id;
                scope.campaignData.campaignName = campaign.campaignName;
                scope.campaignData.workflowId = campaign.workflowId;
                scope.campaignData.triggerType = campaign.triggerType || 'TRIGGERED';
                scope.campaignData.recipientType = campaign.recipientType || 'CLIENT';
                scope.campaignData.eventType = campaign.eventType;
                scope.campaignData.emailSubject = campaign.emailSubject;
                scope.campaignData.campaignMessage = campaign.smsBody || campaign.emailBody || campaign.inAppBody || campaign.chatBody || '';
                scope.campaignData.active = campaign.active;
                scope.selectedChannels = {};
                angular.forEach((campaign.channels || '').split(','), function (channel) {
                    if (channel.trim()) {
                        scope.selectedChannels[channel.trim()] = true;
                    }
                });
                scope.filterBusinessRules();
                if (campaign.reportName) {
                    scope.campaignData.reportName = campaign.reportName;
                    scope.campaignData.report = _.find(scope.businessRuleOptions, function (rule) {
                        return rule.reportName === campaign.reportName;
                    }) || { reportName: campaign.reportName };
                    scope.reportSelected(campaign.reportName);
                    applyParamValue(campaign.paramValue);
                }
                parseRecurrence(campaign.recurrence);
                var start = parseApiDate(campaign.recurrenceStartDate);
                if (start) {
                    scope.campaignData.recurrenceStartDate = start;
                    scope.campaignData.time = start;
                }
            }

            function normalizeReports(source) {
                return toArray(source).map(function (report) {
                    return {
                        reportId: report.reportId || report.id,
                        reportName: report.reportName,
                        reportType: report.reportType,
                        reportSubType: report.reportSubType,
                        reportDescription: report.reportDescription || report.description
                    };
                }).filter(function (report) {
                    return !!report.reportName && report.reportType !== 'Pentaho';
                });
            }

            function isSmsReport(report) {
                return String((report && report.reportType) || '').toUpperCase() === 'SMS';
            }

            function hasSmsReports() {
                return scope.businessRuleOptions.some(isSmsReport);
            }

            function setReports(source) {
                var reports = normalizeReports(source);
                if (!reports.length) {
                    return;
                }
                var smsReports = reports.filter(isSmsReport);
                if (smsReports.length) {
                    scope.businessRuleOptions = smsReports;
                } else if (!hasSmsReports() && !scope.businessRuleOptions.length) {
                    scope.businessRuleOptions = reports;
                }
                scope.filterBusinessRules();
            }

            function applyTemplateData(data) {
                var eventVars = toArray(data.eventTemplateVariables);
                if (eventVars.length) {
                    scope.eventTemplateVariables = eventVars;
                }
                var reportVars = toArray(data.reportTemplateVariables);
                if (reportVars.length) {
                    scope.reportTemplateVariables = reportVars;
                }
                var options = data.businessRulesAndScheduleOptions || {};
                setReports(data.audienceReports);
                if (!scope.businessRuleOptions.length) {
                    setReports(options.businessRulesOptions);
                }
                var frequencies = toArray(options.frequencyTypeOptions);
                if (frequencies.length) {
                    scope.frequencyTypeOptions = frequencies;
                }
                var weekDays = toArray(options.weekDays);
                if (weekDays.length) {
                    scope.weekDays = weekDays;
                }
                scope.filterBusinessRules();
                scope.refreshVariableList();
            }

            resourceFactory.novuAudienceReportResource.getAll(function (data) {
                setReports(data);
            });

            resourceFactory.smsCampaignTemplateResource.get(function (smsTemplate) {
                setReports(smsTemplate.businessRulesOptions);
                scope.frequencyTypeOptions = toArray(smsTemplate.frequencyTypeOptions).length ? toArray(smsTemplate.frequencyTypeOptions) : scope.frequencyTypeOptions;
                scope.weekDays = toArray(smsTemplate.weekDays).length ? toArray(smsTemplate.weekDays) : scope.weekDays;
                scope.filterBusinessRules();
            });

            resourceFactory.reportsResource.getReport({}, function (data) {
                if (!scope.businessRuleOptions.length) {
                    setReports(data);
                }
            });

            resourceFactory.novuCampaignTemplateResource.get({}, function (data) {
                applyTemplateData(data);
                if (scope.editing) {
                    resourceFactory.novuCampaignResource.get({ campaignId: routeParams.campaignId }, populateCampaign);
                }
            }, function () {
                if (scope.editing) {
                    resourceFactory.novuCampaignResource.get({ campaignId: routeParams.campaignId }, populateCampaign);
                }
            });

            scope.refreshVariableList();

            scope.submit = function () {
                scope.syncWorkflowId();
                if (!scope.selectedChannelList().length) {
                    return;
                }
                if (WizardHandler.wizard().currentStepNumber() != scope.noOfTabs) {
                    if (WizardHandler.wizard().currentStepNumber() == 1) {
                        scope.getColumnHeaders();
                    }
                    WizardHandler.wizard().next();
                    return;
                }
                var payload = buildPayload();
                var success = function (data) {
                    location.path('/viewnovucampaign/' + (data.id || routeParams.campaignId));
                };
                if (scope.editing) {
                    resourceFactory.novuCampaignResource.update({ campaignId: routeParams.campaignId }, payload, success);
                } else {
                    resourceFactory.novuCampaignResource.save({}, payload, success);
                }
            };
        }
    });
    mifosX.ng.application.controller('CreateNovuCampaignController', ['$scope', 'WizardHandler', 'ResourceFactory', '$location', 'dateFilter', '$routeParams',
        mifosX.controllers.CreateNovuCampaignController]).run(function ($log) {
        $log.info('CreateNovuCampaignController initialized');
    });
}(mifosX.controllers || {}));
