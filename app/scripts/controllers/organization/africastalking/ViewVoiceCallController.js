(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewVoiceCallController: function (scope, routeParams, location, resourceFactory) {
            resourceFactory.africasTalkingVoiceResource.getAll(function (data) {
                scope.callLog = _.find(data, function (callLog) {
                    return callLog.id == routeParams.callId;
                });
            });
        }
    });
    mifosX.ng.application.controller('ViewVoiceCallController', ['$scope', '$routeParams', '$location', 'ResourceFactory', mifosX.controllers.ViewVoiceCallController]).run(function ($log) {
        $log.info("ViewVoiceCallController initialized");
    });
}(mifosX.controllers || {}));
