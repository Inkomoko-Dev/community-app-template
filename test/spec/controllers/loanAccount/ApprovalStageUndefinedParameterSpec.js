describe("Approval stage date field before the templates load", function () {
    var scope, resourceFactory, pending;

    var createController = function (action) {
        pending = {};
        scope = {
            $watch: jasmine.createSpy('$watch'),
            $watchGroup: jasmine.createSpy('$watchGroup'),
            optlang: {code: 'en'},
            df: 'dd MMMM yyyy'
        };
        var capture = function (name) {
            return jasmine.createSpy(name).andCallFake(function (params, success, failure) {
                pending[name] = {params: params, success: success, failure: failure};
            });
        };
        var posted = function (name) {
            return jasmine.createSpy(name).andCallFake(function (params, body, success) {
                pending[name] = {params: params, body: body, success: success};
            });
        };
        resourceFactory = {
            LoanAccountResource: {
                getLoanAccountDetails: capture('loanDetails'),
                save: posted('loanSave')
            },
            loanTemplateResource: {
                get: jasmine.createSpy('loanTemplate').andCallFake(function (params, success, failure) {
                    pending['template:' + params.templateType] = {params: params, success: success, failure: failure};
                })
            },
            loanTrxnsResource: {
                get: capture('transaction'),
                save: posted('transactionSave')
            },
            entityDatatableChecksResource: {
                getAll: jasmine.createSpy('entityDatatableChecks')
            },
            clientOtherInfoResource: {
                getAll: jasmine.createSpy('clientOtherInfo')
            },
            loanDecisionEngineResource: {
                reviewApplication: posted('reviewApplication')
            },
            icReviewLevelTwoLoanDecisionEngineResource: {
                acceptIcReviewLevelTwo: posted('icReviewLevelTwo')
            }
        };
        new mifosX.controllers.LoanAccountActionsController(
            scope,
            {},
            resourceFactory,
            jasmine.createSpyObj('$location', ['path']),
            {action: action, id: 42, transactionId: 9},
            function (date, format) {
                return date ? [format, date.getFullYear(), date.getMonth() + 1, date.getDate()].join('|') : undefined;
            }
        );
    };

    var loadApprovalTemplates = function () {
        pending.loanDetails.success({
            currency: {code: 'RWF'},
            timeline: {expectedDisbursementDate: [2026, 10, 10]},
            disbursementDetails: [],
            loanProductId: 3
        });
        pending['template:disbursal'].success({});
        pending['template:approval'].success({
            approvalAmount: 500000,
            netDisbursalAmount: 500000,
            paymentTypeOptions: [{id: 1, name: 'Cash', isCashPayment: true}]
        });
    };

    var userPicksDate = function (date) {
        scope.formData[scope.modelName] = date;
    };

    it("names the approval date field before the loan templates have loaded", function () {
        createController('approve');

        expect(scope.modelName).toEqual('approvedOnDate');
        expect(scope.formData.approvedOnDate instanceof Date).toBe(true);
    });

    it("keeps a date picked while loading and never posts a parameter named undefined", function () {
        createController('approve');
        userPicksDate(new Date(2026, 9, 5));
        loadApprovalTemplates();
        scope.formData.note = 'Approved';

        scope.submit();

        var payload = resourceFactory.LoanAccountResource.save.mostRecentCall.args[1];
        expect(payload.hasOwnProperty('undefined')).toBe(false);
        expect(payload.approvedOnDate).toEqual('dd MMMM yyyy|2026|10|5');
    });

    it("drops a stray undefined key from the approval request", function () {
        createController('approve');
        loadApprovalTemplates();
        scope.formData.note = 'Approved';
        scope.formData['undefined'] = new Date(2026, 9, 5);

        scope.submit();

        var payload = resourceFactory.LoanAccountResource.save.mostRecentCall.args[1];
        expect(payload.hasOwnProperty('undefined')).toBe(false);
    });

    it("does not send the approval while the screen is still loading", function () {
        createController('approve');
        scope.formData.note = 'Approved';

        expect(scope.isFormLoading()).toBe(true);
        scope.submit();

        expect(resourceFactory.LoanAccountResource.save).not.toHaveBeenCalled();
        expect(scope.error).toEqual('The form is still loading. Please wait a moment and try again.');
    });

    it("allows the approval once every template has loaded", function () {
        createController('approve');
        loadApprovalTemplates();
        scope.formData.note = 'Approved';

        expect(scope.isFormLoading()).toBe(false);
        scope.submit();

        expect(resourceFactory.LoanAccountResource.save).toHaveBeenCalled();
        var call = resourceFactory.LoanAccountResource.save.mostRecentCall.args;
        expect(call[0].command).toEqual('approve');
        expect(call[1].approvedLoanAmount).toEqual(500000);
        expect(call[1].approvedOnDate).toEqual(jasmine.any(String));
    });

    it("stops showing the screen as loading when a template request fails", function () {
        createController('approve');
        pending.loanDetails.failure({status: 500});

        expect(scope.isFormLoading()).toBe(false);
    });

    it("names the missing approval date instead of sending the request", function () {
        createController('approve');
        loadApprovalTemplates();
        scope.formData.note = 'Approved';
        scope.formData.approvedOnDate = null;

        scope.submit();

        expect(resourceFactory.LoanAccountResource.save).not.toHaveBeenCalled();
        expect(scope.error).toEqual('Approved on date is required.');
    });

    it("names the date field of every approval stage before its template loads", function () {
        var expected = {
            reviewapplication: 'loanReviewOnDate',
            collateralreview: 'collateralReviewOn',
            icreviewlevelone: 'icReviewOn',
            icreviewleveltwo: 'icReviewOn',
            icreviewlevelthree: 'icReviewOn',
            icreviewlevelfour: 'icReviewOn',
            icreviewlevelfive: 'icReviewOn',
            icreviewlevelsix: 'icReviewOn',
            icreviewleveltwenty: 'icReviewOn',
            prepareandsigncontract: 'icReviewOn',
            modifytransaction: 'transactionDate'
        };
        Object.keys(expected).forEach(function (action) {
            createController(action);
            expect(scope.modelName).toEqual(expected[action]);
            expect(scope.isFormLoading()).toBe(true);
        });
    });

    it("sends the IC review date once the level template has loaded", function () {
        createController('icreviewleveltwo');
        userPicksDate(new Date(2026, 9, 4));
        pending['template:icreview'].success({loanDecisionData: {}});
        scope.formData.note = 'Recommended';

        scope.submit();

        var payload = resourceFactory.icReviewLevelTwoLoanDecisionEngineResource.acceptIcReviewLevelTwo.mostRecentCall.args[1];
        expect(payload.hasOwnProperty('undefined')).toBe(false);
        expect(payload.icReviewOn).toEqual('dd MMMM yyyy|2026|10|4');
    });

    it("does not send the review application while its template is loading", function () {
        createController('reviewapplication');
        scope.formData.note = 'Reviewed';

        scope.submit();

        expect(resourceFactory.loanDecisionEngineResource.reviewApplication).not.toHaveBeenCalled();
        expect(scope.error).toEqual('The form is still loading. Please wait a moment and try again.');
    });
});
