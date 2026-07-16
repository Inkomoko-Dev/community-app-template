(function (module) {
    mifosX.controllers = _.extend(module, {
        WhatsAppCampaignsController: function (scope, resourceFactory, location, translate) {
            scope.translate = translate;
            scope.whatsAppCampaignsPerPage = 15;
            scope.whatsAppCampaigns = [];

            scope.routeTo = function (id) {
                location.path('/viewwhatsappcampaign/' + id);
            };

            if (!scope.searchCriteria.criterias) {
                scope.searchCriteria.criterias = null;
                scope.saveSC();
            }

            scope.initPage = function () {
                resourceFactory.whatsAppCampaignResource.getAll({}, function (data) {
                    scope.whatsAppCampaigns = data;
                });
            };

            scope.initPage();

            scope.filterText = scope.searchCriteria.criterias || '';

            scope.onFilter = function () {
                scope.searchCriteria.criterias = scope.filterText;
                scope.saveSC();
            };
        }
    });
    mifosX.ng.application.controller('WhatsAppCampaignsController', ['$scope', 'ResourceFactory', '$location', '$translate', mifosX.controllers.WhatsAppCampaignsController]).run(function ($log) {
        $log.info("WhatsAppCampaignsController initialized");
    });
}(mifosX.controllers || {}));
