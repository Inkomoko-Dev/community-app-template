describe("EditWhatsAppCampaignController", function () {
    var scope, reportCalls;

    beforeEach(function () {
        scope = {};
        reportCalls = [];

        var resourceFactory = {
            runReportsResource: {
                getReport: jasmine.createSpy("getReport").andCallFake(function (params, callback) {
                    reportCalls.push({ params: angular.copy(params), callback: callback });
                })
            },
            reportsResource: {
                get: jasmine.createSpy("reportsResource.get")
            },
            whatsAppCampaignResource: {
                get: jasmine.createSpy("whatsAppCampaignResource.get").andCallFake(function (params, callback) {
                    callback({
                        id: 42,
                        campaignName: "Test Felix",
                        messageType: "FREEFORM",
                        campaignType: { id: 3, value: "WhatsApp" },
                        triggerType: { id: 3, value: "Triggered" },
                        runReportId: 179,
                        reportName: "Loan Repayment",
                        paramValue: JSON.stringify({
                            officeId: 120,
                            loanOfficerId: -1,
                            loanType: 1,
                            reportName: "Loan Repayment"
                        })
                    });
                })
            },
            whatsAppCampaignTemplateResource: {
                get: jasmine.createSpy("whatsAppCampaignTemplateResource.get").andCallFake(function (callback) {
                    callback({});
                })
            }
        };

        new mifosX.controllers.EditWhatsAppCampaignController(scope, resourceFactory, {}, function (value) {
            return value;
        }, { campaignId: 42 });
    });

    it("does not send the saved report name as an R_ report parameter", function () {
        scope.getColumnHeaders();

        var request = reportCalls[reportCalls.length - 1].params;
        expect(request.reportSource).toBe("Loan Repayment");
        expect(request.R_officeId).toBe("120");
        expect(request.R_loanOfficerId).toBe("-1");
        expect(request.R_loanType).toBe("1");
        expect(request.R_reportName).toBeUndefined();
    });
});
