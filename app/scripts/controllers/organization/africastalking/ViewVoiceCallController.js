(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewVoiceCallController: function (scope, routeParams, resourceFactory) {
            scope.callLog = null;
            resourceFactory.africasTalkingVoiceResource.get({ callId: routeParams.callId }, function (data) {
                scope.callLog = data;
            });
        }
    });
    mifosX.ng.application.controller('ViewVoiceCallController', ['$scope', '$routeParams', 'ResourceFactory', mifosX.controllers.ViewVoiceCallController]).run(function ($log) {
        $log.info("ViewVoiceCallController initialized");
    });
}(mifosX.controllers || {}));
