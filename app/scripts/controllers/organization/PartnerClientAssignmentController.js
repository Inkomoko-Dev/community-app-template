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
                    (scope.$root.presentUserErrors || function (errors) {
                        scope.$root.errorStatus = null;
                        scope.$root.errorDetails = errors;
                    })([{
                        field: 'partner',
                        code: 'error.msg.partner.required',
                        message: 'Select a partner.'
                    }], null);
                    return;
                }

                resourceFactory.partnerClientResource.assign(
                    {clientId: scope.clientId, partnerCode: scope.formData.partnerCode, reason: scope.formData.reason},
                    {},
                    function () {
                        alert('Partner assigned successfully');
                        location.path('/viewclient/' + scope.clientId);
                    },
                    function () {
                        if (scope.$root.errorStatus || (scope.$root.errorDetails && scope.$root.errorDetails.length)) {
                            return;
                        }
                        (scope.$root.presentUserErrors || function (errors) {
                            scope.$root.errorStatus = null;
                            scope.$root.errorDetails = errors;
                        })([{
                            code: 'error.msg.partner.assign.failed',
                            message: 'The partner could not be assigned. Try again. If this continues, contact support.'
                        }], null);
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
                    }, function () {
                        if (scope.$root.errorStatus || (scope.$root.errorDetails && scope.$root.errorDetails.length)) {
                            return;
                        }
                        (scope.$root.presentUserErrors || function (errors) {
                            scope.$root.errorStatus = null;
                            scope.$root.errorDetails = errors;
                        })([{
                            code: 'error.msg.partner.remove.failed',
                            message: 'The partner assignment could not be removed. Try again. If this continues, contact support.'
                        }], null);
                    });
            };

            scope.cancel = function () {
                location.path('/viewclient/' + scope.clientId);
            };
        }
    });
    mifosX.ng.application.controller('PartnerClientAssignmentController', ['$scope', 'ResourceFactory', '$location', '$routeParams', mifosX.controllers.PartnerClientAssignmentController]);
}(mifosX.controllers));
