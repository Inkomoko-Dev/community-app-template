(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewWhatsAppCampaignController: function (scope, routeParams, location, resourceFactory, $uibModal, dateFilter, route) {
            resourceFactory.whatsAppCampaignResource.get({campaignId: routeParams.campaignId}, function (data) {
                scope.campaignData = data;
            });

            scope.activateWhatsAppCampaign = function () {
                $uibModal.open({
                    templateUrl: 'activatewhatsappcampaign.html',
                    controller: WhatsAppCampaignActivationCtrl
                });
            };

            var WhatsAppCampaignActivationCtrl = function ($scope, $uibModalInstance) {
                $scope.activate = function () {
                    $scope.activationData = {activationDate: dateFilter($scope.activationDate, scope.df), dateFormat: scope.df, locale: scope.optlang.code};
                    resourceFactory.whatsAppCampaignResource.withCommand({campaignId: routeParams.campaignId, command: 'activate'}, $scope.activationData, function () {
                        $uibModalInstance.close('activate');
                        route.reload();
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.closeWhatsAppCampaign = function () {
                $uibModal.open({
                    templateUrl: 'closewhatsappcampaign.html',
                    controller: WhatsAppCampaignCloseCtrl
                });
            };

            var WhatsAppCampaignCloseCtrl = function ($scope, $uibModalInstance) {
                $scope.closeCampaign = function () {
                    $scope.closureData = {closureDate: dateFilter($scope.closureDate, scope.df), dateFormat: scope.df, locale: scope.optlang.code};
                    resourceFactory.whatsAppCampaignResource.withCommand({campaignId: routeParams.campaignId, command: 'close'}, $scope.closureData, function () {
                        $uibModalInstance.close('close');
                        route.reload();
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.reActivateWhatsAppCampaign = function () {
                $uibModal.open({
                    templateUrl: 'reactivatewhatsappcampaign.html',
                    controller: WhatsAppCampaignReActivateCtrl
                });
            };

            var WhatsAppCampaignReActivateCtrl = function ($scope, $uibModalInstance) {
                $scope.reactivate = function () {
                    $scope.reActivationData = {activationDate: dateFilter($scope.activationDate, scope.df), dateFormat: scope.df, locale: scope.optlang.code};
                    resourceFactory.whatsAppCampaignResource.withCommand({campaignId: routeParams.campaignId, command: 'reactivate'}, $scope.reActivationData, function () {
                        $uibModalInstance.close('reactivate');
                        route.reload();
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.deleteWhatsAppCampaign = function () {
                $uibModal.open({
                    templateUrl: 'deletewhatsappcampaign.html',
                    controller: WhatsAppCampaignDeleteCtrl
                });
            };

            var WhatsAppCampaignDeleteCtrl = function ($scope, $uibModalInstance) {
                $scope.delete = function () {
                    resourceFactory.whatsAppCampaignResource.delete({campaignId: routeParams.campaignId}, function () {
                        $uibModalInstance.close('delete');
                        location.path('/whatsappcampaigns');
                    });
                };
                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };
        }
    });
    mifosX.ng.application.controller('ViewWhatsAppCampaignController', ['$scope', '$routeParams', '$location', 'ResourceFactory', '$uibModal', 'dateFilter', '$route', mifosX.controllers.ViewWhatsAppCampaignController]).run(function ($log) {
        $log.info("ViewWhatsAppCampaignController initialized");
    });
}(mifosX.controllers || {}));
