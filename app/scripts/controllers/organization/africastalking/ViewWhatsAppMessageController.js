(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewWhatsAppMessageController: function (scope, routeParams, resourceFactory) {
            scope.message = null;
            resourceFactory.africasTalkingMessageResource.get({ messageId: routeParams.messageId }, function (data) {
                scope.message = data;
            });
        }
    });
    mifosX.ng.application.controller('ViewWhatsAppMessageController', ['$scope', '$routeParams', 'ResourceFactory', mifosX.controllers.ViewWhatsAppMessageController]).run(function ($log) {
        $log.info("ViewWhatsAppMessageController initialized");
    });
}(mifosX.controllers || {}));
