(function (module) {
    mifosX.controllers = _.extend(module, {
        EditExternalOrganizationMappingController: function (scope, routeParams, resourceFactory, location) {
            scope.offices = [];
            resourceFactory.officeResource.getAllOfficesInAlphabeticalOrder(function (offices) {
                scope.offices = offices;
                resourceFactory.externalOrganizationMappingResource.get({mappingId: routeParams.id}, function (data) {
                    scope.formData = {
                        officeId: data.officeId,
                        externalSystem: data.externalSystem,
                        externalId: data.externalId,
                        externalName: data.externalName,
                        currencyCode: data.currencyCode,
                        active: data.active
                    };
                });
            });

            scope.submit = function () {
                resourceFactory.externalOrganizationMappingResource.update({mappingId: routeParams.id}, this.formData, function () {
                    location.path('/externalorganizationmappings');
                });
            };
        }
    });
    mifosX.ng.application.controller('EditExternalOrganizationMappingController', ['$scope', '$routeParams', 'ResourceFactory', '$location', mifosX.controllers.EditExternalOrganizationMappingController]).run(function ($log) {
        $log.info("EditExternalOrganizationMappingController initialized");
    });
}(mifosX.controllers || {}));
