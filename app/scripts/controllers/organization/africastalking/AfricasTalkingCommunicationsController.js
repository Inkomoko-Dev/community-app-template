(function (module) {
    mifosX.controllers = _.extend(module, {
        AfricasTalkingCommunicationsController: function (scope, resourceFactory, location) {
            scope.messages = [];
            scope.voiceCalls = [];
            scope.voiceDashboard = null;
            scope.voiceCallbacks = [];
            scope.voiceVoicemails = [];
            scope.voiceQueue = [];
            scope.connectivityResult = null;
            scope.messagesPerPage = 15;
            scope.voiceCallsPerPage = 15;
            scope.filterText = '';
            scope.voiceFilterText = '';
            scope.selectedStatus = 'ALL';
            scope.loadingMessages = false;
            scope.loadingVoiceCalls = false;
            scope.loadError = null;
            scope.statusTabs = [
                { id: 'ALL', name: 'All Messages' },
                { id: 'PENDING', name: 'Pending' },
                { id: 'SENT', name: 'Sent' },
                { id: 'DELIVERED', name: 'Delivered' },
                { id: 'READ', name: 'Read' },
                { id: 'FAILED', name: 'Failed' }
            ];

            scope.interactiveDashboard = null;
            scope.supportTickets = [];
            scope.selectedTicketStatus = 'ALL';
            scope.ticketStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
            scope.conversationSearch = {
                phoneNumber: '',
                clientId: '',
                text: '',
                fromDate: '',
                toDate: '',
                recipientType: '',
                limit: 50
            };
            scope.conversationResults = [];
            scope.configAreas = [];
            scope.configSaveMessage = null;
            scope.businessHours = [];
            scope.dayNames = {
                1: 'Monday',
                2: 'Tuesday',
                3: 'Wednesday',
                4: 'Thursday',
                5: 'Friday',
                6: 'Saturday',
                7: 'Sunday'
            };
            scope.menuDefinitions = [];
            scope.menuOptions = [];
            scope.menuFilter = { menuKey: 'MAIN', languageCode: 'en' };
            scope.menuActionTypes = ['LOAN_SERVICE', 'CONTENT', 'ADVISOR_HANDOFF', 'LANGUAGE_SELECT', 'SUBMENU'];
            scope.newMenuOption = {
                menuKey: 'MAIN',
                languageCode: 'en',
                optionNumber: 1,
                optionLabel: '',
                actionType: 'SUBMENU',
                actionTarget: '',
                enabled: true
            };

            scope.routeToMessage = function (id) {
                location.path('/viewcommunication/' + id);
            };

            scope.routeToVoiceCall = function (id) {
                location.path('/viewvoicecall/' + id);
            };

            scope.routeToTicket = function (id) {
                location.path('/viewwhatsappticket/' + id);
            };

            scope.filterMessages = function (message) {
                if (scope.selectedStatus !== 'ALL' && message.status !== scope.selectedStatus) {
                    return false;
                }
                if (!scope.filterText) {
                    return true;
                }
                var needle = scope.filterText.toLowerCase();
                return (message.phoneNumber && message.phoneNumber.toLowerCase().indexOf(needle) > -1)
                    || (message.messageBody && message.messageBody.toLowerCase().indexOf(needle) > -1)
                    || (message.status && message.status.toLowerCase().indexOf(needle) > -1);
            };

            scope.filterVoiceCalls = function (callLog) {
                if (!scope.voiceFilterText) {
                    return true;
                }
                var needle = scope.voiceFilterText.toLowerCase();
                return (callLog.callerNumber && callLog.callerNumber.toLowerCase().indexOf(needle) > -1)
                    || (callLog.destinationNumber && callLog.destinationNumber.toLowerCase().indexOf(needle) > -1)
                    || (callLog.status && callLog.status.toLowerCase().indexOf(needle) > -1);
            };

            scope.loadMessages = function (done) {
                scope.loadingMessages = true;
                scope.loadError = null;
                resourceFactory.africasTalkingMessageResource.getAll(function (data) {
                    scope.messages = data || [];
                    scope.loadingMessages = false;
                    if (angular.isFunction(done)) {
                        done();
                    }
                }, function (error) {
                    scope.loadingMessages = false;
                    scope.loadError = 'Failed to load WhatsApp messages. HTTP '
                        + (error && error.status ? error.status : 'unknown');
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.loadVoiceCalls = function (done) {
                scope.loadingVoiceCalls = true;
                resourceFactory.africasTalkingVoiceResource.getAll(function (data) {
                    scope.voiceCalls = data || [];
                    scope.loadingVoiceCalls = false;
                    if (angular.isFunction(done)) {
                        done();
                    }
                }, function (error) {
                    scope.loadingVoiceCalls = false;
                    scope.loadError = (scope.loadError ? scope.loadError + ' ' : '')
                        + 'Failed to load voice calls. HTTP '
                        + (error && error.status ? error.status : 'unknown');
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.loadInteractiveDashboard = function (done) {
                resourceFactory.whatsAppInteractiveDashboardResource.get(function (data) {
                    scope.interactiveDashboard = data;
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.loadSupportTickets = function (done) {
                var params = {};
                if (scope.selectedTicketStatus !== 'ALL') {
                    params.status = scope.selectedTicketStatus;
                }
                resourceFactory.whatsAppInteractiveTicketResource.getAll(params, function (data) {
                    scope.supportTickets = data || [];
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.searchConversations = function () {
                var params = {};
                var formatDate = function (value) {
                    if (!value) {
                        return null;
                    }
                    if (angular.isDate(value)) {
                        return value.getFullYear() + '-'
                            + ('0' + (value.getMonth() + 1)).slice(-2) + '-'
                            + ('0' + value.getDate()).slice(-2);
                    }
                    return value;
                };
                if (scope.conversationSearch.phoneNumber) {
                    params.phoneNumber = scope.conversationSearch.phoneNumber;
                }
                if (scope.conversationSearch.clientId) {
                    params.clientId = scope.conversationSearch.clientId;
                }
                if (scope.conversationSearch.text) {
                    params.text = scope.conversationSearch.text;
                }
                var fromDate = formatDate(scope.conversationSearch.fromDate);
                var toDate = formatDate(scope.conversationSearch.toDate);
                if (fromDate) {
                    params.fromDate = fromDate;
                }
                if (toDate) {
                    params.toDate = toDate;
                }
                if (scope.conversationSearch.recipientType) {
                    params.recipientType = scope.conversationSearch.recipientType;
                }
                if (scope.conversationSearch.limit) {
                    params.limit = scope.conversationSearch.limit;
                }
                resourceFactory.whatsAppInteractiveConversationResource.search(params, function (data) {
                    scope.conversationResults = data || [];
                });
            };

            scope.loadConfigAreas = function (done) {
                resourceFactory.whatsAppInteractiveConfigResource.getAll(function (data) {
                    scope.configAreas = data || [];
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.isBooleanSetting = function (key, value) {
                return typeof value === 'boolean' || value === 'true' || value === 'false';
            };

            scope.asBoolean = function (value) {
                return value === true || value === 'true';
            };

            scope.setBooleanSetting = function (area, key, checked) {
                area.settings[key] = checked;
            };

            scope.saveConfigArea = function (area) {
                scope.configSaveMessage = null;
                var payload = { settings: {} };
                angular.forEach(area.settings, function (value, key) {
                    payload.settings[key] = value;
                });
                resourceFactory.whatsAppInteractiveConfigResource.update({ areaCode: area.area }, payload, function () {
                    scope.configSaveMessage = 'Saved ' + area.label + '.';
                });
            };

            scope.loadBusinessHours = function (done) {
                resourceFactory.whatsAppInteractiveBusinessHoursResource.getAll(function (data) {
                    scope.businessHours = data || [];
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.saveBusinessHours = function (hours) {
                resourceFactory.whatsAppInteractiveBusinessHoursResource.update({ businessHoursId: hours.id }, {
                    openTime: hours.openTime,
                    closeTime: hours.closeTime,
                    enabled: hours.enabled
                });
            };

            scope.loadMenuDefinitions = function (done) {
                var params = {};
                if (scope.menuFilter.menuKey) {
                    params.menuKey = scope.menuFilter.menuKey;
                }
                resourceFactory.whatsAppInteractiveMenuDefinitionResource.getAll(params, function (data) {
                    scope.menuDefinitions = data || [];
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.loadMenuOptions = function (done) {
                var params = {};
                if (scope.menuFilter.menuKey) {
                    params.menuKey = scope.menuFilter.menuKey;
                }
                if (scope.menuFilter.languageCode) {
                    params.languageCode = scope.menuFilter.languageCode;
                }
                resourceFactory.whatsAppInteractiveMenuOptionResource.getAll(params, function (data) {
                    scope.menuOptions = data || [];
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.saveMenuDefinition = function (definition) {
                resourceFactory.whatsAppInteractiveMenuDefinitionResource.update({
                    menuKey: definition.menuKey,
                    languageCode: definition.languageCode
                }, {
                    headerText: definition.headerText,
                    parentMenuKey: definition.parentMenuKey,
                    enabled: definition.enabled
                });
            };

            scope.saveMenuOption = function (option) {
                resourceFactory.whatsAppInteractiveMenuOptionResource.update({ optionId: option.id }, {
                    optionLabel: option.optionLabel,
                    optionNumber: option.optionNumber,
                    actionType: option.actionType,
                    actionTarget: option.actionTarget,
                    enabled: option.enabled
                });
            };

            scope.deleteMenuOption = function (optionId) {
                resourceFactory.whatsAppInteractiveMenuOptionResource.delete({ optionId: optionId }, function () {
                    scope.loadMenuOptions();
                });
            };

            scope.createMenuOption = function () {
                resourceFactory.whatsAppInteractiveMenuOptionResource.save({}, scope.newMenuOption, function () {
                    scope.newMenuOption = {
                        menuKey: scope.menuFilter.menuKey || '',
                        languageCode: scope.menuFilter.languageCode || 'en',
                        optionNumber: 1,
                        optionLabel: '',
                        actionType: 'SUBMENU',
                        actionTarget: '',
                        enabled: true
                    };
                    scope.loadMenuOptions();
                });
            };

            scope.loadVoiceDashboard = function (done) {
                resourceFactory.africasTalkingVoiceDashboardResource.get(function (data) {
                    scope.voiceDashboard = data;
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.loadVoiceCallbacks = function (done) {
                resourceFactory.africasTalkingVoiceCallbackResource.getAll(function (data) {
                    scope.voiceCallbacks = data || [];
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.loadVoiceVoicemails = function (done) {
                resourceFactory.africasTalkingVoiceVoicemailResource.getAll(function (data) {
                    scope.voiceVoicemails = data || [];
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.loadVoiceQueue = function (done) {
                resourceFactory.africasTalkingVoiceQueueResource.getAll(function (data) {
                    scope.voiceQueue = data || [];
                    if (angular.isFunction(done)) {
                        done();
                    }
                });
            };

            scope.dispatchCallback = function (callbackId) {
                resourceFactory.africasTalkingVoiceCallbackResource.dispatch({ callbackId: callbackId }, {}, function () {
                    scope.loadVoiceCallbacks();
                    scope.loadVoiceCalls();
                });
            };

            scope.testConnectivity = function (channel) {
                resourceFactory.africasTalkingConnectivityResource.get({ channel: channel || 'all' }, function (data) {
                    scope.connectivityResult = data;
                }, function (error) {
                    scope.loadError = 'Connectivity test failed. HTTP '
                        + (error && error.status ? error.status : 'unknown');
                });
            };

            scope.refreshAll = function () {
                scope.loadMessages(function () {
                    scope.loadVoiceCalls(function () {
                        scope.loadInteractiveDashboard();
                        scope.loadSupportTickets();
                        scope.loadConfigAreas();
                        scope.loadBusinessHours();
                        scope.loadMenuDefinitions(function () {
                            scope.loadMenuOptions();
                        });
                        scope.loadVoiceDashboard();
                        scope.loadVoiceCallbacks();
                        scope.loadVoiceVoicemails();
                        scope.loadVoiceQueue();
                    });
                });
            };

            scope.initPage = function () {
                scope.refreshAll();
            };

            scope.initPage();
        }
    });
    mifosX.ng.application.controller('AfricasTalkingCommunicationsController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.AfricasTalkingCommunicationsController]).run(function ($log) {
        $log.info("AfricasTalkingCommunicationsController initialized");
    });
}(mifosX.controllers || {}));
