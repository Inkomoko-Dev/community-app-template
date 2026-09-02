(function (module) {
    mifosX.controllers = _.extend(module, {
        PartnerClientHistoryController: function (scope, resourceFactory, location, routeParams) {
            scope.clientId = routeParams.id;
            scope.history = [];

            resourceFactory.clientResource.get({clientId: scope.clientId}, function (data) {
                scope.client = data;
            });

            resourceFactory.partnerClientHistoryResource.getAll({clientId: scope.clientId}, function (data) {
                if (angular.isArray(data)) {
                    scope.history = data;
                } else if (data && angular.isArray(data.pageItems)) {
                    scope.history = data.pageItems;
                } else {
                    scope.history = [];
                }
            }, function (error) {
                console.error('Error fetching partner history:', error);
                scope.history = [];
            });

            scope.routeToClient = function () {
                location.path('/viewclient/' + scope.clientId);
            };

            scope.formatPartnerCode = function (partnerCode) {
                if (!partnerCode) {
                    return '-';
                }
                return partnerCode.toUpperCase();
            };

            scope.formatAction = function (actionType) {
                if (!actionType) {
                    return '-';
                }
                return actionType.replace(/_/g, ' ');
            };
        }
    });
    mifosX.ng.application.controller('PartnerClientHistoryController', ['$scope', 'ResourceFactory', '$location', '$routeParams', mifosX.controllers.PartnerClientHistoryController]);
}(mifosX.controllers));
