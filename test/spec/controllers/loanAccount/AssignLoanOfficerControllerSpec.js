describe("AssignLoanOfficerController", function () {
    var scope, requestedParams;

    beforeEach(function () {
        scope = {};
        requestedParams = null;
        var resourceFactory = {
            loanResource: {
                get: jasmine.createSpy("loanResource.get").andCallFake(function (params, callback) {
                    requestedParams = params;
                    callback({
                        loanOfficerId: 1698,
                        loanOfficerOptions: [
                            {id: 1698, displayName: "Alem, Fentanesh", officeName: "Inkomoko - Ethiopia"},
                            {id: 1594, displayName: "Hassen, Fatuma Mohammed", officeName: "Inkomoko - Ethiopia"}
                        ]
                    });
                })
            }
        };
        new mifosX.controllers.AssignLoanOfficerController(scope, resourceFactory, {id: "428160"}, jasmine.createSpyObj("location", ["path"]),
            function (value) { return value; });
    });

    it("offers loan officers from the loan's office and its parent offices", function () {
        expect(requestedParams.loanId).toEqual("428160");
        expect(requestedParams.template).toBe(true);
        expect(requestedParams.staffInSelectedOfficeOnly).not.toBe(true);
        expect(scope.loanOfficers.length).toEqual(2);
        expect(scope.formData.toLoanOfficerId).toEqual(1698);
    });
});
