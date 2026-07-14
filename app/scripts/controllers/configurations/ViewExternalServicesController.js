/**
 * Created by 27 on 05-08-2015.
 */
(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewExternalServicesController: function ($scope, resourceFactory, $routeParams, location) {
            $scope.Configs = [];
            $scope.whitelistedNumbers = [];
            $scope.smsWhitelistEnforced = false;
            $scope.externalServicesType = $routeParams.externalServicesType;
            //$scope.name = $routeParams.name;
            resourceFactory.externalServicesResource.get({id: $scope.externalServicesType}, function (data) {
                for (var i in data) {
                    if(data[i] != null && data[i].name != null) {
                        data[i].name.replace(/ /g, '');
                        if (!angular.equals(data[i].name, "")) {
                            if (data[i].name === 'sms_whitelist_enforced') {
                                $scope.smsWhitelistEnforced = data[i].value === 'true';
                                continue;
                            }
                            if (data[i].name === 'sms_whitelist') {
                                $scope.whitelistedNumbers = (data[i].value || '')
                                    .split(/[,;\s]+/)
                                    .map(function (number) { return number.trim(); })
                                    .filter(function (number) { return number.length > 0; });
                            }
                            $scope.Configs.push(data[i]);

                        }
                    }
                }
            });

            $scope.cancel = function () {
                location.path('/externalservices');
            };

        }

    });
    mifosX.ng.application.controller('ViewExternalServicesController', ['$scope', 'ResourceFactory', '$routeParams', '$location', mifosX.controllers.ViewExternalServicesController]).run(function ($log) {
        $log.info("ViewExternalServicesController initialized");
    });

}(mifosX.controllers || {}));
