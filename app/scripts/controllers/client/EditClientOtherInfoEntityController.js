(function (module) {
    mifosX.controllers = _.extend(module, {
        EditClientOtherInfoEntityController: function (scope, resourceFactory, routeParams,dateFilter, location) {
            scope.date = {};
             scope.restrictDate = new Date();
            scope.formData = {};
            scope.clientId = routeParams.clientId;
            scope.otherInfoId = routeParams.otherInfoId;
            scope.otherInfoData = {};
            scope.yearArrivedRequired = true;
            scope.bankOptions = [];

            resourceFactory.clientOtherInfoTemplateResource.get({clientId:routeParams.clientId}, function(data){
                scope.strataOptions = data.strataOptions;
            });


            resourceFactory.banksResource.getAll({}, function (data) {
                scope.bankOptions = data;
            });

            resourceFactory.otherInfoResource.get(
                { clientId: routeParams.clientId, otherInfoId: routeParams.otherInfoId },
                function (data) {
                    console.log('edit prefile data:', data);
                    scope.otherInfoData = data;
                    scope.formData = {
                        strataId: data.strata.id,
                        businessLocation: data.businessLocation,
                        taxIdentificationNumber: data.taxIdentificationNumber,
                        coSignorsName: data.coSignors == "" ? undefined : data.coSignors,
                        guarantor: data.guarantor == "" ? undefined : data.guarantor,
                        incomeGeneratingActivity: data.incomeGeneratingActivity == 0 ? undefined : data.incomeGeneratingActivity,
                        incomeGeneratingActivityMonthlyAmount: data.incomeGeneratingActivityMonthlyAmount,
                        telephoneNo: parseInt(data.telephoneNumber),
                        bankAccountNumber: data.bankAccountNumber,
                        bankId: data.bankId,
                        yearArrivedInHostCountry: data.yearArrivedInHostCountry,
                    };

                    if (data.yearArrivedInHostCountry) {
                        var submittedOnDate = dateFilter(data.yearArrivedInHostCountry, scope.df);
                        scope.date.submittedOnDate = new Date(submittedOnDate);
                    }

                    scope.$applyAsync(function () {
                        angular.element('#bankId').trigger('chosen:updated');
                    });
                },
                function (error) {
                    console.log('edit prefill error:', error);
                }
            );

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
                location.path('/clientOtherInfo/' + scope.clientId);
            };

            scope.submit = function () {
                this.formData.locale = scope.optlang.code;
                this.formData.dateFormat = scope.df;

               if(scope.date.submittedOnDate){
                    this.formData.yearArrivedInHostCountry = dateFilter(scope.date.submittedOnDate,  scope.df);
                }

                resourceFactory.otherInfoResource.put({clientId: scope.clientId, otherInfoId: routeParams.otherInfoId}, this.formData, function (data) {
                    location.path('/clientOtherInfoEntity/' + scope.clientId);
                });
            };

        }
    });
    mifosX.ng.application.controller('EditClientOtherInfoEntityController', ['$scope', 'ResourceFactory', '$routeParams','dateFilter', '$location', mifosX.controllers.EditClientOtherInfoEntityController]).run(function ($log) {
        $log.info("EditClientOtherInfoEntityController initialized");
    });
}(mifosX.controllers || {}));
