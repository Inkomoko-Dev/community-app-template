(function (module) {
    mifosX.controllers = _.extend(module, {
        ClientOtherInfoEntityController: function (scope, resourceFactory, routeParams, dateFilter, location, route) {
            scope.first = {};
            scope.first.date = new Date();
            scope.first.submitondate;
            scope.formData = {};
            scope.clientId = routeParams.clientId;
            scope.otherInfoData = {};
            scope.exists = false;
            scope.yearArrivedRequired = true;
            scope.bankOptions = [];
            scope.getBankName = function (otherInfoData) {
                if (!otherInfoData) {
                    return '';
                }
                return otherInfoData.bank && otherInfoData.bank.bankName ? otherInfoData.bank.bankName : otherInfoData.bankName;
            };

            resourceFactory.clientOtherInfoTemplateResource.get({ clientId: routeParams.clientId }, function (data) {
                scope.strataOptions = data.strataOptions;
            });


            resourceFactory.banksResource.getAll({}, function (data) {
                scope.bankOptions = data;
                scope.$applyAsync(function () {
                    angular.element('#bankId').trigger('chosen:updated');
                });
            });


            resourceFactory.clientOtherInfoEntityResource.getAll({ clientId: routeParams.clientId }, function (data) {
                if (data && data.length > 0) {
                    scope.otherInfoData = data[0];
                    scope.exists = true;
                }
            });

            scope.checkIfHostCommunitySelected = function () {
                if (scope.strataOptions && this.formData.strataId != undefined) {
                    var selectedObj = scope.strataOptions.filter(x => x.id === this.formData.strataId).at(0);
                    scope.yearArrivedRequired = !(selectedObj.name.toUpperCase() === 'HOST COMMUNITY');
                    return scope.yearArrivedRequired;
                } else {
                    scope.yearArrivedRequired = true;
                    return scope.yearArrivedRequired;
                }
            };

            scope.cancel = function () {
                location.path('/viewclient/' + scope.clientId);
            };

            scope.submit = function () {
                this.formData.locale = scope.optlang.code;
                this.formData.dateFormat = scope.df;
                delete this.formData.bankName;

                if (scope.first.submitondate) {
                    reqDate = dateFilter(scope.first.submitondate, scope.df);
                    this.formData.yearArrivedInHostCountry = reqDate;
                }

                resourceFactory.clientOtherInfoResource.save({ clientId: scope.clientId }, this.formData, function (data) {
                    route.reload();
                });
            };
        }
    });
    mifosX.ng.application.controller('ClientOtherInfoEntityController', ['$scope', 'ResourceFactory', '$routeParams', 'dateFilter', '$location', '$route', mifosX.controllers.ClientOtherInfoEntityController]).run(function ($log) {
        $log.info("ClientOtherInfoEntityController initialized");
    });
}(mifosX.controllers || {}));
