describe("AfricasTalkingCommunicationsController", function () {
    var scope, messageCalls;

    beforeEach(function () {
        scope = {};
        messageCalls = [];

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
            africasTalkingVoiceResource: { getAll: getAll },
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
});
