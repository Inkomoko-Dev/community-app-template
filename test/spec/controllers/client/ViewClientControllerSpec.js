describe("ViewClientController", function () {
    var clientResourceCallback, clientAccountResourceCallback, clientNotesResourceCallback, dataTablesResourceCallback,
        runReportsResourceCallback, clientChargesResourceCallback;
    var statusTypes = ["Active", "Pending", "Transfer in progress", "Transfer on hold"];

    beforeEach(inject(function ($q) {

        this.scope = {};

        this.resourceFactory = {
            familyMember:{
                get:jasmine.createSpy('familyMember.get()').andCallFake(function(query, callback){
                    familyMemberCallback=callback;
                })
            },
            familyMembers:{
                get:jasmine.createSpy('familyMembers.get()').andCallFake(function(query, callback){
                    familyMembersCallback=callback;
                })
            },
            familyMemberTemplate:{
                get:jasmine.createSpy('familyMemberTemplate.get()').andCallFake(function(query, callback){
                    familyMemberTemplateCallback=callback;
                })
            },
            addressFieldConfiguration:{
                get:jasmine.createSpy('addressFieldConfiguration.get()').andCallFake(function(query, callback){
                    addressFieldConfigurationCallback=callback;
                })
            },
            clientAddress:{
                get:jasmine.createSpy('clientAddress.get()').andCallFake(function(query,callback){
                    clientAddressCallback=callback;
                })
            },
            clientTemplateResource:{
                get:jasmine.createSpy('clientTemplateResource.get()').andCallFake(function(callback){
                    callback({
                        isAddressEnabled: false,
                        isBusinessOwnerEnabled: false,
                        isEmploymentInfoEnabled: false,
                        isClientBusinessDetailEnabled: false,
                        isClientOtherInfoEnabled: false,
                        isClientRecruitmentSurveyEnabled: false
                    });
                })
            },
            clientExpensesTemplateResource: {
                getOtherExpenses: jasmine.createSpy('clientExpensesTemplateResource.getOtherExpenses()').andCallFake(function(query, callback) {
                    callback({
                        otherExpenses: [],
                        otherExpensesData: []
                    });
                })
            },
            businessOwners: {
                get: jasmine.createSpy('businessOwners.get()').andCallFake(function(query, callback) {
                    callback([]);
                })
            },
            employmentInformation: {
                get: jasmine.createSpy('employmentInformation.get()').andCallFake(function(query, callback) {
                    callback([]);
                })
            },
            configurationResource:{
                get:jasmine.createSpy('configurationResource.get()').andCallFake(function(query,callback){
                    configurationResourceCallback:callback;
                })
            },
            clientResource: {
                get: jasmine.createSpy('clientResource.get()').andCallFake(function (query, callback) {
                    clientResourceCallback = function(data) {
                        data.clientCollateralManagements = data.clientCollateralManagements || [];
                        data.clientBusinessDetailDataSet = data.clientBusinessDetailDataSet || [];
                        data.legalForm = data.legalForm || {value: 'Person'};
                        callback(data);
                    };
                })
            },
            clientAccountResource: {
                get: jasmine.createSpy('clientAccountResource.get()').andCallFake(function (query, callback) {
                    clientAccountResourceCallback = callback;
                })
            },
            clientNotesResource: {
                getAllNotes: jasmine.createSpy('clientNotesResource.getAllNotes()').andCallFake(function (query, callback) {
                    clientNotesResourceCallback = callback;
                })
            },
            DataTablesResource: {
                getAllDataTables: jasmine.createSpy('DataTablesResource.getAllDataTables()').andCallFake(function (query, callback) {
                    dataTablesResourceCallback = callback;
                })
            },
            runReportsResource: {
                get: jasmine.createSpy('runReportsResource.get()').andCallFake(function (query, callback) {
                    runReportsResourceCallback = callback;
                })
            },
            clientChargesResource: {
                getCharges: jasmine.createSpy('clientChargesResource.getCharges()').andCallFake(function (query, callback){
                    clientChargesResourceCallback = callback;
                })
            },
            creditBureauTemplate: {
                get: jasmine.createSpy('creditBureauTemplate.get()').andCallFake(function(callback) {
                    callback({});
                })
            }
        };

        this.routeParams = jasmine.createSpy();
        this.route = jasmine.createSpy();
        this.location = jasmine.createSpyObj("location", ["path"]);
        this.http = jasmine.createSpy().andCallFake(function(){
          return $q.defer().promise;
        });
        this.modal = jasmine.createSpy();
        this.API_VERSION = jasmine.createSpy();
        this.rootScope = {
            hostUrl: '',
            tenantIdentifier: 'default'
        };
        this.upload = jasmine.createSpy();

        this.controller = new mifosX.controllers.ViewClientController(this.scope,
            this.routeParams,
            this.route,
            this.location,
            this.resourceFactory,
            this.http,
            this.modal,
            this.API_VERSION,
            jasmine.createSpy('$timeout'),
            this.rootScope,
            this.upload);
    }));

    statusTypes.forEach(function (clientStatus) {

        it("should set the value of scope buttons based on the status of the client", function () {

            clientResourceCallback({status: {value: clientStatus} });
            var expectedPendingButtons = new mifosX.models.ClientStatus().getStatus(clientStatus);

            expect(this.scope.buttons[0]).toEqual(expectedPendingButtons[0]);
            expect(this.scope.buttons[1]).toEqual(expectedPendingButtons[1]);
        });
    });

    it("should add to the scope a button that assigns staff if the status of the client is active or pending", function () {
        clientResourceCallback({status: {value: "Transfer on hold"} });
        var expectedPendingButtons = new mifosX.models.ClientStatus().getStatus("Transfer on hold");

        expect(this.scope.buttons[0]).toEqual(expectedPendingButtons[0]);
        expect(this.scope.buttons[1]).toEqual(expectedPendingButtons[1]);
    });
});
