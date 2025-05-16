(function (module) {
    mifosX.controllers = _.extend(module, {
        BulkImportLoanRepaymentController: function (scope, resourceFactory, location, API_VERSION, $rootScope, Upload, webStorage, localStorageService, http) {

            scope.first = {};
            scope.first.templateUrl =  API_VERSION + '/loans/repayments/downloadtemplate' + '?tenantIdentifier=' + $rootScope.tenantIdentifier
                + '&locale=' + scope.optlang.code + '&dateFormat=' + scope.df;
            scope.formData = {};
            var requestParams = {staffInSelectedOfficeOnly:true};

            resourceFactory.clientTemplateResource.get(requestParams, function (data) {
                scope.offices = data.officeOptions;
                scope.staffs = data.staffOptions;
            });

            scope.first.queryParams = '&';
            scope.changeOffice = function () {
                if(scope.formData.officeId) {
                    if(scope.first.queryParams.indexOf("officeId")==-1) {
                        scope.first.queryParams += 'officeId=' + scope.formData.officeId;
                    }else {
                        scope.first.queryParams=scope.first.queryParams.replace(/&officeId=\d+/i,"&officeId="+ scope.formData.officeId);
                    }
                } else {
                    scope.first.queryParams ='&';
                }
            };

            scope.onFileSelect = function (files) {
                scope.formData.file = files[0];
            };

            scope.downloadTemplate = function () {

                var url = $rootScope.hostUrl + API_VERSION + '/loans/repayments/downloadtemplate'
                    + '?tenantIdentifier=' + $rootScope.tenantIdentifier
                    + '&locale=' + scope.optlang.code
                    + '&dateFormat=' + scope.df
                    + scope.first.queryParams;

                var sessionData = webStorage.get('sessionData');
                var headers = { "Authorization": "Basic " + sessionData.authenticationKey };

                var userData = localStorageService.getFromLocalStorage('userData');

                if (userData.isTwoFactorAuthenticationRequired && userData.authenticated){
                    headers["Fineract-Platform-TFA-Token"] = http.defaults.headers.common['Fineract-Platform-TFA-Token'];
                }

                fetch(url, {
                    method: 'GET',
                    headers: headers
                })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error("Template download failed");
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        var blobUrl = window.URL.createObjectURL(blob);
                        var link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = "loan_repayment_template.xlsx";
                        link.click();
                        window.URL.revokeObjectURL(blobUrl); // Clean up
                    })
                    .catch(err => {
                        console.error(err);
                        alert("Failed to download template. Please check your authentication.");
                    });
            };

            scope.refreshImportTable=function () {
                resourceFactory.importResource.getImports({entityType: "loantransactions"}, function (data) {

                    for (var l in data) {
                        var importdocs = {};
                        importdocs = API_VERSION + '/imports/downloadOutputTemplate?importDocumentId='+ data[l].importId +'&tenantIdentifier=' + $rootScope.tenantIdentifier;
                        data[l].docUrl = importdocs;
                    }
                    scope.imports = data;
                });
            };

            scope.upload = function () {
                Upload.upload({
                    url: $rootScope.hostUrl + API_VERSION + '/loans/repayments/uploadtemplate',
                    data: {file: scope.formData.file,locale:scope.optlang.code,dateFormat:scope.df},
                }).then(function (data) {
                    // to fix IE not refreshing the model
                    if (!scope.$$phase) {
                        scope.$apply();
                    }
                });
            };
        }
    });
    mifosX.ng.application.controller('BulkImportLoanRepaymentController', ['$scope', 'ResourceFactory', '$location', 'API_VERSION', '$rootScope', 'Upload', 'webStorage', 'localStorageService', '$http', mifosX.controllers.BulkImportLoanRepaymentController]).run(function ($log) {
        $log.info("BulkImportLoanRepaymentController initialized");
    });
}(mifosX.controllers || {}));