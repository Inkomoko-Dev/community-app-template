(function (module) {
    mifosX.controllers = _.extend(module, {
        EditClientOtherInfoController: function (scope, resourceFactory, routeParams, dateFilter, location) {
            scope.date = {};
            scope.restrictDate = new Date();
            scope.formData = {};
            scope.clientId = routeParams.clientId;
            scope.otherInfoId = routeParams.otherInfoId;
            scope.otherInfoData = {};
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
                scope.nationalityOptions = data.nationalityOptions;
            });

            // Fetch banks for dropdown
            resourceFactory.banksResource.getAll({}, function (data) {
                scope.bankOptions = data;
                scope.$applyAsync(function () {
                    angular.element('#bankId').trigger('chosen:updated');
                });
            });

            resourceFactory.otherInfoResource.get({ clientId: routeParams.clientId, otherInfoId: routeParams.otherInfoId }, function (data) {
                scope.otherInfoData = data;
                scope.formData = {
                    strataId: data.strata.id,
                    nationalityId: data.nationality.id,
                    yearArrivedInHostCountry: data.yearArrivedInHostCountry,
                    numberOfDependents: data.numberOfDependents,
                    numberOfChildren: data.numberOfChildren,
                    nationalIdentificationNumber: data.nationalIdentificationNumber,
                    passportNumber: data.passportNumber,
                    bankAccountNumber: data.bankAccountNumber,
                    bankId: data.bankId,
                    telephoneNo: parseInt(data.telephoneNumber)
                };

                if (data.yearArrivedInHostCountry) {
                    var submittedOnDate = dateFilter(data.yearArrivedInHostCountry, scope.df);
                    scope.date.submittedOnDate = new Date(submittedOnDate);
                }

                scope.$applyAsync(function () {
                    angular.element('#bankId').trigger('chosen:updated');
                });
            });

            scope.cancel = function () {
                location.path('/clientOtherInfo/' + scope.clientId);
            };

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

            scope.submit = function () {
                this.formData.locale = scope.optlang.code;
                this.formData.dateFormat = scope.df;
                delete this.formData.bankName;

                if (scope.date.submittedOnDate) {
                    this.formData.yearArrivedInHostCountry = dateFilter(scope.date.submittedOnDate, scope.df);
                }

                resourceFactory.otherInfoResource.put({ clientId: scope.clientId, otherInfoId: routeParams.otherInfoId }, this.formData, function (data) {
                    location.path('/clientOtherInfo/' + scope.clientId);
                });
            };
        }
    });
    mifosX.ng.application.controller('EditClientOtherInfoController', ['$scope', 'ResourceFactory', '$routeParams', 'dateFilter', '$location', mifosX.controllers.EditClientOtherInfoController]).run(function ($log) {
        $log.info("EditClientOtherInfoController initialized");
    });
}(mifosX.controllers || {}));
