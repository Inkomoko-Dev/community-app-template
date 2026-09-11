/*global mifosX _  CKEDITOR */
(function (module) {
    mifosX.controllers = _.extend(module, {
        CreateTemplateController: function (scope, resourceFactory, location, $rootScope, $timeout) {
            scope.mappers = [];
            scope.formData = {};
            resourceFactory.templateResource.getTemplateDetails({resourceType: 'template'}, function (data) {
                scope.template = data;
                scope.advanceOption = 'false';
                scope.oneAtATime = 'true';
                scope.formData.entity = data.entities[0].id;
                scope.formData.type = data.types[0].id;
                scope.templateKeyEntity = "Client";
                scope.clientKeys();
                scope.loanKeys();
                scope.savingsAccountKeys();
                scope.groupKeys();
                scope.mappers.push({
                    mappersorder: 0,
                    mapperskey: "client",
                    mappersvalue: "clients/{{clientId}}?tenantIdentifier=" + $rootScope.tenantIdentifier,
                    defaultAddIcon: 'true'
                });
            });

            scope.editorInstance = function () {
                return (typeof CKEDITOR !== 'undefined' && CKEDITOR.instances) ? CKEDITOR.instances.templateeditor : null;
            };

            scope.editorText = function () {
                var editor = scope.editorInstance();
                return editor ? editor.getData() : (scope.formData.text || '');
            };

            scope.setEditorText = function (value) {
                var editor = scope.editorInstance();
                if (editor) {
                    editor.setData(value);
                } else {
                    scope.formData.text = value;
                }
            };

            scope.insertEditorText = function (value) {
                var editor = scope.editorInstance();
                if (editor) {
                    editor.insertText(value);
                } else {
                    scope.formData.text = (scope.formData.text || '') + value;
                }
            };

            scope.clientKeys = function () {
                scope.clientTemplateKeys = ["{{client.id}}",
                                        "{{client.accountNumber}}",
                                        "{{client.transferToOffice}}",
                                        "{{client.status}}",
                                        "{{client.subStatus}}",
                                        "{{client.activationDate}}",
                                        "{{client.officeJoiningDate}}",
                                        "{{client.firstname}}",
                                        "{{client.middlename}}",
                                        "{{client.lastname}}",
                                        "{{client.fullname}}",
                                        "{{client.displayName}}",
                                        "{{client.mobileNo}}",
                                        "{{client.emailAddress}}",
                                        "{{client.isStaff}}",
                                        "{{client.externalId}}",
                                        "{{client.dateOfBirth}}",
                                        "{{client.gender}}",
                                        "{{client.staff}}",
                                        "{{client.accountNumberRequiresAutoGeneration}}",
                                        "{{client.closureReason}}",
                                        "{{client.closureDate}}",
                                        "{{client.rejectionReason}}",
                                        "{{client.rejectionDate}}",
                                        "{{client.rejectedBy}}",
                                        "{{client.withdrawalReason}}",
                                        "{{client.withdrawalDate}}",
                                        "{{client.withdrawnBy}}",
                                        "{{client.reactivateDate}}",
                                        "{{client.reactivatedBy}}",
                                        "{{client.closedBy}}",
                                        "{{client.submittedOnDate}}",
                                        "{{client.activatedBy}}",
                                        "{{client.savingsProductId}}",
                                        "{{client.savingsAccountId}}",
                                        "{{client.clientType}}",
                                        "{{client.clientClassification}}",
                                        "{{client.legalForm}}",
                                        "{{client.reopenedDate}}",
                                        "{{client.reopenedBy}}",
                                        "{{client.proposedTransferDate}}",
                                        "{{client.clientCollateralManagements}}"];
                                        scope.additionalInfo = ["{{activity}}","{{time}}","{{clientId}}","{{loanId}}", "{{bvn}}","{{resourceId}}"];
                scope.templateEntity = [
                    {"entityName": "Client",
                        "templateKeys": scope.clientTemplateKeys
                    },                    {
                        "entityName": "SavingsAccount",
                        "templateKeys": scope.savingsAccountTemplateKeys
                    },
                    {
                        "entityName": "Loan",
                        "templateKeys": scope.loanTemplateKeys
                    },
                    {
                        "entityName": "Repayment Schedule",
                        "templateKeys": scope.repaymentTemplateKeys
                    },
                    {
                        "entityName": "Loan Product",
                        "templateKeys": scope.loanProductTemplateKeys
                    },
                    {
                        "entityName": "Loan Summary",
                        "templateKeys": scope.loanSummaryTemplateKeys
                    },
                    {
                        "entityName": "Group",
                        "templateKeys": scope.groupTemplateKeys
                    },
                    {"entityName": "Additional Info",
                        "templateKeys": scope.additionalInfo
                    }
                ];
                scope.setEditorText('');
            };

            scope.loanKeys = function () {
                //scope.setEditorText('');
                scope.loanProductTemplateKeys = ["{{loan.loanProduct.fund}}",
                                                "{{loan.loanProduct.transactionProcessingStrategy}}",
                                                "{{loan.loanProduct.productName}}",
                                                "{{loan.loanProduct.shortName}}",
                                                "{{loan.loanProduct.description}}",
                                                "{{loan.loanProduct.charges}}",
                                                "{{loan.loanProduct.rates}}",
                                                "{{loan.loanProduct.loanProductRelatedDetail}}",
                                                "{{loan.loanProduct.loanProductMinMaxConstraints}}",
                                                "{{loan.loanProduct.accountingRule}}",
                                                "{{loan.loanProduct.includeInBorrowerCycle}}",
                                                "{{loan.loanProduct.useBorrowerCycle}}",
                                                "{{loan.loanProduct.loanProducTrancheDetails}}",
                                                "{{loan.loanProduct.startDate}}",
                                                "{{loan.loanProduct.closeDate}}",
                                                "{{loan.loanProduct.externalId}}",
                                                "{{loan.loanProduct.borrowerCycleVariations}}",
                                                "{{loan.loanProduct.overdueDaysForNPA}}",
                                                "{{loan.loanProduct.minimumDaysBetweenDisbursalAndFirstRepayment}}",
                                                "{{loan.loanProduct.productInterestRecalculationDetails}}",
                                                "{{loan.loanProduct.holdGuaranteeFunds}}",
                                                "{{loan.loanProduct.loanProductGuaranteeDetails}}",
                                                "{{loan.loanProduct.loanConfigurableAttributes}}",
                                                "{{loan.loanProduct.principalThresholdForLastInstallment}}",
                                                "{{loan.loanProduct.accountMovesOutOfNPAOnlyOnArrearsCompletion}}",
                                                "{{loan.loanProduct.canDefineInstallmentAmount}}",
                                                "{{loan.loanProduct.installmentAmountInMultiplesOf}}",
                                                "{{loan.loanProduct.isLinkedToFloatingInterestRate}}",
                                                "{{loan.loanProduct.floatingRates}}",
                                                "{{loan.loanProduct.allowVariabeInstallments}}",
                                                "{{loan.loanProduct.variableInstallmentConfig}}",
                                                "{{loan.loanProduct.syncExpectedWithDisbursementDate}}",
                                                "{{loan.loanProduct.canUseForTopup}}",
                                                "{{loan.loanProduct.fixedPrincipalPercentagePerInstallment}}",
                                                "{{loan.loanProduct.disallowExpectedDisbursements}}",
                                                "{{loan.loanProduct.allowApprovedDisbursedAmountsOverApplied}}",
                                                "{{loan.loanProduct.overAppliedCalculationType}}",
                                                "{{loan.loanProduct.overAppliedNumber}}",
                                                "{{loan.loanProduct.loanTermIncludesToppedUpLoanTerm}}",
                                                "{{loan.loanProduct.maxNumberOfLoanExtensionsAllowed}}",
                                                "{{loan.loanProduct.isAccountLevelArrearsToleranceEnable}}",
                                                "{{loan.loanProduct.charts}}",
                                                "{{loan.loanProduct.isBnplLoanProduct}}",
                                                "{{loan.loanProduct.requiresEquityContribution}}",
                                                "{{loan.loanProduct.equityContributionLoanPercentage}}",
                                                "{{loan.loanProduct.productCategory}}",
                                                "{{loan.loanProduct.productType}}",
                                                "{{loan.loanProduct.maintainInterestRateOnLoanTermExtension}}"];
                scope.loanTemplateKeys = [
                                            "{{loan.accountNumber}}",
                                            "{{loan.externalId}}",
                                            "{{loan.client}}",
                                            "{{loan.group}}",
                                            "{{loan.glim}}",
                                            "{{loan.loanType}}",
                                            "{{loan.fund}}",
                                            "{{loan.loanOfficer}}",
                                            "{{loan.loanPurpose}}",
                                            "{{loan.transactionProcessingStrategy}}",
                                            "{{loan.loanRepaymentScheduleDetail}}",
                                            "{{loan.termFrequency}}",
                                            "{{loan.termPeriodFrequencyType}}",
                                            "{{loan.loanStatus}}",
                                            "{{loan.syncDisbursementWithMeeting}}",
                                            "{{loan.submittedOnDate}}",
                                            "{{loan.rejectedOnDate}}",
                                            "{{loan.rejectedBy}}",
                                            "{{loan.withdrawnOnDate}}",
                                            "{{loan.withdrawnBy}}",
                                            "{{loan.approvedOnDate}}",
                                            "{{loan.approvedBy}}",
                                            "{{loan.expectedDisbursementDate}}",
                                            "{{loan.actualDisbursementDate}}",
                                            "{{loan.disbursedBy}}",
                                            "{{loan.closedOnDate}}",
                                            "{{loan.closedBy}}",
                                            "{{loan.writtenOffOnDate}}",
                                            "{{loan.rescheduledOnDate}}",
                                            "{{loan.rescheduledByUser}}",
                                            "{{loan.expectedMaturityDate}}",
                                            "{{loan.actualMaturityDate}}",
                                            "{{loan.expectedFirstRepaymentOnDate}}",
                                            "{{loan.interestChargedFromDate}}",
                                            "{{loan.totalOverpaid}}",
                                            "{{loan.loanCounter}}",
                                            "{{loan.loanProductCounter}}",
                                            "{{loan.charges}}",
                                            "{{loan.trancheCharges}}",
                                            "{{loan.collateral}}",
                                            "{{loan.loanCollateralManagements}}",
                                            "{{loan.loanOfficerHistory}}",
                                            "{{loan.repaymentScheduleInstallments}}",
                                            "{{loan.loanTransactions}}",
                                            "{{loan.accountNumberRequiresAutoGeneration}}",
                                            "{{loan.transactionProcessorFactory}}",
                                            "{{loan.loanLifecycleStateMachine}}",
                                            "{{loan.loanSummaryWrapper}}",
                                            "{{loan.proposedPrincipal}}",
                                            "{{loan.approvedPrincipal}}",
                                            "{{loan.netDisbursalAmount}}",
                                            "{{loan.fixedEmiAmount}}",
                                            "{{loan.maxOutstandingLoanBalance}}",
                                            "{{loan.disbursementDetails}}",
                                            "{{loan.postDatedChecks}}",
                                            "{{loan.loanTermVariations}}",
                                            "{{loan.totalRecovered}}",
                                            "{{loan.loanInterestRecalculationDetails}}",
                                            "{{loan.isNpa}}",
                                            "{{loan.accruedTill}}",
                                            "{{loan.createStandingInstructionAtDisbursement}}",
                                            "{{loan.guaranteeAmountDerived}}",
                                            "{{loan.interestRecalculatedOn}}",
                                            "{{loan.isFloatingInterestRate}}",
                                            "{{loan.interestRateDifferential}}",
                                            "{{loan.writeOffReason}}",
                                            "{{loan.loanSubStatus}}",
                                            "{{loan.isTopup}}",
                                            "{{loan.loanTopupDetails}}",
                                            "{{loan.rates}}",
                                            "{{loan.fixedPrincipalPercentagePerInstallment}}",
                                            "{{loan.loanTermIncludesToppedUpLoanTerm}}",
                                            "{{loan.isDisburseToSavingsLoan}}",
                                            "{{loan.total_extensions}}",
                                            "{{loan.isBnplLoan}}",
                                            "{{loan.requiresEquityContribution}}",
                                            "{{loan.equityContributionLoanPercentage}}",
                                            "{{loan.department}}"];
                scope.repaymentTemplateKeys = ["{{loan.repaymentSchedule.loanTermInDays}}", "{{loan.repaymentSchedule.totalPrincipalDisbursed}}",
                    "{{loan.repaymentSchedule.totalPrincipalExpected}}", "{{loan.repaymentSchedule.totalPrincipalPaid}}",
                    "{{loan.repaymentSchedule.totalInterestCharged}}", "{{loan.repaymentSchedule.totalFeeChargesCharged}}",
                    "{{loan.repaymentSchedule.totalPenaltyChargesCharged}}", "{{loan.repaymentSchedule.totalWaived}}",
                    "{{loan.repaymentSchedule.totalWrittenOff}}", "{{loan.repaymentSchedule.totalRepaymentExpected}}",
                    "{{loan.repaymentSchedule.totalRepayment}}", "{{loan.repaymentSchedule.totalPaidInAdvance}}",
                    "{{loan.repaymentSchedule.totalPaidLate}}", "{{loan.repaymentSchedule.totalOutstanding}}"];
                scope.loanSummaryTemplateKeys = ["{{loan.summary.totalPrincipalDisbursed}}",
                                                    "{{loan.summary.totalPrincipalRepaid}}",
                                                    "{{loan.summary.totalPrincipalWrittenOff}}",
                                                    "{{loan.summary.totalPrincipalOutstanding}}",
                                                    "{{loan.summary.totalInterestCharged}}",
                                                    "{{loan.summary.totalInterestRepaid}}",
                                                    "{{loan.summary.totalInterestWaived}}",
                                                    "{{loan.summary.totalInterestWrittenOff}}",
                                                    "{{loan.summary.totalInterestOutstanding}}",
                                                    "{{loan.summary.totalFeeChargesCharged}}",
                                                    "{{loan.summary.totalFeeChargesDueAtDisbursement}}",
                                                    "{{loan.summary.totalFeeChargesRepaid}}",
                                                    "{{loan.summary.totalFeeChargesWaived}}",
                                                    "{{loan.summary.totalFeeChargesWrittenOff}}",
                                                    "{{loan.summary.totalFeeChargesOutstanding}}",
                                                    "{{loan.summary.totalPenaltyChargesCharged}}",
                                                    "{{loan.summary.totalPenaltyChargesRepaid}}",
                                                    "{{loan.summary.totalPenaltyChargesWaived}}",
                                                    "{{loan.summary.totalPenaltyChargesWrittenOff}}",
                                                    "{{loan.summary.totalPenaltyChargesOutstanding}}",
                                                    "{{loan.summary.totalExpectedRepayment}}",
                                                    "{{loan.summary.totalRepayment}}",
                                                    "{{loan.summary.totalExpectedCostOfLoan}}",
                                                    "{{loan.summary.totalCostOfLoan}}",
                                                    "{{loan.summary.totalWaived}}",
                                                    "{{loan.summary.totalWrittenOff}}",
                                                    "{{loan.summary.totalOutstanding}}"];
                scope.templateEntity = [
                    {"entityName": "Loan",
                        "templateKeys": scope.loanTemplateKeys
                    },
                    {"entityName": "Repayment Schedule",
                        "templateKeys": scope.repaymentTemplateKeys
                    },
                    {"entityName": "Loan Product",
                        "templateKeys": scope.loanProductTemplateKeys
                    },
                    {"entityName": "Loan Summary",
                        "templateKeys": scope.loanSummaryTemplateKeys
                    },
                    {
                        "entityName": "Savings Account",
                        "templateKeys": scope.savingsAccountTemplateKeys
                    },
                    {"entityName": "Client",
                    "templateKeys": scope.clientTemplateKeys
                    },
                    {
                        "entityName": "Group",
                        "templateKeys": scope.groupTemplateKeys
                    },
                    {"entityName": "Additional Info",
                        "templateKeys": scope.additionalInfo
                    }
                ];
                scope.setEditorText('');
            };

            scope.savingsAccountKeys = function () {
                scope.savingsAccountTemplateKeys = ["{{savingsAccount.id}}",
                "{{savingsAccount.client.id}}",
                "{{savingsAccount.accountNumber}}",
                "{{savingsAccount.externalId}}",
                "{{savingsAccount.product.name}}",
                "{{savingsAccount.product.id}}",
                "{{savingsAccount.savingsOfficer}}",
                "{{savingsAccount.status}}",
                "{{savingsAccount.sub_status}}",
                "{{savingsAccount.accountType}}",
                "{{savingsAccount.submittedOnDate}}",
                "{{savingsAccount.rejectedOnDate}}",
                "{{savingsAccount.withdrawnOnDate}}",
                "{{savingsAccount.withdrawnBy}}",
                "{{savingsAccount.approvedOnDate}}",
                "{{savingsAccount.activatedOnDate}}",
                "{{savingsAccount.activatedBy}}",
                "{{savingsAccount.closedOnDate}}",
                "{{savingsAccount.closedBy}}",
                "{{savingsAccount.reasonForBlock}}",
                "{{savingsAccount.currency}}",
                "{{savingsAccount.nominalAnnualInterestRate}}",
                "{{savingsAccount.interestCompoundingPeriodType}}",
                "{{savingsAccount.interestPostingPeriodType}}",
                "{{savingsAccount.interestCalculationType}}",
                "{{savingsAccount.interestCalculationDaysInYearType}}",
                "{{savingsAccount.minRequiredOpeningBalance}}",
                "{{savingsAccount.lockinPeriodFrequency}}",
                "{{savingsAccount.lockinPeriodFrequencyType}}",
                "{{savingsAccount.lockedInUntilDate}}",
                "{{savingsAccount.withdrawalFeeApplicableForTransfer}}",
                "{{savingsAccount.allowOverdraft}}",
                "{{savingsAccount.overdraftLimit}}",
                "{{savingsAccount.nominalAnnualInterestRateOverdraft}}",
                "{{savingsAccount.minOverdraftForInterestCalculation}}",
                "{{savingsAccount.postOverdraftInterestOnDeposit}}",
                "{{savingsAccount.enforceMinRequiredBalance}}",
                "{{savingsAccount.minRequiredBalance}}",
                "{{savingsAccount.lienAllowed}}",
                "{{savingsAccount.maxAllowedLienLimit}}",
                "{{savingsAccount.onHoldFunds}}",
                "{{savingsAccount.startInterestCalculationDate}}",
                "{{savingsAccount.summary}}"
                ];

                scope.templateEntity = [
                    {
                        "entityName": "Savings Account",
                        "templateKeys": scope.savingsAccountTemplateKeys},
                    {
                        "entityName": "Loan",
                        "templateKeys": scope.loanTemplateKeys
                    },
                    {
                        "entityName": "Repayment Schedule",
                        "templateKeys": scope.repaymentTemplateKeys
                    },
                    {
                        "entityName": "Loan Product",
                        "templateKeys": scope.loanProductTemplateKeys
                    },
                    {
                        "entityName": "Loan Summary",
                        "templateKeys": scope.loanSummaryTemplateKeys
                    },
                    {
                        "entityName": "Client",
                        "templateKeys": scope.clientTemplateKeys
                    },
                    {
                        "entityName": "Group",
                        "templateKeys": scope.groupTemplateKeys
                    },
                    {
                        "entityName": "Additional Info",
                        "templateKeys": scope.additionalInfo
                    }
                ];
                scope.setEditorText('');
            };

            scope.groupKeys = function () {
                scope.groupTemplateKeys = ["{{group.id}}",
                "{{group.name}}",
                "{{group.accountNumber}}",
                "{{group.externalId}}",
                "{{group.status}}",
                "{{group.activationDate}}",
                "{{group.office}}",
                "{{group.office.id}}",
                "{{group.staff}}",
                "{{group.staff.id}}",
                "{{group.parent}}",
                "{{group.parent.id}}",
                "{{group.groupLevel}}",
                "{{group.groupLevel.id}}",
                "{{group.hierarchy}}",
                "{{group.submittedOnDate}}"
                ];

                scope.templateEntity = [
                    {
                        "entityName": "Group",
                        "templateKeys": scope.groupTemplateKeys
                    },
                    {
                        "entityName": "SavingsAccount",
                        "templateKeys": scope.savingsAccountTemplateKeys
                    },
                    {
                        "entityName": "Loan",
                        "templateKeys": scope.loanTemplateKeys
                    },
                    {
                        "entityName": "Repayment Schedule",
                        "templateKeys": scope.repaymentTemplateKeys
                    },
                    {
                        "entityName": "Loan Product",
                        "templateKeys": scope.loanProductTemplateKeys
                    },
                    {
                        "entityName": "Loan Summary",
                        "templateKeys": scope.loanSummaryTemplateKeys
                    },
                    {
                        "entityName": "Client",
                        "templateKeys": scope.clientTemplateKeys
                    },
                    {
                        "entityName": "Additional Info",
                        "templateKeys": scope.additionalInfo
                    }
                ];
                scope.setEditorText('');
            };

            scope.entityChange = function (entityId) {
                if (entityId === 1) {
                    scope.mappers.splice(0, 1, {
                        mappersorder: 0,
                        mapperskey: "loan",
                        mappersvalue: "loans/{{loanId}}?associations=all&tenantIdentifier=" + $rootScope.tenantIdentifier,
                        defaultAddIcon: 'true'
                    });
                    scope.loanKeys();
                    scope.templateKeyEntity = "Loan";
                } else if (entityId === 0){
                    scope.templateKeyEntity = "Client";
                    scope.mappers.splice(0, 1, {
                        mappersorder: 0,
                        mapperskey: "client",
                        mappersvalue: "clients/{{clientId}}?tenantIdentifier=" + $rootScope.tenantIdentifier,
                        defaultAddIcon: 'true'
                    });
                    scope.clientKeys();
                    scope.loanKeys();
                    scope.savingsAccountKeys();
                    scope.groupKeys();
                } else if (entityId === 2){
                    scope.templateKeyEntity = "Savings Account";
                    scope.mappers.splice(0, 1, {
                        mappersorder: 0,
                        mapperskey: "savingsaccount",
                        mappersvalue: "savingsaccounts/{{savingsAccountId}}?tenantIdentifier=" + $rootScope.tenantIdentifier,
                        defaultAddIcon: 'true'
                    });
                    scope.savingsAccountKeys();
                }
                else if (entityId === 3){
                    scope.templateKeyEntity = "Group";
                    scope.mappers.splice(0, 1, {
                        mappersorder: 0,
                        mapperskey: "group",
                        mappersvalue: "group/{{groupId}}?tenantIdentifier=" + $rootScope.tenantIdentifier,
                        defaultAddIcon: 'true'
                    });
                    scope.groupKeys();
                }
            };

            scope.templateKeySelected = function (templateKey) {
                scope.insertEditorText(templateKey);
            };

            scope.addMapperKeyValue = function () {
                scope.mappers.push({
                    mappersorder: scope.mappers.length,
                    mapperskey: "",
                    mappersvalue: ""
                });
            };

            scope.deleteMapperKeyValue = function (index) {
                scope.mappers.splice(index, 1);
            };

            scope.advanceOptionClick = function () {
                if (scope.advanceOption == 'false') {
                    scope.advanceOption = 'true';
                } else {
                    scope.advanceOption = 'false';
                }
            };

            scope.extractError = function (response) {
                var data = response ? response.data : null;
                if (data) {
                    if (data.errors && data.errors.length > 0) {
                        return data.errors[0].defaultUserMessage || data.errors[0].developerMessage;
                    }
                    if (data.defaultUserMessage) {
                        return data.defaultUserMessage;
                    }
                    if (data.developerMessage) {
                        return data.developerMessage;
                    }
                }
                if (response && response.status) {
                    return 'Request failed with status ' + response.status + '.';
                }
                return 'The template could not be saved. Please try again.';
            };

            scope.serverError = null;
            scope.successMessage = null;
            scope.saving = false;
            scope.submitted = false;

            scope.bodyMissing = function () {
                var text = scope.formData.text;
                return !text || !String(text).replace(/<[^>]*>/g, '').trim();
            };

            scope.submit = function () {
                if (scope.saving) {
                    return;
                }
                scope.serverError = null;
                scope.successMessage = null;
                scope.submitted = true;
                scope.formData.text = scope.editorText();

                if ((scope.templateForm && scope.templateForm.$invalid) || scope.bodyMissing()) {
                    return;
                }

                for (var i in scope.mappers) {
                    delete scope.mappers[i].defaultAddIcon;
                }
                scope.formData.mappers = scope.mappers;
                scope.saving = true;

                resourceFactory.templateResource.save(scope.formData, function (data) {
                    scope.saving = false;
                    scope.successMessage = 'label.template.message.created';
                    $timeout(function () {
                        location.path('/viewtemplate/' + data.resourceId);
                    }, 2000);
                }, function (response) {
                    scope.saving = false;
                    scope.serverError = scope.extractError(response);
                });
            };


        }
    });
    mifosX.ng.application.controller('CreateTemplateController', ['$scope', 'ResourceFactory', '$location', '$rootScope', '$timeout', mifosX.controllers.CreateTemplateController]).run(function ($log) {
        $log.info("CreateTemplateController initialized");
    });
}(mifosX.controllers || {}));
