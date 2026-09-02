(function (module) {
    mifosX.controllers = _.extend(module, {
        PartnerClientAssignmentController: function (scope, resourceFactory, location, routeParams) {
            scope.clientId = routeParams.id;
            scope.partnerClient = null;
            scope.availablePartners = [];
            scope.formData = {
                partnerCode: '',
                reason: ''
            };

            function applyAssignment(data) {
                if (data && data.partnerCode) {
                    scope.partnerClient = {
                        partnerCode: data.partnerCode,
                        status: data.isActive ? 'Active' : 'Inactive',
                        assignmentDate: data.assignedDate
                    };
                    scope.formData.partnerCode = data.partnerCode;
                } else {
                    scope.partnerClient = null;
                }
            }

            resourceFactory.clientResource.get({clientId: scope.clientId}, function (data) {
                scope.client = data;
            });

            resourceFactory.partnerClientResource.getAssignment({clientId: scope.clientId}, applyAssignment, function () {
                scope.partnerClient = null;
            });

            resourceFactory.disbursementProviderResource.getAll({}, function (data) {
                scope.availablePartners = data || [];
            });

            scope.assignPartner = function () {
                if (!scope.formData.partnerCode) {
                    alert('Please select a partner');
                    return;
                }

                resourceFactory.partnerClientResource.assign(
                    {clientId: scope.clientId, partnerCode: scope.formData.partnerCode, reason: scope.formData.reason},
                    {},
                    function () {
                        alert('Partner assigned successfully');
                        location.path('/viewclient/' + scope.clientId);
                    },
                    function (error) {
                        var errorMessage = 'Error assigning partner';
                        if (error && error.data) {
                            if (error.data.defaultUserMessage) {
                                errorMessage += ': ' + error.data.defaultUserMessage;
                            } else if (error.data.developerMessage) {
                                errorMessage += ': ' + error.data.developerMessage;
                            } else if (error.data.errors && error.data.errors.length && error.data.errors[0].defaultUserMessage) {
                                errorMessage += ': ' + error.data.errors[0].defaultUserMessage;
                            }
                        } else if (error && error.statusText) {
                            errorMessage += ': ' + error.statusText;
                        }
                        alert(errorMessage);
                    }
                );
            };

            scope.removePartner = function () {
                if (!confirm('Are you sure you want to remove partner assignment?')) {
                    return;
                }

                resourceFactory.partnerClientResource.remove({clientId: scope.clientId, resourceType: 'mapping'}, {},
                    function () {
                        scope.partnerClient = null;
                        scope.formData.partnerCode = '';
                        scope.formData.reason = '';
                        alert('Partner assignment removed successfully');
                        location.path('/viewclient/' + scope.clientId);
                    }, function (error) {
                        var errorMessage = 'Error removing partner';
                        if (error && error.data && error.data.defaultUserMessage) {
                            errorMessage += ': ' + error.data.defaultUserMessage;
                        }
                        alert(errorMessage);
                    });
            };

            scope.cancel = function () {
                location.path('/viewclient/' + scope.clientId);
            };
        }
    });
    mifosX.ng.application.controller('PartnerClientAssignmentController', ['$scope', 'ResourceFactory', '$location', '$routeParams', mifosX.controllers.PartnerClientAssignmentController]);
}(mifosX.controllers));
