(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewVoiceCallbackController: function (scope, routeParams, resourceFactory, location) {
            scope.callback = null;

            resourceFactory.africasTalkingVoiceCallbackResource.get({ callbackId: routeParams.callbackId }, function (data) {
                scope.callback = data;
            });

            scope.dispatchCallback = function () {
                resourceFactory.africasTalkingVoiceCallbackResource.dispatch({ callbackId: routeParams.callbackId }, {}, function () {
                    resourceFactory.africasTalkingVoiceCallbackResource.get({ callbackId: routeParams.callbackId }, function (data) {
                        scope.callback = data;
                    });
                });
            };

            scope.routeToVoiceCall = function (callId) {
                location.path('/viewvoicecall/' + callId);
            };
        }
    });
    mifosX.ng.application.controller('ViewVoiceCallbackController', ['$scope', '$routeParams', 'ResourceFactory', '$location', mifosX.controllers.ViewVoiceCallbackController]).run(function ($log) {
        $log.info("ViewVoiceCallbackController initialized");
    });
}(mifosX.controllers || {}));
