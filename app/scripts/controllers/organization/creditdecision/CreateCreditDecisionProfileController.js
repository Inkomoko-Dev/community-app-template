(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateCreditDecisionProfileController: function (scope, resourceFactory, location) {
            scope.section = 'profiles';
            scope.formData = {name: '', productIds: [], copyFromProfileId: null};
            scope.productGroups = [];
            scope.picker = {q: ''};
            scope.profiles = [];
            scope.submitted = false;

            resourceFactory.creditDecisionProductsResource.getAll(function (products) {
                scope.productGroups = CreditDecisionRequest.groupByCurrency(products);
            });
            resourceFactory.creditDecisionProfileResource.getAll(function (profiles) {
                scope.profiles = profiles;
            });

            scope.isSelected = function (product) {
                return scope.formData.productIds.indexOf(product.id) >= 0;
            };

            scope.nameBlank = function () {
                return !(scope.formData.name || '').trim();
            };

            // rc-submit sets rc.<formName>.attempted but skips the handler when Angular marks the form invalid
            // (empty required name). Use that flag so the mandatory-name message still appears.
            scope.nameInvalid = function () {
                var attempted = scope.submitted || (scope.rc && scope.rc.createprofileform && scope.rc.createprofileform.attempted);
                return attempted && scope.nameBlank();
            };

            scope.toggle = function (product) {
                if (product.claimedByProfileId) {
                    return;
                }
                var at = scope.formData.productIds.indexOf(product.id);
                if (at < 0) {
                    scope.formData.productIds.push(product.id);
                } else {
                    scope.formData.productIds.splice(at, 1);
                }
            };

            scope.submit = function () {
                scope.submitted = true;
                if (scope.nameBlank() || !scope.formData.productIds.length) {
                    return;
                }
                var body = {
                    name: scope.formData.name.trim(),
                    productIds: scope.formData.productIds,
                    copyFromProfileId: scope.formData.copyFromProfileId || null
                };
                resourceFactory.creditDecisionProfileResource.save({}, body, function (data) {
                    location.path('/creditdecision/profile/' + data.id);
                });
            };
        }
    });
    mifosX.ng.application.controller('CreateCreditDecisionProfileController', ['$scope', 'ResourceFactory', '$location', mifosX.controllers.CreateCreditDecisionProfileController]).run(function ($log) {
        $log.info('CreateCreditDecisionProfileController initialized');
    });
}(mifosX.controllers || {}));
