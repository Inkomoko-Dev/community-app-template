(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewSupplierController: function (scope, routeParams, resourceFactory) {
            scope.supplier = {};
            resourceFactory.suppliersResource.get({supplierId: routeParams.id}, function (data) {
                scope.supplier = data;
            });
        }
    });
    mifosX.ng.application.controller('ViewSupplierController', ['$scope', '$routeParams', 'ResourceFactory', mifosX.controllers.ViewSupplierController]).run(function ($log) {
        $log.info("ViewSupplierController initialized");
    });
}(mifosX.controllers || {}));
