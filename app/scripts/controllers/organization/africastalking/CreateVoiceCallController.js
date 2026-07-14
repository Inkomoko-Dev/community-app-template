(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateVoiceCallController: function (scope, resourceFactory, location, $q) {
            scope.formData = {};
            scope.recipientType = 'phone';
            scope.isButtonDisabled = false;

            scope.clientOptions = function (value) {
                var deferred = $q.defer();
                if (value.length < 2) {
                    deferred.resolve([]);
                    return deferred.promise;
                }
                resourceFactory.clientResource.getAllClientsWithoutStatus({
                    displayName: value,
                    limit: 10,
                    orderBy: 'displayName',
                    sortOrder: 'ASC'
                }, function (data) {
                    deferred.resolve(data.pageItems);
                });
                return deferred.promise;
            };

            scope.staffOptions = function (value) {
                var deferred = $q.defer();
                if (value.length < 2) {
                    deferred.resolve([]);
                    return deferred.promise;
                }
                resourceFactory.employeeResource.getAllEmployees(function (data) {
                    deferred.resolve(data.filter(function (staff) {
                        return (staff.displayName && staff.displayName.toLowerCase().indexOf(value.toLowerCase()) > -1)
                            || ('' + staff.id).indexOf(value) > -1;
                    }));
                });
                return deferred.promise;
            };

            scope.submit = function () {
                if (scope.isButtonDisabled) {
                    return;
                }
                scope.isButtonDisabled = true;
                var payload = {};
                if (scope.recipientType === 'phone') {
                    payload.phoneNumber = scope.formData.phoneNumber;
                } else if (scope.recipientType === 'client' && scope.formData.client) {
                    payload.clientId = scope.formData.client.id;
                } else if (scope.recipientType === 'staff' && scope.formData.staff) {
                    payload.staffId = scope.formData.staff.id;
                }
                resourceFactory.africasTalkingVoiceResource.save(payload, function (data) {
                    var callId = data.resourceId || data.resourceIdentifier || data.id;
                    if (!callId) {
                        location.path('/africastalking');
                        return;
                    }
                    location.path('/viewvoicecall/' + callId);
                }, function () {
                    scope.isButtonDisabled = false;
                });
            };
        }
    });
    mifosX.ng.application.controller('CreateVoiceCallController', ['$scope', 'ResourceFactory', '$location', '$q', mifosX.controllers.CreateVoiceCallController]).run(function ($log) {
        $log.info("CreateVoiceCallController initialized");
    });
}(mifosX.controllers || {}));
