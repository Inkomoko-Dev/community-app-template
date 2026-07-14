(function (module) {
    mifosX.controllers = _.extend(module, {
        AfricasTalkingCommunicationsController: function (scope, resourceFactory, location) {
            scope.messages = [];
            scope.voiceCalls = [];
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

            scope.routeToMessage = function (id) {
                location.path('/viewcommunication/' + id);
            };

            scope.routeToVoiceCall = function (id) {
                location.path('/viewvoicecall/' + id);
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

            scope.testConnectivity = function (channel) {
                resourceFactory.africasTalkingConnectivityResource.get({ channel: channel || 'all' }, function (data) {
                    scope.connectivityResult = data;
                }, function (error) {
                    scope.loadError = 'Connectivity test failed. HTTP '
                        + (error && error.status ? error.status : 'unknown');
                });
            };

            scope.refreshAll = function () {
                // Load sequentially to avoid saturating browser/backend connections.
                scope.loadMessages(function () {
                    scope.loadVoiceCalls();
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
