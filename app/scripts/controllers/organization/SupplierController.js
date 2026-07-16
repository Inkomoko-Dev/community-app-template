(function (module) {
    mifosX.controllers = _.extend(module, {
        SupplierController: function (scope, resourceFactory, paginatorService, location) {
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

            var fetchFunction = function (offset, limit, callback) {
                var params = {
                    offset: offset,
                    limit: limit
                };
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
                resourceFactory.suppliersResource.getAll(params, callback);
            };

            scope.refreshSuppliers = function () {
                scope.suppliers = paginatorService.paginate(fetchFunction, scope.SuppliersPerPage);
            };

            resourceFactory.suppliersResource.template(function (data) {
                scope.businessSectorOptions = data.businessSectorOptions || [];
                scope.supplierTypeOptions = data.supplierTypeOptions || [];
                scope.countryOptions = data.countryOptions || [];
            });

            scope.refreshSuppliers();
        }
    });
    mifosX.ng.application.controller('SupplierController', ['$scope', 'ResourceFactory', 'PaginatorService', '$location', mifosX.controllers.SupplierController]).run(function ($log) {
        $log.info("SupplierController initialized");
    });
}(mifosX.controllers || {}));
