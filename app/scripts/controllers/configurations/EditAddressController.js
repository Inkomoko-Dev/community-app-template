(function (module) {
    mifosX.controllers = _.extend(module, {
        EditAddressController: function ($scope, resourceFactory, routeParams, location) {

            $scope.formData={};
            $scope.addressTypes=[];
            $scope.countryOptions=[];
            $scope.stateOptions=[];
            $scope.addressTypeId={};
            $scope.clients={};
            $scope.addressType={};
            var entityname="ADDRESS";
            $scope.addStatus="";
            $scope.editable=false;
            var clientId=routeParams.clientId;
            var addresstypid=routeParams.addrType;
            $scope.addressTypeEditable=true;


            var isActive={};
            var addressId=routeParams.addrId;

            resourceFactory.addressFieldConfiguration.get({entity:entityname},function(dataConfig) {
                for(var i=0;i<dataConfig.length;i++)
                {
                    dataConfig[i].field='$scope.'+dataConfig[i].field;
                    if(dataConfig[i].is_enabled == undefined) {
                        //For dev.mifos.io or demo.mifos.io
                        eval(dataConfig[i].field+"="+dataConfig[i].isEnabled);
                    } else {
                        //For fineract server
                        eval(dataConfig[i].field+"="+dataConfig[i].is_enabled);
                    }
                }
                resourceFactory.clientAddress.get({type:addresstypid,clientId:clientId},function(data)
                {
                    $scope.editable=true;
                    for(var i=0;i<data.length;i++)
                    {
                        if(data[i].addressId==addressId)
                        {
                            if(data[i].street&&$scope.street)
                            {
                                $scope.formData.street=data[i].street;
                            }
                            if(data[i].addressLine1&&$scope.addressLine1)
                            {
                                $scope.formData.addressLine1=data[i].addressLine1;
                            }
                            if(data[i].addressLine2&&$scope.addressLine2)
                            {
                                $scope.formData.addressLine2=data[i].addressLine2;
                            }
                            if(data[i].addressLine3&&$scope.addressLine3)
                            {
                                $scope.formData.addressLine3=data[i].addressLine3;
                            }
                            if(data[i].townVillage&&$scope.townVillage)
                            {
                                $scope.formData.townVillage=data[i].townVillage;
                            }
                            if(data[i].city&&$scope.city)
                            {
                                $scope.formData.city=data[i].city;
                            }
                            if(data[i].countyDistrict&&$scope.countyDistrict)
                            {
                                $scope.formData.countyDistrict=data[i].countyDistrict;
                            }
                            if(data[i].stateProvinceId)
                            {
                                $scope.formData.stateProvinceId = data[i].stateProvinceId;
                            }
                            if(data[i].countryId)
                            {
                                $scope.formData.countryId = data[i].countryId;
                            }
                            if(data[i].postalCode&&$scope.postalCode)
                            {
                                $scope.formData.postalCode=data[i].postalCode;
                            }
                            if(data[i].latitude&&$scope.latitue)
                            {
                                $scope.formData.latitude=data[i].latitude;
                            }
                            if(data[i].longitude&&$scope.longitude)
                            {
                                $scope.formData.longitude=data[i].longitude;
                            }
                            if(data[i].isActive&&$scope.isActive)
                            {
                                isActive=data[i].isActive;
                            }
                            if(data[i].lgaId)
                            {
                            $scope.formData.lgaId=data[i].lgaId;
                            }
                            if(data[i].physicalAddressDistrict)
                            {
                            $scope.formData.physicalAddressDistrict=data[i].physicalAddressDistrict;
                            }
                            if(data[i].physicalAddressSector)
                            {
                            $scope.formData.physicalAddressSector=data[i].physicalAddressSector;
                            }
                            if(data[i].physicalAddressCell)
                            {
                            $scope.formData.physicalAddressCell=data[i].physicalAddressCell;
                            }
                            $scope.formData.location=data[i].location;
                            if(data[i].addressTypeId)
                            {
                            $scope.formData.addressTypeId=data[i].addressTypeId;
                            }
                        }
                    }

                    resourceFactory.clientaddressFields.get(function(dataOptions) {
                        $scope.addressTypes=dataOptions.addressTypeIdOptions;
                        $scope.countryOptions=dataOptions.countryIdOptions;
                        $scope.stateOptions=dataOptions.stateProvinceIdOptions;
                        $scope.lgaOptions = dataOptions.lgaIdOptions;
                    })
                });
            })

            $scope.routeTo=function()
            {
                location.path('/viewclient/'+clientId);
            }

            $scope.updateaddress=function()
            {
               $scope.addressSubmitted=true;
               if(!$scope.formData.location || !String($scope.formData.location).trim())
               {
                   return;
               }
               $scope.formData.locale="en";
                $scope.formData.addressId=addressId;
                resourceFactory.clientAddress.put({'clientId': clientId},$scope.formData,function (data) {

                    location.path('/viewclient/'+clientId);
                });
            }


        }


    });
    mifosX.ng.application.controller('EditAddressController', ['$scope','ResourceFactory', '$routeParams', '$location', mifosX.controllers.EditAddressController]).run(function ($log) {
        $log.info("EditAddressController initialized");
    });

}
(mifosX.controllers || {}));
