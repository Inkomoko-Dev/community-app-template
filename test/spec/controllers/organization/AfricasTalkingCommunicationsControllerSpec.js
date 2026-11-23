describe("AfricasTalkingCommunicationsController", function () {
    var scope, messageCalls, voiceCalls;

    beforeEach(function () {
        scope = {};
        messageCalls = [];
        voiceCalls = [];

        var getAll = function () {
            var callback = arguments[arguments.length - 1];
            if (angular.isFunction(callback)) {
                callback([]);
            }
        };
        var get = function () {
            var callback = arguments[arguments.length - 1];
            if (angular.isFunction(callback)) {
                callback([]);
            }
        };
        var resourceFactory = {
            africasTalkingMessageResource: {
                getAll: jasmine.createSpy("getAll").andCallFake(function (params, callback) {
                    messageCalls.push(angular.copy(params));
                    callback([]);
                })
            },
            africasTalkingVoiceResource: {
                getAll: jasmine.createSpy("getAll").andCallFake(function (params, callback) {
                    voiceCalls.push(angular.copy(params));
                    callback([]);
                })
            },
            whatsAppInteractiveDashboardResource: { get: get },
            whatsAppInteractiveTicketResource: { getAll: getAll },
            whatsAppInteractiveConfigResource: { getAll: getAll },
            whatsAppInteractiveBusinessHoursResource: { getAll: getAll },
            whatsAppInteractiveMenuDefinitionResource: { getAll: getAll },
            whatsAppInteractiveMenuOptionResource: { getAll: getAll },
            africasTalkingVoiceIvrMenuDefinitionResource: { getAll: getAll },
            africasTalkingVoiceIvrMenuOptionResource: { getAll: getAll },
            africasTalkingVoiceDashboardResource: { get: get },
            africasTalkingVoiceCallbackResource: { getAll: getAll },
            africasTalkingVoiceVoicemailResource: { getAll: getAll },
            africasTalkingVoiceQueueResource: { getAll: getAll }
        };

        new mifosX.controllers.AfricasTalkingCommunicationsController(scope, resourceFactory, {});
    });

    it("sends exactly the selected status to the messages endpoint", function () {
        scope.selectMessageStatus('FAILED');

        expect(scope.selectedStatus).toBe('FAILED');
        expect(messageCalls[messageCalls.length - 1]).toEqual({ status: 'FAILED' });
    });

    it("uses Voice provider statuses when filtering calls", function () {
        scope.selectVoiceStatus('NO_ANSWER');

        expect(scope.voiceSelectedStatus).toBe('NO_ANSWER');
        expect(voiceCalls[voiceCalls.length - 1]).toEqual({ status: 'NO_ANSWER' });
        expect(scope.voiceStatusTabs.map(function (tab) { return tab.id; })).toEqual([
            'ALL', 'INITIATED', 'RINGING', 'ANSWERED', 'COMPLETED', 'FAILED', 'BUSY', 'REJECTED', 'NO_ANSWER'
        ]);
    });
});
