(function (module) {
    mifosX.controllers = _.extend(module, {
        EditGuarantorController: function (scope, resourceFactory, routeParams, location, dateFilter) {
            scope.template = {};
            scope.clientview = false;
            scope.date = {};
            scope.restrictDate = new Date();
            scope.yesNoOptions = [{
                "id": 1,
                "name": "Yes",
                "position": 1
              },{
                "id": 2,
                "name": "No",
                "position": 2
              }];
            resourceFactory.guarantorResource.get({ loanId: routeParams.loanId, templateResource: routeParams.id, template: true}, function (data) {
                scope.template = data;
                scope.genderOptions = scope.template.genderOptions;
                scope.formData = {
                    firstname: data.firstname,
                    lastname: data.lastname,
                    clientId: data.clientId,
                    city: data.city,
                    zip: data.zip,
                    mobile: data.mobileNumber,
                    residence: data.housePhoneNumber,
                    addressLine1: data.addressLine1,
                    addressLine2:data.addressLine2
                }

                if (data.clientRelationshipType) {
                    scope.formData.relationshipType = data.clientRelationshipType.id;
                }

                if (data.dob) {
                    scope.date.first = new Date(dateFilter(data.dob, scope.df));
                }

                //add pep option if selected
                if(data.pep){
                    scope.formData.pepId = 1
                }

                if(!data.pep){
                    scope.formData.pepId = 2;
                }

                //add bvn if selected
                if(data.bvn){
                    scope.formData.bvn = data.bvn;
                }

                //add email if selected
                if(data.email){
                    scope.formData.email = data.email;
                }

                //add middle name if selected
                if(data.middlename){
                    scope.formData.middlename = data.middlename;
                }

                //add gender if selected
                if(data.gender){
                    scope.formData.genderId = data.gender.id;
                }

                console.log(scope.formData);

            });
            scope.submit = function () {
                var guarantor = {};
                var reqDate = dateFilter(scope.date.first, scope.df);
                guarantor.addressLine1 = this.formData.addressLine1;
                guarantor.addressLine2 = this.formData.addressLine2;
                guarantor.city = this.formData.city;
                guarantor.dob = reqDate;
                guarantor.zip = this.formData.zip;
                guarantor.dateFormat = scope.df;
                guarantor.locale = scope.optlang.code;
                guarantor.firstname = this.formData.firstname;
                guarantor.lastname = this.formData.lastname;
                guarantor.clientId = this.formData.clientId;
                guarantor.mobileNumber = this.formData.mobile;
                guarantor.housePhoneNumber = this.formData.residence;
                guarantor.clientRelationshipTypeId = this.formData.relationshipType;
                guarantor.guarantorTypeId = 3;
                
                if(this.formData.middlename){
                    guarantor.middlename = this.formData.middlename;
                }

                if(this.formData.email){
                    guarantor.email = this.formData.email;
                }

                if(this.formData.bvn){
                    guarantor.bvn = this.formData.bvn;
                }

                //add pep option if selected
                if(this.formData.pepId){
                    guarantor.pep = this.formData.pepId == 1 ? true : false;
                }

                if(this.formData.genderId){
                    guarantor.genderId = this.formData.genderId;
                }

                resourceFactory.guarantorResource.update({ loanId: routeParams.loanId, templateResource: routeParams.id}, guarantor, function (data) {
                    location.path('listguarantors/' + routeParams.loanId);
                });
            };
        }
    });
    mifosX.ng.application.controller('EditGuarantorController', ['$scope', 'ResourceFactory', '$routeParams', '$location', 'dateFilter', mifosX.controllers.EditGuarantorController]).run(function ($log) {
        $log.info("EditGuarantorController initialized");
    });
}(mifosX.controllers || {}));
