(function (module) {
    mifosX.controllers = _.extend(module, {
        NovuCampaignsController: function (scope, resourceFactory) {
            scope.campaigns = [];
            scope.logs = [];
            scope.events = [];
            scope.recipientTypes = ['CLIENT', 'STAFF', 'BOTH'];
            scope.channelOptions = ['IN_APP', 'EMAIL', 'SMS'];
            scope.formData = { recipientType: 'CLIENT', active: false };
            scope.selectedChannels = { IN_APP: true, EMAIL: true, SMS: true };
            scope.editing = false;

            scope.load = function () {
                resourceFactory.novuCampaignResource.getAll({}, function (data) {
                    scope.campaigns = data;
                });
                resourceFactory.novuEventResource.get({}, function (data) {
                    scope.events = data.loanEvents || [];
                });
                resourceFactory.novuLogResource.get({ limit: 200 }, function (data) {
                    scope.logs = data.pageItems || [];
                });
            };

            scope.edit = function (campaign) {
                scope.editing = true;
                scope.formData = angular.copy(campaign);
                scope.customEvent = scope.events.indexOf(campaign.eventType) === -1;
                scope.selectedChannels = {};
                angular.forEach((campaign.channels || '').split(','), function (channel) {
                    scope.selectedChannels[channel.trim()] = true;
                });
            };

            scope.cancel = function () {
                scope.editing = false;
                scope.customEvent = false;
                scope.formData = { recipientType: 'CLIENT', active: false };
                scope.selectedChannels = { IN_APP: true, EMAIL: true, SMS: true };
            };

            scope.submit = function () {
                var payload = angular.copy(scope.formData);
                payload.channels = scope.channelOptions.filter(function (channel) {
                    return scope.selectedChannels[channel];
                }).join(',');
                var success = function () {
                    scope.cancel();
                    scope.load();
                };
                if (scope.editing) {
                    resourceFactory.novuCampaignResource.update({ campaignId: payload.id }, payload, success);
                } else {
                    resourceFactory.novuCampaignResource.save({}, payload, success);
                }
            };

            scope.remove = function (campaign) {
                if (confirm('Delete Novu campaign "' + campaign.campaignName + '"?')) {
                    resourceFactory.novuCampaignResource.delete({ campaignId: campaign.id }, {}, scope.load);
                }
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

            scope.load();
        }
    });
    mifosX.ng.application.controller('NovuCampaignsController', ['$scope', 'ResourceFactory',
        mifosX.controllers.NovuCampaignsController]).run(function ($log) {
        $log.info('NovuCampaignsController initialized');
    });
}(mifosX.controllers || {}));
