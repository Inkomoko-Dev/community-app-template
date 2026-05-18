(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateProvisioningCategoryController: function (scope, resourceFactory, location, translate) {
            scope.translate = translate;
            scope.formData = {
                active: true
            };

            scope.submit = function () {
                this.formData.locale = scope.optlang.code;
                resourceFactory.provisioningcategory.post(this.formData, function () {
                    location.path('/viewallprovisioningcategories');
                });
            };
        }
    });
    mifosX.ng.application.controller('CreateProvisioningCategoryController', ['$scope', 'ResourceFactory', '$location', '$translate', mifosX.controllers.CreateProvisioningCategoryController]).run(function ($log) {
        $log.info('CreateProvisioningCategoryController initialized');
    });
}(mifosX.controllers || {}));
