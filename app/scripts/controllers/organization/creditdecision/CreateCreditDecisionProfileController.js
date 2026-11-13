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

            // Do not use HTML required: rc-submit skips the handler when the form is invalid, so the user
            // got no reason for the silent no-op. Validate here and always show why Create draft did nothing.
            scope.nameInvalid = function () {
                return scope.submitted && scope.nameBlank();
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
