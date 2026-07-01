describe("LoanAccountActionsController", function () {
    var scope, resourceFactory, location, routeParams, savedParams, savedPayload;

    function dateFilter(value) {
        if (value instanceof Date) {
            return "14 January 2026";
        }
        return value;
    }

    function createController(chargeData) {
        scope = {
            $watch: jasmine.createSpy("$watch"),
            $watchGroup: jasmine.createSpy("$watchGroup"),
            optlang: {
                code: "en"
            },
            df: "dd MMMM yyyy",
            tf: "HH:mm"
        };
        routeParams = {
            id: 413468,
            action: "waivecharge",
            chargeId: 1
        };
        savedParams = null;
        savedPayload = null;
        resourceFactory = {
            LoanAccountResource: {
                getLoanAccountDetails: jasmine.createSpy("LoanAccountResource.getLoanAccountDetails").andCallFake(function (params, callback) {
                    callback({
                        currency: { code: "SSP" },
                        loanProductId: 20,
                        clientId: 10
                    });
                }),
                get: jasmine.createSpy("LoanAccountResource.get").andCallFake(function (params, callback) {
                    callback(chargeData || {
                        penalty: true,
                        paid: false,
                        waived: true,
                        amountOutstanding: 537400,
                        chargeTimeType: { value: "Specified due date" }
                    });
                }),
                save: jasmine.createSpy("LoanAccountResource.save").andCallFake(function (params, payload, callback) {
                    savedParams = params;
                    savedPayload = payload;
                    callback({ loanId: 413468 });
                })
            },
            loanTrxnsTemplateResource: {
                get: jasmine.createSpy("loanTrxnsTemplateResource.get")
            },
            entityDatatableChecksResource: {
                getAll: jasmine.createSpy("entityDatatableChecksResource.getAll")
            },
            DataTablesResource: {
                getTableDetails: jasmine.createSpy("DataTablesResource.getTableDetails")
            },
            loanTemplateResource: {
                get: jasmine.createSpy("loanTemplateResource.get")
            },
            clientOtherInfoResource: {
                getAll: jasmine.createSpy("clientOtherInfoResource.getAll")
            }
        };
        location = jasmine.createSpyObj("location", ["path"]);

        new mifosX.controllers.LoanAccountActionsController(scope, {}, resourceFactory, location, routeParams, dateFilter);
    }

    it("sets up residual penalty waiver with expected residual amount, mandatory reason and permission", function () {
        createController({
            penalty: true,
            paid: false,
            waived: true,
            amountOutstanding: 537400,
            chargeTimeType: { value: "Specified due date" }
        });

        expect(scope.title).toBe("label.heading.waiveloancharge");
        expect(scope.showExpectedResidualAmount).toBe(true);
        expect(scope.formData.expectedResidualAmount).toBe(537400);
        expect(scope.showNoteField).toBe(true);
        expect(scope.noteFieldMandatory).toBe(true);
        expect(scope.taskPermissionName).toBe("WAIVE_LOANCHARGE");
    });

    it("posts residual penalty waiver through the existing waive command with reason and expected residual amount", function () {
        createController({
            penalty: true,
            paid: false,
            waived: true,
            amountOutstanding: 537400,
            chargeTimeType: { value: "Specified due date" }
        });

        scope.formData.note = "Finance approved residual penalty correction";
        scope.submit();

        expect(savedParams).toEqual({
            loanId: 413468,
            resourceType: "charges",
            chargeId: 1,
            command: "waive"
        });
        expect(savedPayload.expectedResidualAmount).toBe(537400);
        expect(savedPayload.reason).toBe("Finance approved residual penalty correction");
        expect(savedPayload.note).toBe("Finance approved residual penalty correction");
        expect(savedPayload.locale).toBe("en");
        expect(savedPayload.dateFormat).toBe("dd MMMM yyyy");
    });
});
