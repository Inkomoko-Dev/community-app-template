(function (module) {
    mifosX.controllers = _.extend(module, {
        NovuCampaignsController: function (scope, resourceFactory, location) {
            scope.campaigns = [];
            scope.filterText = '';

            scope.routeTo = function (id) {
                location.path('/viewnovucampaign/' + id);
            };

            scope.statusLabel = function (campaign) {
                return campaign && campaign.active ? 'Active' : 'Inactive';
            };

            scope.syncSubscribers = function () {
                scope.syncing = true;
                scope.syncResult = null;
                resourceFactory.novuSubscriberSyncResource.save({}, {}, function (data) {
                    scope.syncing = false;
                    scope.syncResult = data;
                }, function () {
                    scope.syncing = false;
                });
            };

            resourceFactory.novuCampaignResource.getAll({}, function (data) {
                scope.campaigns = data;
            });
        }
    });
    mifosX.ng.application.controller('NovuCampaignsController', ['$scope', 'ResourceFactory', '$location',
        mifosX.controllers.NovuCampaignsController]).run(function ($log) {
        $log.info('NovuCampaignsController initialized');
    });
}(mifosX.controllers || {}));
