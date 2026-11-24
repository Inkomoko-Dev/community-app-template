describe("BulkLoanRescheduleDetailController background lookups", function () {
    var REQUESTER_ID = 11;
    var VIEWER_ID = 22;

    function openRequestAs(options) {
        var permissions = options.permissions || [];
        var scope = {
            $on: jasmine.createSpy("$on"),
            currentSession: { user: { userId: options.userId || VIEWER_ID } },
            hasPermission: function (permission) {
                if (permissions.indexOf("ALL_FUNCTIONS") !== -1) {
                    return true;
                }
                if (permission.indexOf("READ_") === 0 && permissions.indexOf("ALL_FUNCTIONS_READ") !== -1) {
                    return true;
                }
                return permissions.indexOf(permission) !== -1;
            }
        };
        var executionResource = {
            get: jasmine.createSpy("execution.get").andCallFake(function (params, callback) {
                callback({ executionId: 5, status: options.status, createdById: REQUESTER_ID, createdBy: "gjohn" });
            }),
            audit: jasmine.createSpy("execution.audit").andCallFake(function (params, success, failure) {
                if (options.auditRefused) {
                    failure({ status: 403 });
                } else {
                    success([{ id: 1, action: "SUBMITTED", timestamp: [2026, 11, 10, 9, 0, 0] }]);
                }
            }),
            approvers: jasmine.createSpy("execution.approvers").andCallFake(function (params, callback) {
                callback([]);
            }),
            preview: jasmine.createSpy("execution.preview").andCallFake(function (params, callback) {
                callback({ pageItems: [], totalElements: 0, totalSucceeded: 0 });
            })
        };
        var resourceFactory = {
            bulkLoanRescheduleTemplateResource: {
                get: jasmine.createSpy("template.get").andCallFake(function (params, callback) {
                    callback({ userPermissions: {} });
                })
            },
            bulkLoanRescheduleExecutionResource: executionResource
        };
        var timeout = jasmine.createSpy("$timeout");
        timeout.cancel = jasmine.createSpy("$timeout.cancel");
        new mifosX.controllers.BulkLoanRescheduleDetailController(scope, resourceFactory, { executionId: 5 }, {}, {},
            "/v1", {}, timeout, { instant: function (key) { return key; } },
            new mifosX.services.BulkReschedulePreviewHelper());
        return { scope: scope, executionResource: executionResource };
    }

    it("shows the workflow history to a reviewer of a request awaiting approval", function () {
        var opened = openRequestAs({ status: "PENDING_APPROVAL", permissions: ["APPROVE_RESCHEDULELOAN"] });

        expect(opened.executionResource.audit).toHaveBeenCalled();
        expect(opened.scope.canViewAudit).toBe(true);
        expect(opened.scope.auditHistory.length).toEqual(1);
    });

    it("hides the history panel when the history lookup is refused", function () {
        var opened = openRequestAs({ status: "PENDING_APPROVAL", permissions: ["APPROVE_RESCHEDULELOAN"], auditRefused: true });

        expect(opened.scope.canViewAudit).toBe(false);
        expect(opened.scope.errorStatus).toEqual("");
    });

    it("does not ask for approvers when a viewer who cannot submit opens someone else's preview", function () {
        var opened = openRequestAs({ status: "PREVIEW", permissions: ["ALL_FUNCTIONS_READ", "APPROVE_RESCHEDULELOAN"] });

        expect(opened.executionResource.approvers).not.toHaveBeenCalled();
    });

    it("asks for approvers when the requester opens their own preview", function () {
        var opened = openRequestAs({ status: "PREVIEW", userId: REQUESTER_ID });

        expect(opened.executionResource.approvers).toHaveBeenCalled();
    });

    it("asks for approvers when a user who can create reschedules opens a preview", function () {
        var opened = openRequestAs({ status: "PREVIEW", permissions: ["CREATE_RESCHEDULELOAN"] });

        expect(opened.executionResource.approvers).toHaveBeenCalled();
    });
});

describe("Bulk reschedule history resource", function () {
    it("never raises the global error banner for the optional history lookup", function () {
        var ngResource = jasmine.createSpy("$resource").andReturn({});
        new mifosX.services.ResourceFactoryProvider().$get[2](ngResource, {});
        var call = _.find(ngResource.calls, function (c) {
            return /\/bulk-reschedule\/:executionId$/.test(c.args[0]);
        });

        expect(call.args[2].audit.ignoreErrorBanner).toBe(true);
    });
});
