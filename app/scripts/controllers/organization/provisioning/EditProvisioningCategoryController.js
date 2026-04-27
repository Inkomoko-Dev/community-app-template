(function (module) {
    mifosX.controllers = _.extend(module, {
        EditProvisioningCategoryController: function (scope, resourceFactory, routeParams, location, translate) {
            scope.translate = translate;
            scope.formData = {};

            resourceFactory.provisioningcategory.get({ categoryId: routeParams.categoryId }, function (data) {
                scope.formData.categoryname = data.categoryName;
                scope.formData.categorydescription = data.categoryDescription;
                scope.formData.categorycode = data.categoryCode;
                scope.formData.displayorder = data.displayOrder;
                scope.formData.active = data.active;
            });

            scope.submit = function () {
                this.formData.locale = scope.optlang.code;
                resourceFactory.provisioningcategory.put({ categoryId: routeParams.categoryId }, this.formData, function () {
                    location.path('/viewallprovisioningcategories');
                });
            };
        }
    });
    mifosX.ng.application.controller('EditProvisioningCategoryController', ['$scope', 'ResourceFactory', '$routeParams', '$location', '$translate', mifosX.controllers.EditProvisioningCategoryController]).run(function ($log) {
        $log.info('EditProvisioningCategoryController initialized');
    });
}(mifosX.controllers || {}));
