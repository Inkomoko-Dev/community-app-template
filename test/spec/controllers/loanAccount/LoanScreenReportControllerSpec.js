describe("LoanScreenReportController", function () {
    var postOutcome;

    beforeEach(function () {
        var self = this;
        this.scope = {};
        this.resourceFactory = {templateResource: {get: jasmine.createSpy('templateResource.get')}};
        this.http = jasmine.createSpy('$http').andCallFake(function () {
            return {
                then: function (onSuccess, onError) {
                    postOutcome = {onSuccess: onSuccess, onError: onError};
                }
            };
        });
        this.sce = {trustAsHtml: function (html) { return html; }};
        this.controller = new mifosX.controllers.LoanScreenReportController(this.scope, this.resourceFactory, {}, this.http,
            'v1', {loanId: '387186'}, {hostUrl: 'https://cbs'}, this.sce);
    });

    it("shows the rendered document", function () {
        this.scope.getLoanTemplate(23);
        postOutcome.onSuccess({data: 'TEST CONTRACT'});
        expect(this.scope.template).toEqual('TEST CONTRACT');
        expect(this.scope.templateError).toBeFalsy();
    });

    it("shows the server's message instead of the previous document when generation fails", function () {
        this.scope.getLoanTemplate(23);
        postOutcome.onSuccess({data: 'TEST CONTRACT'});

        this.scope.getLoanTemplate(25);
        expect(postOutcome.onError).toBeDefined();
        postOutcome.onError({status: 403, data: {errors: [{userMessageGlobalisationCode: 'error.msg.template.url.forbidden',
            defaultUserMessage: 'Template with url https://attacker.example/steal not allowed', args: []}]}});

        expect(this.scope.template).toBeFalsy();
        expect(this.scope.templateError.code).toEqual('error.msg.template.url.forbidden');
    });

    it("clears the previous document while the next one is loading", function () {
        this.scope.getLoanTemplate(23);
        postOutcome.onSuccess({data: 'TEST CONTRACT'});
        this.scope.getLoanTemplate(24);
        expect(this.scope.template).toBeFalsy();
    });

    it("falls back to a generic message when the server gives no details", function () {
        this.scope.getLoanTemplate(23);
        postOutcome.onError({status: 500, data: null});
        expect(this.scope.templateError.code).toEqual('error.msg.template.generation.failed');
    });
});
