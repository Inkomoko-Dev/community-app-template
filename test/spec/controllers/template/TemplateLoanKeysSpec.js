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
        "transactionProcessingStrategyName"
    ];

    function keyGroups(scope) {
        return {
            loan: scope.loanTemplateKeys,
            loanProduct: scope.loanProductTemplateKeys,
            repaymentSchedule: scope.repaymentTemplateKeys,
            loanSummary: scope.loanSummaryTemplateKeys
        };
    }

    function unresolvedKeys(scope) {
        var unresolved = [];
        _.each(keyGroups(scope), function (keys) {
            _.each(keys, function (key) {
                var path = key.replace(/^\{\{loan\./, '').replace(/\}\}$/, '');
                if (!_.contains(LOAN_API_FIELDS, path)) {
                    unresolved.push(key);
                }
            });
        });
        return unresolved;
    }

    beforeEach(function () {
        this.scope = {};
        this.resourceFactory = {templateResource: {getTemplateDetails: jasmine.createSpy('getTemplateDetails')}};
        this.rootScope = {tenantIdentifier: 'default'};
    });

    it("offers only loan keys that the loan API returns on the create screen", function () {
        new mifosX.controllers.CreateTemplateController(this.scope, this.resourceFactory, {}, this.rootScope, function () {});
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
        new mifosX.controllers.CreateTemplateController(this.scope, this.resourceFactory, {}, this.rootScope, function () {});
        this.scope.loanKeys();
        expect(this.scope.loanTemplateKeys).toContain("{{loan.accountNo}}");
    });
});
