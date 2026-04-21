(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateProvisioningCategoryController: function (scope, resourceFactory, location, translate) {
            scope.translate = translate;
            scope.formData = {
                active: true
            };

            scope.submit = function () {
                resourceFactory.provisioningcategory.post(scope.formData, function () {
                    location.path('/viewallprovisioningcategories');
                });
            };
        }
    });
    mifosX.ng.application.controller('CreateProvisioningCategoryController', ['$scope', 'ResourceFactory', '$location', '$translate', mifosX.controllers.CreateProvisioningCategoryController]).run(function ($log) {
        $log.info('CreateProvisioningCategoryController initialized');
    });
}(mifosX.controllers || {}));
