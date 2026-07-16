(function (module) {
    mifosX.controllers = _.extend(module, {
        SupplierController: function (scope, resourceFactory, location) {
            scope.suppliers = [];
            scope.filters = {
                q: '',
                businessSector: '',
                supplierType: '',
                country: '',
                syncStatus: ''
            };
            scope.businessSectorOptions = [];
            scope.supplierTypeOptions = [];
            scope.countryOptions = [];
            scope.syncStatusOptions = ['SUCCESS', 'FAILED'];
            scope.SuppliersPerPage = 15;

            scope.routeTo = function (id) {
                location.path('/viewsupplier/' + id);
            };

            scope.loadSuppliers = function () {
                var params = {};
                if (scope.filters.q) {
                    params.q = scope.filters.q;
                }
                if (scope.filters.businessSector) {
                    params.businessSector = scope.filters.businessSector;
                }
                if (scope.filters.supplierType) {
                    params.supplierType = scope.filters.supplierType;
                }
                if (scope.filters.country) {
                    params.country = scope.filters.country;
                }
                if (scope.filters.syncStatus) {
                    params.syncStatus = scope.filters.syncStatus;
                }
                resourceFactory.suppliersResource.getAll(params, function (data) {
                    scope.suppliers = data;
                });
            };

            resourceFactory.suppliersResource.template(function (data) {
                scope.businessSectorOptions = data.businessSectorOptions || [];
                scope.supplierTypeOptions = data.supplierTypeOptions || [];
                scope.countryOptions = data.countryOptions || [];
            });

            scope.loadSuppliers();
        }
    });
    mifosX.ng.application.controller('SupplierController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.SupplierController]).run(function ($log) {
        $log.info("SupplierController initialized");
    });
}(mifosX.controllers || {}));
