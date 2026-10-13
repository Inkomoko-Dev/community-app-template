(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateExternalOrganizationMappingController: function (scope, resourceFactory, location) {
            scope.offices = [];
            scope.formData = {
                externalSystem: 'GL',
                active: true
            };
            resourceFactory.officeResource.getAllOfficesInAlphabeticalOrder(function (data) {
                scope.offices = data;
            });

            scope.submit = function () {
                resourceFactory.externalOrganizationMappingResource.save(this.formData, function () {
                    location.path('/externalorganizationmappings');
                });
            };
        }
    });
    mifosX.ng.application.controller('CreateExternalOrganizationMappingController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.CreateExternalOrganizationMappingController]).run(function ($log) {
        $log.info("CreateExternalOrganizationMappingController initialized");
    });
}(mifosX.controllers || {}));
