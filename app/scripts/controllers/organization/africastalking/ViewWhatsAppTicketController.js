(function (module) {
    mifosX.controllers = _.extend(module, {
        ViewWhatsAppTicketController: function (scope, routeParams, resourceFactory, location) {
            scope.ticket = null;
            scope.messages = [];
            scope.staff = [];
            scope.updateForm = {};
            scope.saveError = null;
            scope.saveMessage = null;

            scope.ticketStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

            scope.loadTicket = function () {
                resourceFactory.whatsAppInteractiveTicketResource.get({ ticketId: routeParams.ticketId }, function (data) {
                    scope.ticket = data;
                    scope.updateForm.status = data.status;
                    scope.updateForm.assignedStaffId = data.assignedStaffId;
                    scope.updateForm.summary = data.summary;
                });
            };

            scope.loadMessages = function () {
                resourceFactory.whatsAppInteractiveTicketMessageResource.getAll({ ticketId: routeParams.ticketId }, function (data) {
                    scope.messages = data || [];
                });
            };

            scope.loadStaff = function () {
                resourceFactory.employeeResource.getAllEmployees(function (data) {
                    scope.staff = data || [];
                });
            };

            scope.saveTicket = function () {
                scope.saveError = null;
                scope.saveMessage = null;
                var payload = {};
                if (scope.updateForm.status) {
                    payload.status = scope.updateForm.status;
                    if (scope.updateForm.status === 'IN_PROGRESS') {
                        payload.recordFirstResponse = true;
                    }
                }
                if (scope.updateForm.assignedStaffId) {
                    payload.assignedStaffId = scope.updateForm.assignedStaffId;
                }
                if (scope.updateForm.summary) {
                    payload.summary = scope.updateForm.summary;
                }
                resourceFactory.whatsAppInteractiveTicketResource.update({ ticketId: routeParams.ticketId }, payload, function () {
                    scope.saveMessage = 'Ticket updated.';
                    scope.loadTicket();
                }, function (error) {
                    scope.saveError = 'Failed to update ticket. HTTP ' + (error && error.status ? error.status : 'unknown');
                });
            };

            scope.backToInbox = function () {
                location.path('/africastalking');
            };

            scope.loadTicket();
            scope.loadMessages();
            scope.loadStaff();
        }
    });
    mifosX.ng.application.controller('ViewWhatsAppTicketController', ['$scope', '$routeParams', 'ResourceFactory', '$location', mifosX.controllers.ViewWhatsAppTicketController]).run(function ($log) {
        $log.info("ViewWhatsAppTicketController initialized");
    });
}(mifosX.controllers || {}));
