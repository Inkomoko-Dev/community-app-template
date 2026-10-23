describe("Template editor loan keys", function () {
    var LOAN_API_FIELDS = [
        "accountNo",
        "allowPartialPeriodInterestCalcualtion",
        "allowableDscr",
        "amortizationType.code",
        "amortizationType.id",
        "amortizationType.value",
        "annualInterestRate",
        "approvedICReview",
        "approvedPrincipal",
        "canDefineInstallmentAmount",
        "canDisburse",
        "canUseForTopup",
        "clientAccountNo",
        "clientId",
        "clientLegalForm",
        "clientName",
        "clientOfficeId",
        "closureLoanId",
        "createStandingInstructionAtDisbursement",
        "currency.code",
        "currency.decimalPlaces",
        "currency.displayLabel",
        "currency.inMultiplesOf",
        "currency.name",
        "currency.nameCode",
        "daysInMonthType.code",
        "daysInMonthType.id",
        "daysInMonthType.value",
        "daysInYearType.code",
        "daysInYearType.id",
        "daysInYearType.value",
        "delinquent.availableDisbursementAmount",
        "delinquent.delinquentAmount",
        "delinquent.delinquentDays",
        "delinquent.lastPaymentAmount",
        "delinquent.pastDueDays",
        "department.active",
        "department.id",
        "department.mandatory",
        "department.name",
        "description",
        "enableThirdPartyDisbursement",
        "externalId",
        "feeChargesAtDisbursementCharged",
        "fundId",
        "fundName",
        "id",
        "inArrears",
        "interestCalculationPeriodType.code",
        "interestCalculationPeriodType.id",
        "interestCalculationPeriodType.value",
        "interestRateFrequencyType.code",
        "interestRateFrequencyType.id",
        "interestRateFrequencyType.value",
        "interestRatePerPeriod",
        "interestType.code",
        "interestType.id",
        "interestType.value",
        "isBnplLoan",
        "isEqualAmortization",
        "isExtendLoanLifeCycleConfig",
        "isFloatingInterestRate",
        "isInterestRecalculationEnabled",
        "isLoanProductLinkedToFloatingRate",
        "isNPA",
        "isRatesEnabled",
        "isTopup",
        "isVariableInstallmentsAllowed",
        "loanDecisionState.code",
        "loanDecisionState.id",
        "loanDecisionState.value",
        "loanOfficerId",
        "loanOfficerName",
        "loanProductCounter",
        "loanProductDescription",
        "loanProductId",
        "loanProductName",
        "loanPurposeId",
        "loanPurposeName",
        "loanType.code",
        "loanType.id",
        "loanType.value",
        "maximumGap",
        "migrated",
        "minimumGap",
        "multiDisburseLoan",
        "netDisbursalAmount",
        "nextLoanIcReviewDecisionState.code",
        "nextLoanIcReviewDecisionState.id",
        "nextLoanIcReviewDecisionState.value",
        "numberOfRepayments",
        "paidInAdvance.paidInAdvance",
        "principal",
        "proposedPrincipal",
        "repaymentEvery",
        "repaymentFrequencyType.code",
        "repaymentFrequencyType.id",
        "repaymentFrequencyType.value",
        "repaymentSchedule.loanTermInDays",
        "repaymentSchedule.totalFeeChargesCharged",
        "repaymentSchedule.totalInterestCharged",
        "repaymentSchedule.totalOutstanding",
        "repaymentSchedule.totalPaidInAdvance",
        "repaymentSchedule.totalPaidLate",
        "repaymentSchedule.totalPenaltyChargesCharged",
        "repaymentSchedule.totalPrincipalDisbursed",
        "repaymentSchedule.totalPrincipalExpected",
        "repaymentSchedule.totalPrincipalPaid",
        "repaymentSchedule.totalRepayment",
        "repaymentSchedule.totalRepaymentExpected",
        "repaymentSchedule.totalWaived",
        "repaymentSchedule.totalWrittenOff",
        "requiresEquityContribution",
        "status.active",
        "status.closed",
        "status.closedObligationsMet",
        "status.closedRescheduled",
        "status.closedWrittenOff",
        "status.code",
        "status.id",
        "status.overpaid",
        "status.pendingApproval",
        "status.value",
        "status.waitingForDisbursal",
        "summary.dailyLateFeeCapAmount",
        "summary.dailyLateFeeCapReached",
        "summary.dailyLateFeeChargedToDate",
        "summary.dailyLateFeeOutstanding",
        "summary.feeChargesCharged",
        "summary.feeChargesDueAtDisbursementCharged",
        "summary.feeChargesOutstanding",
        "summary.feeChargesOverdue",
        "summary.feeChargesPaid",
        "summary.feeChargesWaived",
        "summary.feeChargesWrittenOff",
        "summary.interestCancelled",
        "summary.interestCharged",
        "summary.interestOutstanding",
        "summary.interestOverdue",
        "summary.interestPaid",
        "summary.interestWaived",
        "summary.interestWrittenOff",
        "summary.penaltyChargesCharged",
        "summary.penaltyChargesOutstanding",
        "summary.penaltyChargesOverdue",
        "summary.penaltyChargesPaid",
        "summary.penaltyChargesWaived",
        "summary.penaltyChargesWrittenOff",
        "summary.principalDisbursed",
        "summary.principalOutstanding",
        "summary.principalOverdue",
        "summary.principalPaid",
        "summary.principalWrittenOff",
        "summary.totalCostOfLoan",
        "summary.totalExpectedCostOfLoan",
        "summary.totalExpectedRepayment",
        "summary.totalOutstanding",
        "summary.totalOverdue",
        "summary.totalRecovered",
        "summary.totalRepayment",
        "summary.totalWaived",
        "summary.totalWrittenOff",
        "syncDisbursementWithMeeting",
        "termFrequency",
        "termPeriodFrequencyType.code",
        "termPeriodFrequencyType.id",
        "termPeriodFrequencyType.value",
        "timeline.actualDisbursementDate",
        "timeline.applicationDate",
        "timeline.approvedByFirstname",
        "timeline.approvedByLastname",
        "timeline.approvedByUsername",
        "timeline.approvedOnDate",
        "timeline.closedOnDate",
        "timeline.disbursedByFirstname",
        "timeline.disbursedByLastname",
        "timeline.disbursedByUsername",
        "timeline.expectedDisbursementDate",
        "timeline.expectedMaturityDate",
        "timeline.submittedByFirstname",
        "timeline.submittedByLastname",
        "timeline.submittedByUsername",
        "timeline.submittedOnDate",
        "transactionProcessingStrategyId",
        "transactionProcessingStrategyName",
        "loanCounter",
        "disbursementDetails.actualDisbursementDate",
        "disbursementDetails.beneficiaryName",
        "disbursementDetails.clientAccountNumber",
        "disbursementDetails.clientBankName",
        "disbursementDetails.clientPhoneNumber",
        "disbursementDetails.expectedDisbursementDate",
        "disbursementDetails.paymentTypeName",
        "disbursementDetails.principal",
        "overdueCharges.amount",
        "overdueCharges.chargeCalculationType.value",
        "overdueCharges.name",
        "overdueCharges.penalty",
        "charges.amount",
        "charges.chargeCalculationType.value",
        "charges.name",
        "charges.penalty",
        "repaymentSchedule.periods.dueDate",
        "repaymentSchedule.periods.feeChargesDue",
        "repaymentSchedule.periods.interestDue",
        "repaymentSchedule.periods.period",
        "repaymentSchedule.periods.principalDue",
        "repaymentSchedule.periods.totalDueForPeriod"
    ];

    var CLIENT_API_FIELDS = [
        "accountNo",
        "activationDate",
        "active",
        "clientAdditionalInfoData.altMobileNo",
        "clientAdditionalInfoData.initials",
        "clientAdditionalInfoData.maritalStatus.active",
        "clientAdditionalInfoData.maritalStatus.id",
        "clientAdditionalInfoData.maritalStatus.mandatory",
        "clientAdditionalInfoData.maritalStatus.name",
        "clientAdditionalInfoData.mnemonics",
        "clientAdditionalInfoData.title",
        "clientAdditionalInfoData.title.active",
        "clientAdditionalInfoData.title.id",
        "clientAdditionalInfoData.title.mandatory",
        "clientAdditionalInfoData.title.name",
        "clientClassification.active",
        "clientClassification.id",
        "clientClassification.mandatory",
        "clientClassification.name",
        "clientLevel.active",
        "clientLevel.mandatory",
        "clientNonPersonDetails.constitution.active",
        "clientNonPersonDetails.constitution.mandatory",
        "clientNonPersonDetails.isRegistered",
        "clientNonPersonDetails.mainBusinessLine.active",
        "clientNonPersonDetails.mainBusinessLine.mandatory",
        "clientType.active",
        "clientType.id",
        "clientType.mandatory",
        "clientType.name",
        "createdDate",
        "dateOfBirth",
        "displayName",
        "emailAddress",
        "externalId",
        "firstname",
        "gender.active",
        "gender.id",
        "gender.mandatory",
        "gender.name",
        "id",
        "isStaff",
        "lastname",
        "legalForm.code",
        "legalForm.id",
        "legalForm.value",
        "middlename",
        "migrated",
        "mobileNo",
        "officeId",
        "officeName",
        "staffId",
        "staffName",
        "status.code",
        "status.id",
        "status.value",
        "subStatus.active",
        "subStatus.mandatory",
        "timeline.activatedByFirstname",
        "timeline.activatedByLastname",
        "timeline.activatedByUsername",
        "timeline.activatedOnDate",
        "timeline.submittedByFirstname",
        "timeline.submittedByLastname",
        "timeline.submittedByUsername",
        "timeline.submittedOnDate"
    ];

    function keyGroups(scope) {
        return {
            loan: scope.loanTemplateKeys,
            loanProduct: scope.loanProductTemplateKeys,
            repaymentSchedule: scope.repaymentTemplateKeys,
            loanSummary: scope.loanSummaryTemplateKeys,
            disbursement: scope.disbursementTemplateKeys,
            charges: scope.chargesTemplateKeys
        };
    }

    function entryText(entry) {
        return typeof entry === 'string' ? entry : (entry.value || entry.html);
    }

    function fieldPaths(text, prefix) {
        var paths = [];
        var sections = [];
        var tag = /\{\{([#\/]?)([^{}]+)\}\}/g;
        var match;
        while ((match = tag.exec(text)) !== null) {
            var name = match[2].trim();
            if (match[1] === '#') {
                sections.push(name.indexOf(prefix + '.') === 0 || !sections.length ? name : sections[sections.length - 1]);
                continue;
            }
            if (match[1] === '/') {
                sections.pop();
                continue;
            }
            var full = sections.length ? sections[sections.length - 1] + '.' + name : name;
            paths.push(full.indexOf(prefix + '.') === 0 ? full.substring(prefix.length + 1).replace(/#\d+/g, '') : full);
        }
        return paths;
    }

    function unresolvedIn(groups, fields, prefix) {
        var unresolved = [];
        _.each(groups, function (keys) {
            _.each(keys, function (entry) {
                _.each(fieldPaths(entryText(entry), prefix), function (path) {
                    if (!_.contains(fields, path)) {
                        unresolved.push(entryText(entry));
                    }
                });
            });
        });
        return unresolved;
    }

    function unresolvedKeys(scope) {
        return unresolvedIn(keyGroups(scope), LOAN_API_FIELDS, 'loan');
    }

    function entryByLabel(keys, label) {
        return _.find(keys, function (entry) { return entry.label === label; });
    }

    function createController(test) {
        new mifosX.controllers.CreateTemplateController(test.scope, test.resourceFactory, {}, test.rootScope, function () {});
    }

    beforeEach(function () {
        this.scope = {};
        this.resourceFactory = {templateResource: {getTemplateDetails: jasmine.createSpy('getTemplateDetails')}};
        this.rootScope = {tenantIdentifier: 'default'};
    });

    it("offers only loan keys that the loan API returns on the create screen", function () {
        createController(this);
        this.scope.loanKeys();
        expect(this.scope.loanTemplateKeys.length).toBeGreaterThan(0);
        expect(unresolvedKeys(this.scope)).toEqual([]);
    });

    it("offers only loan keys that the loan API returns on the edit screen", function () {
        new mifosX.controllers.EditTemplateController(this.scope, this.resourceFactory, {}, {id: 1}, this.rootScope, function () {});
        this.scope.loanKeys();
        expect(this.scope.loanTemplateKeys.length).toBeGreaterThan(0);
        expect(unresolvedKeys(this.scope)).toEqual([]);
    });

    it("offers the loan account number under the key the API uses", function () {
        createController(this);
        this.scope.loanKeys();
        expect(this.scope.loanTemplateKeys).toContain("{{loan.accountNo}}");
    });

    it("offers only client keys that the client API returns", function () {
        createController(this);
        this.scope.clientKeys();
        expect(unresolvedIn({client: this.scope.clientTemplateKeys}, CLIENT_API_FIELDS, 'client')).toEqual([]);
        new mifosX.controllers.EditTemplateController(this.scope, this.resourceFactory, {}, {id: 1}, this.rootScope, function () {});
        this.scope.clientKeys();
        expect(unresolvedIn({client: this.scope.clientTemplateKeys}, CLIENT_API_FIELDS, 'client')).toEqual([]);
    });

    it("labels the loan agreement fields under the names a template author looks for", function () {
        createController(this);
        this.scope.loanKeys();
        expect(entryByLabel(this.scope.loanTemplateKeys, "Loan cycle").value).toEqual("{{loan.loanCounter}}");
        expect(entryByLabel(this.scope.repaymentTemplateKeys, "First repayment date").value).toEqual("{{loan.repaymentSchedule.periods#1.dueDate}}");
        expect(entryByLabel(this.scope.disbursementTemplateKeys, "Disbursement method").value).toContain("{{paymentTypeName}}");
        expect(entryByLabel(this.scope.chargesTemplateKeys, "Penalty rate or amount").value).toContain("{{amount}}");
        expect(entryByLabel(this.scope.chargesTemplateKeys, "Penalty calculation method").value).toContain("{{chargeCalculationType.value}}");
        expect(_.pluck(this.scope.templateEntity, 'entityName')).toContain("Disbursement");
        expect(_.pluck(this.scope.templateEntity, 'entityName')).toContain("Penalties and Charges");
    });

    it("inserts the repayment schedule as a table row that repeats per instalment inside the cells", function () {
        createController(this);
        this.scope.loanKeys();
        var table = entryByLabel(this.scope.repaymentTemplateKeys, "Schedule table, one row per instalment").html;
        expect(table).toContain("<td>{{#loan.repaymentSchedule.periods}}{{#period}}{{period}}</td>");
        expect(table).toContain("<td>{{/period}}{{/loan.repaymentSchedule.periods}}Total</td>");
        expect(table).toContain("<td>{{loan.repaymentSchedule.totalRepaymentExpected}}</td></tr></tbody></table>");
        expect(table).not.toContain("<td>&nbsp;</td><td>&nbsp;</td>");
        expect(table.indexOf("{{#loan.repaymentSchedule.periods}}")).toBeGreaterThan(table.indexOf("<table"));
    });

    it("adds a client mapper fed from the loan when the entity is loan and drops it again otherwise", function () {
        createController(this);
        this.scope.entityChange(1);
        expect(_.pluck(this.scope.mappers, 'mapperskey')).toEqual(["loan", "client"]);
        expect(this.scope.mappers[1].mappersvalue).toEqual("clients/{{loan.clientId}}?tenantIdentifier=default");
        this.scope.entityChange(0);
        expect(_.pluck(this.scope.mappers, 'mapperskey')).toEqual(["client"]);
        expect(this.scope.mappers[0].mappersvalue).toEqual("clients/{{clientId}}?tenantIdentifier=default");
    });

    it("inserts labelled entries as text and table snippets as html", function () {
        var editor = {insertText: jasmine.createSpy('insertText'), insertHtml: jasmine.createSpy('insertHtml')};
        window.CKEDITOR = {instances: {templateeditor: editor}};
        try {
            createController(this);
            this.scope.templateKeySelected("{{loan.accountNo}}");
            this.scope.templateKeySelected({label: "Loan cycle", value: "{{loan.loanCounter}}"});
            this.scope.templateKeySelected({label: "Table", html: "<table></table>"});
        } finally {
            delete window.CKEDITOR;
        }
        expect(editor.insertText.argsForCall).toEqual([["{{loan.accountNo}}"], ["{{loan.loanCounter}}"]]);
        expect(editor.insertHtml).toHaveBeenCalledWith("<table></table>");
        expect(this.scope.templateKeyLabel({label: "Loan cycle", value: "x"})).toEqual("Loan cycle");
        expect(this.scope.templateKeyLabel("{{loan.accountNo}}")).toEqual("");
        expect(this.scope.templateKeyDisplay({label: "Loan cycle", value: "x"})).toEqual("x");
        expect(this.scope.templateKeyDisplay("{{loan.accountNo}}")).toEqual("{{loan.accountNo}}");
    });

    it("separates repeated disbursement and penalty values", function () {
        createController(this);
        this.scope.loanKeys();
        _.each(this.scope.disbursementTemplateKeys.concat(this.scope.chargesTemplateKeys), function (entry) {
            expect(entry.value).toMatch(/ \{\{\/loan\.(disbursementDetails|overdueCharges|charges)\}\}$/);
        });
    });

    function loadEditScreen(test, template) {
        new mifosX.controllers.EditTemplateController(test.scope, test.resourceFactory, {}, {id: template.id}, test.rootScope, function () {});
        var loaded = test.resourceFactory.templateResource.getTemplateDetails.mostRecentCall.args[1];
        loaded({entities: [{id: 0, name: 'client'}, {id: 1, name: 'loan'}], types: [{id: 0, name: 'Document'}], template: template});
    }

    var LOAN_MAPPER = {mapperorder: 0, mapperkey: 'loan', mappervalue: 'loans/{{loanId}}?associations=all&tenantIdentifier=default'};
    var CLIENT_FROM_LOAN_MAPPER = {mapperorder: 1, mapperkey: 'client', mappervalue: 'clients/{{loan.clientId}}?tenantIdentifier=default'};

    it("attaches the client mapper when an existing loan template is opened for editing", function () {
        loadEditScreen(this, {id: 5, entity: 'loan', type: 'Document', name: 'Agreement', text: '<p>x</p>', mappers: [LOAN_MAPPER]});
        expect(_.pluck(this.scope.mappers, 'mapperskey')).toEqual(["loan", "client"]);
        expect(_.pluck(this.scope.mappers, 'mappersorder')).toEqual([0, 1]);
        expect(this.scope.mappers[1].mappersvalue).toEqual("clients/{{loan.clientId}}?tenantIdentifier=default");
    });

    it("does not duplicate the client mapper on a loan template that already has one", function () {
        loadEditScreen(this, {id: 6, entity: 'loan', type: 'Document', name: 'Agreement', text: '<p>x</p>', mappers: [LOAN_MAPPER, CLIENT_FROM_LOAN_MAPPER]});
        expect(_.pluck(this.scope.mappers, 'mapperskey')).toEqual(["loan", "client"]);
    });

    it("leaves a client template's mappers alone on the edit screen and switches them with the entity", function () {
        var clientMapper = {mapperorder: 0, mapperkey: 'client', mappervalue: 'clients/{{clientId}}?tenantIdentifier=default'};
        loadEditScreen(this, {id: 7, entity: 'client', type: 'Document', name: 'Welcome', text: '<p>x</p>', mappers: [clientMapper]});
        expect(_.pluck(this.scope.mappers, 'mapperskey')).toEqual(["client"]);
        this.scope.entityChange(1);
        expect(_.pluck(this.scope.mappers, 'mapperskey')).toEqual(["loan", "client"]);
        expect(this.scope.mappers[1].mappersvalue).toEqual("clients/{{loan.clientId}}?tenantIdentifier=default");
        this.scope.entityChange(0);
        expect(_.pluck(this.scope.mappers, 'mapperskey')).toEqual(["client"]);
        expect(this.scope.mappers[0].mappersvalue).toEqual("clients/{{clientId}}?tenantIdentifier=default");
    });
});
