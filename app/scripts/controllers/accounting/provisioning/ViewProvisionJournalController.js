(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewProvisionJournalController: function (scope, routeParams, resourceFactory) {
            scope.journal = null;
            scope.entryPath = '';

            resourceFactory.provisioningJournals.get({journalId: routeParams.journalId}, function (data) {
                scope.journal = data;
                if (data.entryId) {
                    scope.entryPath = '/' + data.entryId;
                }
            });
        }
    });
    mifosX.ng.application.controller('ViewProvisionJournalController', ['$scope', '$routeParams', 'ResourceFactory', mifosX.controllers.ViewProvisionJournalController]).run(function ($log) {
        $log.info("ViewProvisionJournalController initialized");
    });
}(mifosX.controllers || {}));
