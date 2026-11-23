(function (module) {
    mifosX.filters = _.extend(module, {
        StatusLookup: function () {
            return function (input) {

                var cssClassNameLookup = {
                    "true": "statusactive",
                    "false": "statusdeleted",
                    "Active": "statusactive",
                    "loanStatusType.submitted.and.pending.approval": "statuspending",
                    "loanStatusType.approved": "statusApproved",
                    "loanStatusType.active": "statusactive",
                    "loanStatusType.overpaid": "statusoverpaid",
                    "loanDecisionStateType.submitted.and.review.Pending": "statusreviewapplication",
                    "loanDecisionStateType.submitted.and.due.diligence.Pending": "statusduediligence",
                    "loanDecisionStateType.submitted.and.collateral.review.Pending": "statuscollateralreview",
                    "loanDecisionStateType.submitted.and.ic.level.one.Pending": "statusiclevelone",
                    "loanDecisionStateType.submitted.and.ic.level.two.Pending": "statusicleveltwo",
                    "loanDecisionStateType.submitted.and.ic.level.three.Pending": "statusiclevelthree",
                    "loanDecisionStateType.submitted.and.ic.four.Pending": "statusiclevelfour",
                    "loanDecisionStateType.submitted.and.ic.five.Pending": "statusiclevelfive",
                    "loanDecisionStateType.submitted.and.prepare.sign.contract.Pending": "statusprepareandsign",
                    "savingsAccountStatusType.submitted.and.pending.approval": "statuspending",
                    "savingsAccountStatusType.approved": "statusApproved",
                    "savingsAccountStatusType.active": "statusactive",
                    "savingsAccountStatusType.activeInactive": "statusactiveoverdue",
                    "savingsAccountStatusType.activeDormant": "statusactiveoverdue",
                    "savingsAccountStatusType.matured": "statusmatured",
                    "loanProduct.active": "statusactive",
                    "clientStatusType.pending": "statuspending",
                    "clientStatusType.closed":"statusclosed",
                    "clientStatusType.rejected":"statusrejected",
                    "clientStatusType.withdraw":"statuswithdraw",
                    "clientStatusType.active": "statusactive",
                    "clientStatusType.submitted.and.pending.approval": "statuspending",
                    "clientStatusTYpe.approved": "statusApproved",
                    "clientStatusType.transfer.in.progress": "statustransferprogress",
                    "clientStatusType.transfer.on.hold": "statustransferonhold",
                    "groupingStatusType.active": "statusactive",
                    "groupingStatusType.pending": "statuspending",
                    "groupingStatusType.submitted.and.pending.approval": "statuspending",
                    "groupingStatusType.approved": "statusApproved",
                    "shareAccountStatusType.submitted.and.pending.approval": "statuspending",
                    "shareAccountStatusType.approved": "statusApproved",
                    "shareAccountStatusType.active": "statusactive",
                    "shareAccountStatusType.rejected": "statusrejected",
                    "purchasedSharesStatusType.applied": "statuspending",
                    "purchasedSharesStatusType.approved": "statusApproved",
                    "purchasedSharesStatusType.rejected": "statusrejected",
                    "charges.StatusType.active.true": "statusactive",
                    "employees.StatusType.active.true": "statusactive",
                    "loanSubStatus.loanSubStatusType.pending.disbursement": "statuspendingdisbursement",
                    "loanSubStatus.loanSubStatusType.repayment.not.met": "statusrepaymentnotmet",
                    "loanSubStatus.loanSubStatusType.repayment.met": "statusrepaymentmet",
                    "loanSubStatus.loanSubStatusType.awaiting.survey": "statusawaitingsurvey",
                    "loanSubStatus.loanSubStatusType.survey.successful": "statussurveysuccessful",
                    "loanSubStatus.loanSubStatusType.expired": "statustrancheexpired",
                    "loanSubStatus.loanSubStatusType.requires.review": "statusrequirereview"
                }

                return cssClassNameLookup[input];
            }
        }
    });
    mifosX.ng.application.filter('StatusLookup', [mifosX.filters.StatusLookup]).run(function ($log) {
        $log.info("StatusLookup filter initialized");
    });
}(mifosX.filters || {}));
