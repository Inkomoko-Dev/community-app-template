(function (module) {
    mifosX.controllers = _.extend(module, {
        SavingsDocumentsController: function (scope, resourceFactory, routeParams, location, route, $rootScope, API_VERSION, $uibModal) {

            scope.accountDocuments = [];
            scope.savingsId = routeParams.savingsId;

            resourceFactory.savingsDocumentsResource.getAllSavingsDocuments({savingsId: routeParams.savingsId}, function (data) {
                for (var l in data) {

                    var docs = {};
                    docs = API_VERSION + '/' + data[l].parentEntityType + '/' + data[l].parentEntityId + '/documents/' + data[l].id + '/attachment?tenantIdentifier=' + $rootScope.tenantIdentifier;
                    data[l].docUrl = docs;
                    if (data[l].fileName)
                        if (data[l].fileName.toLowerCase().indexOf('.jpg') != -1 || data[l].fileName.toLowerCase().indexOf('.jpeg') != -1 || data[l].fileName.toLowerCase().indexOf('.png') != -1)
                            data[l].fileIsImage = true;
                    if (data[l].type)
                         if (data[l].type.toLowerCase().indexOf('image') != -1)
                            data[l].fileIsImage = true;
                }
                scope.accountDocuments = data;
            });

            scope.deleteDocument = function (documentId, index) {
                resourceFactory.savingsDocumentsResource.delete({savingsId: routeParams.savingsId, documentId: documentId}, '', function (data) {
                    scope.accountDocuments.splice(index, 1);
                });
            };

            scope.renameDocument = function (document, index) {
                $uibModal.open({
                    templateUrl: 'renameDocumentDialog.html',
                    controller: RenameSavingsDocumentCtrl,
                    resolve: {
                        documentData: function () {
                            return {
                                id: document.id,
                                name: document.name,
                                description: document.description,
                                index: index
                            };
                        }
                    }
                });
            };

            var RenameSavingsDocumentCtrl = function ($scope, $uibModalInstance, documentData) {
                $scope.renameData = {
                    name: documentData.name,
                    description: documentData.description
                };
                $scope.documentId = documentData.id;
                $scope.documentIndex = documentData.index;

                $scope.confirm = function () {
                    resourceFactory.savingsDocumentsResource.update({
                        savingsId: routeParams.savingsId,
                        documentId: $scope.documentId
                    }, $scope.renameData, function (data) {
                        scope.accountDocuments[$scope.documentIndex].name = $scope.renameData.name;
                        scope.accountDocuments[$scope.documentIndex].description = $scope.renameData.description;
                        $uibModalInstance.close('rename');
                    });
                };

                $scope.cancel = function () {
                    $uibModalInstance.dismiss('cancel');
                };
            };

            scope.previewDocument = function (url, fileName) {
                scope.preview =  true;
                scope.fileUrl = scope.hostUrl + url;
                if(fileName.toLowerCase().indexOf('.png') != -1)
                    scope.fileType = 'image/png';
                else if(fileName.toLowerCase().indexOf('.jpg') != -1)
                    scope.fileType = 'image/jpg';
                else if(fileName.toLowerCase().indexOf('.jpeg') != -1)
                    scope.fileType = 'image/jpeg';
            };

        }
    });
    mifosX.ng.application.controller('SavingsDocumentsController', ['$scope', 'ResourceFactory', '$routeParams', '$location', '$route', '$rootScope', 'API_VERSION', '$uibModal', mifosX.controllers.SavingsDocumentsController]).run(function ($log) {
        $log.info("SavingsDocumentsController initialized");
    });
}(mifosX.controllers || {}));

