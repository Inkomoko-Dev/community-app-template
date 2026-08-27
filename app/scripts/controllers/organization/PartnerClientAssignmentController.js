(function (module) {
    mifosX.controllers = _.extend(module, {
        PartnerClientAssignmentController: function (scope, resourceFactory, location, routeParams) {
            scope.clientId = routeParams.id;
            scope.partnerClient = {};
            scope.availablePartners = [];
            scope.formData = {
                partnerCode: '',
                reason: ''
            };

            // Fetch client details first
            resourceFactory.clientResource.get({clientId: scope.clientId}, function(data) {
                scope.client = data;
                
                // Then fetch current partner assignment using discovery API
                if (scope.client && scope.client.mobileNo) {
                    resourceFactory.partnerClientResource.getAll({phone: scope.client.mobileNo}, function(data) {
                        if (data && data.pageItems && data.pageItems.length > 0) {
                            var matchingClient = data.pageItems.find(function(item) {
                                return item.id === scope.clientId;
                            });
                            if (matchingClient && matchingClient.partnerCode) {
                                scope.partnerClient = {
                                    partnerCode: matchingClient.partnerCode,
                                    status: matchingClient.isActive ? 'Active' : 'Inactive',
                                    assignmentDate: matchingClient.assignedDate ? matchingClient.assignedDate.join('-') : null
                                };
                                scope.formData.partnerCode = matchingClient.partnerCode;
                            } else {
                                scope.partnerClient = null;
                            }
                        } else {
                            scope.partnerClient = null;
                        }
                    }, function(error) {
                        console.error('Error fetching partner assignment:', error);
                        scope.partnerClient = null;
                    });
                } else {
                    scope.partnerClient = null;
                }
            });

            // Fetch available partners (disbursement providers)
            // For now, we'll use a static list as the API might not be available
            scope.availablePartners = [
                { code: 'KIFIYA', name: 'Kifiya' },
                { code: 'MTN', name: 'MTN Mobile Money' },
                { code: 'AIRTEL', name: 'Airtel Money' }
            ];

            scope.assignPartner = function () {
                if (!scope.formData.partnerCode) {
                    alert('Please select a partner');
                    return;
                }

                resourceFactory.partnerClientResource.assign(
                    {clientId: scope.clientId, resourceType: 'assign', partnerCode: scope.formData.partnerCode, reason: scope.formData.reason}, 
                    function(data) {
                        alert('Partner assigned successfully');
                        location.path('/viewclient/' + scope.clientId);
                    }, 
                    function(error) {
                        var errorMessage = 'Error assigning partner';
                        if (error && error.data) {
                            if (error.data.defaultUserMessage) {
                                errorMessage += ': ' + error.data.defaultUserMessage;
                            } else if (error.data.developerMessage) {
                                errorMessage += ': ' + error.data.developerMessage;
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

                resourceFactory.partnerClientResource.remove({clientId: scope.clientId}, function(data) {
                    scope.partnerClient = null;
                    scope.formData.partnerCode = '';
                    scope.formData.reason = '';
                    alert('Partner assignment removed successfully');
                    location.path('/viewclient/' + scope.clientId);
                }, function(error) {
                    var errorMessage = 'Error removing partner';
                    if (error && error.data) {
                        if (error.data.defaultUserMessage) {
                            errorMessage += ': ' + error.data.defaultUserMessage;
                        } else if (error.data.developerMessage) {
                            errorMessage += ': ' + error.data.developerMessage;
                        }
                    } else if (error && error.statusText) {
                        errorMessage += ': ' + error.statusText;
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
} (mifosX.controllers));