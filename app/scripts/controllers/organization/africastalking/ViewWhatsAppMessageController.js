(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewWhatsAppMessageController: function (scope, routeParams, location, resourceFactory) {
            resourceFactory.africasTalkingMessageResource.getAll(function (data) {
                scope.message = _.find(data, function (message) {
                    return message.id == routeParams.messageId;
                });
            });
        }
    });
    mifosX.ng.application.controller('ViewWhatsAppMessageController', ['$scope', '$routeParams', '$location', 'ResourceFactory', mifosX.controllers.ViewWhatsAppMessageController]).run(function ($log) {
        $log.info("ViewWhatsAppMessageController initialized");
    });
}(mifosX.controllers || {}));
