describe("NewLoanAccAppController", function () {
    var scope, requestedParams;

    beforeEach(function () {
        scope = {$watch: jasmine.createSpy("$watch"), $on: jasmine.createSpy("$on"), $broadcast: jasmine.createSpy("$broadcast")};
        requestedParams = null;
        var resourceFactory = {
            loanResource: {
                get: jasmine.createSpy("loanResource.get").andCallFake(function (params) {
                    requestedParams = params;
                })
            }
        };
        var uiConfigService = {appendConfigToScope: jasmine.createSpy("appendConfigToScope")};
        new mifosX.controllers.NewLoanAccAppController(scope, {clientId: "873501"}, resourceFactory, {}, function () {},
            uiConfigService, {}, function () {});
    });

    it("asks for the loan officers who serve the client's office", function () {
        expect(requestedParams.resourceType).toEqual("template");
        expect(requestedParams.templateType).toEqual("individual");
        expect(requestedParams.clientId).toEqual("873501");
        expect(requestedParams.staffInSelectedOfficeOnly).toBe(true);
    });
});
