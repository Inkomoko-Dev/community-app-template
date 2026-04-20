(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewAllProvisioningCategoriesController: function (scope, resourceFactory, location, translate) {
            scope.translate = translate;
            scope.categories = [];

            if (!scope.searchCriteria.provisioningCategories) {
                scope.searchCriteria.provisioningCategories = null;
                scope.saveSC();
            }

            scope.filterText = scope.searchCriteria.provisioningCategories || '';
            scope.categoriesPerPage = 15;

            scope.onFilter = function () {
                scope.searchCriteria.provisioningCategories = scope.filterText;
                scope.saveSC();
            };

            scope.routeToEdit = function (categoryId) {
                location.path('/editprovisioningcategory/' + categoryId);
            };

            resourceFactory.provisioningcategory.getAll(function (data) {
                scope.categories = data;
            });
        }
    });
    mifosX.ng.application.controller('ViewAllProvisioningCategoriesController', ['$scope', 'ResourceFactory', '$location', '$translate', mifosX.controllers.ViewAllProvisioningCategoriesController]).run(function ($log) {
        $log.info('ViewAllProvisioningCategoriesController initialized');
    });
}(mifosX.controllers || {}));
