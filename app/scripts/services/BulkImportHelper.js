(function (module) {
    mifosX.services = _.extend(module, {
        BulkImportHelper: function () {
        }
    });
    mifosX.ng.services.service('BulkImportHelper', [mifosX.services.BulkImportHelper]).run(
        ['$rootScope', 'webStorage', 'localStorageService', '$http', function ($rootScope, webStorage, localStorageService, $http) {
            $rootScope.downloadBulkImportOutput = function (importDocument) {
                if (!importDocument || !importDocument.docUrl) {
                    return;
                }
                var sessionData = webStorage.get('sessionData');
                var headers = { "Authorization": "Basic " + sessionData.authenticationKey };
                var userData = localStorageService.getFromLocalStorage('userData');
                if (userData && userData.isTwoFactorAuthenticationRequired && userData.authenticated) {
                    headers["Fineract-Platform-TFA-Token"] = $http.defaults.headers.common['Fineract-Platform-TFA-Token'];
                }
                fetch($rootScope.hostUrl + importDocument.docUrl, {
                    method: 'GET',
                    headers: headers
                }).then(function (response) {
                    if (!response.ok) {
                        throw new Error("Import output download failed");
                    }
                    return response.blob();
                }).then(function (blob) {
                    var blobUrl = window.URL.createObjectURL(blob);
                    var link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = importDocument.name || "import-output.xls";
                    link.click();
                    window.URL.revokeObjectURL(blobUrl);
                }).catch(function (err) {
                    console.error(err);
                    alert("Failed to download import output. Please check your authentication.");
                });
            };
        }]);
}(mifosX.services || {}));
