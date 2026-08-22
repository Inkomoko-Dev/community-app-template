(function (module) {
    mifosX.controllers = _.extend(module, {
        PartnerClientHistoryController: function (scope, resourceFactory, location, routeParams) {
            scope.clientId = routeParams.id;
            scope.history = [];

            // Fetch client details
            resourceFactory.clientResource.get({clientId: scope.clientId}, function(data) {
                scope.client = data;
            });

            // Fetch partner assignment history
            resourceFactory.partnerClientHistoryResource.getAll({clientId: scope.clientId}, function(data) {
                scope.history = data;
            }, function(error) {
                console.error('Error fetching partner history:', error);
                scope.history = [];
            });

            scope.routeToClient = function () {
                location.path('/viewclient/' + scope.clientId);
            };

            scope.formatPartnerCode = function (partnerCode) {
                if (!partnerCode) return '-';
                return partnerCode.toUpperCase();
            };

            scope.formatStatus = function (status) {
                if (!status) return '-';
                return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
            };
        }
    });
    mifosX.ng.application.controller('PartnerClientHistoryController', ['$scope', 'ResourceFactory', '$location', '$routeParams', mifosX.controllers.PartnerClientHistoryController]);
} (mifosX.controllers));