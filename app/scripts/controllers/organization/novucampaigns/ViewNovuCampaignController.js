(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewNovuCampaignController: function (scope, routeParams, location, resourceFactory, dateFilter, novuCampaignHelper) {
            scope.campaignData = {};
            scope.logs = [];

            scope.displayDate = function (value) {
                var date = novuCampaignHelper.parseDate(value);
                return date ? dateFilter(date, scope.dft || 'dd MMMM yyyy HH:mm:ss') : '';
            };

            scope.campaignMessage = function () {
                return scope.campaignData.smsBody || scope.campaignData.emailBody || scope.campaignData.inAppBody || scope.campaignData.chatBody;
            };

            function load() {
                resourceFactory.novuCampaignResource.get({ campaignId: routeParams.campaignId }, function (data) {
                    scope.campaignData = data;
                });
                resourceFactory.novuLogResource.get({ limit: 200 }, function (data) {
                    scope.logs = _.filter(data.pageItems || [], function (log) {
                        return String(log.campaignId) === String(routeParams.campaignId);
                    });
                });
            }

            function payloadFromCampaign(active) {
                return {
                    campaignName: scope.campaignData.campaignName,
                    workflowId: scope.campaignData.workflowId,
                    eventType: scope.campaignData.eventType,
                    triggerType: scope.campaignData.triggerType,
                    recipientType: scope.campaignData.recipientType,
                    channels: scope.campaignData.channels,
                    emailSubject: scope.campaignData.emailSubject,
                    emailBody: scope.campaignData.emailBody,
                    smsBody: scope.campaignData.smsBody,
                    inAppBody: scope.campaignData.inAppBody,
                    chatBody: scope.campaignData.chatBody,
                    reportName: scope.campaignData.reportName,
                    paramValue: novuCampaignHelper.parseJson(scope.campaignData.paramValue),
                    recurrence: scope.campaignData.recurrence,
                    recurrenceStartDate: novuCampaignHelper.toIsoLocalDateTime(scope.campaignData.recurrenceStartDate),
                    active: active
                };
            }

            scope.sendNow = function () {
                scope.sending = true;
                resourceFactory.novuCampaignTriggerResource.save({ campaignId: routeParams.campaignId }, {}, function (data) {
                    scope.sending = false;
                    scope.sendResult = data;
                    load();
                }, function () {
                    scope.sending = false;
                });
            };

            scope.toggleActive = function () {
                resourceFactory.novuCampaignResource.update({ campaignId: routeParams.campaignId }, payloadFromCampaign(!scope.campaignData.active), load);
            };

            scope.deleteCampaign = function () {
                if (confirm('Delete Novu campaign "' + scope.campaignData.campaignName + '"?')) {
                    resourceFactory.novuCampaignResource.delete({ campaignId: routeParams.campaignId }, {}, function () {
                        location.path('/novucampaigns');
                    });
                }
            };

            load();
        }
    });
    mifosX.ng.application.controller('ViewNovuCampaignController', ['$scope', '$routeParams', '$location', 'ResourceFactory', 'dateFilter', 'NovuCampaignHelper',
        mifosX.controllers.ViewNovuCampaignController]).run(function ($log) {
        $log.info('ViewNovuCampaignController initialized');
    });
}(mifosX.controllers || {}));
